import { describe, it, expect } from 'vitest';
import type { Flag, SignalFlag, SignalGroup } from '$lib/types';
import {
	validateDuration,
	validateFlagOrder,
	validateSignalGroup,
	validateSignalGroupDetailed,
	generateId,
	analyzeSubstituteUsage,
	getSignalMeaning,
	isValidSignalCode,
	analyzeSignalCode,
	expandSignalCodes
} from './validation';

const makeFlag = (code: string): Flag => ({
	id: `flag-${code}`,
	code,
	name: code,
	meaning: `Flag ${code}`,
	colors: ['#FFFFFF'],
	pattern: 'solid',
	phonetic: code
});

const makeSignalFlag = (code: string, duration = 3): SignalFlag => ({
	flag: makeFlag(code),
	duration
});

const makeGroup = (flags: SignalFlag[]): SignalGroup => ({
	id: 'test-group',
	flags,
	order: 0,
	meaning: '',
	duration: 3
});

describe('validateDuration', () => {
	it('accepts valid durations', () => {
		expect(validateDuration(1).valid).toBe(true);
		expect(validateDuration(3).valid).toBe(true);
		expect(validateDuration(0.5).valid).toBe(true);
		expect(validateDuration(30).valid).toBe(true);
	});

	it('rejects zero', () => {
		const result = validateDuration(0);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_ZERO');
	});

	it('rejects negative values', () => {
		const result = validateDuration(-1);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_ZERO');
	});

	it('rejects NaN', () => {
		const result = validateDuration(NaN);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_NAN');
	});

	it('rejects Infinity', () => {
		expect(validateDuration(Infinity).valid).toBe(false);
		expect(validateDuration(-Infinity).valid).toBe(false);
	});

	it('rejects values above 30', () => {
		const result = validateDuration(31);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_MAX');
	});

	it('rejects values below 0.5', () => {
		const result = validateDuration(0.4);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_MIN');
	});
});

describe('validateFlagOrder', () => {
	it('accepts empty array', () => {
		expect(validateFlagOrder([]).valid).toBe(true);
	});

	it('accepts single flag', () => {
		expect(validateFlagOrder([makeSignalFlag('A')]).valid).toBe(true);
	});

	it('accepts valid substitute references', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('S1')];
		expect(validateFlagOrder(flags).valid).toBe(true);
	});

	it('rejects substitute at first position', () => {
		const flags = [makeSignalFlag('S1'), makeSignalFlag('A')];
		const result = validateFlagOrder(flags);
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_POSITION');
		expect(result.violationCode).toBe('ERR_SUB_FIRST');
	});

	it('rejects substitute referencing non-existent position', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('S2')];
		const result = validateFlagOrder(flags);
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_REFERENCE');
	});

	it('accepts S2 when two unique flags precede it', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('S2')];
		expect(validateFlagOrder(flags).valid).toBe(true);
	});

	it('accepts multiple valid substitutes', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('S1'), makeSignalFlag('S2')];
		expect(validateFlagOrder(flags).valid).toBe(true);
	});
});

describe('validateSignalGroup', () => {
	it('rejects empty group', () => {
		const result = validateSignalGroup(makeGroup([]));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('GROUP_SIZE');
		expect(result.violationCode).toBe('ERR_EMPTY_GROUP');
	});

	it('rejects group with more than 5 flags', () => {
		const flags = [1, 2, 3, 4, 5, 6].map(i => makeSignalFlag(String(i)));
		const result = validateSignalGroup(makeGroup(flags));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('GROUP_SIZE');
		expect(result.violationCode).toBe('ERR_GROUP_TOO_LARGE');
	});

	it('accepts valid single-flag group', () => {
		expect(validateSignalGroup(makeGroup([makeSignalFlag('A')])).valid).toBe(true);
	});

	it('accepts valid multi-flag group', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('C')];
		expect(validateSignalGroup(makeGroup(flags)).valid).toBe(true);
	});

	it('rejects substitute at first position', () => {
		const flags = [makeSignalFlag('S1'), makeSignalFlag('A')];
		const result = validateSignalGroup(makeGroup(flags));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_POSITION');
	});

	it('rejects group with only substitutes', () => {
		const flags = [makeSignalFlag('S2'), makeSignalFlag('S1')];
		const result = validateSignalGroup(makeGroup(flags));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_POSITION');
	});

	it('rejects invalid duration in flags', () => {
		const flags = [makeSignalFlag('A', 0), makeSignalFlag('B')];
		const result = validateSignalGroup(makeGroup(flags));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('DURATION');
	});

	it('rejects consecutive substitutes', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('S1'), makeSignalFlag('S2')];
		const result = validateSignalGroup(makeGroup(flags));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_CONSECUTIVE');
	});

	it('rejects duplicate substitutes', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('S1'), makeSignalFlag('C'), makeSignalFlag('S1')];
		const result = validateSignalGroup(makeGroup(flags));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_DUPLICATE');
	});
});

describe('validateSignalGroupDetailed', () => {
	it('returns no rulesChecked on early empty group error', () => {
		const result = validateSignalGroupDetailed(makeGroup([]));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('GROUP_SIZE');
		expect(result.rulesChecked).toBeUndefined();
	});

	it('accumulates rulesChecked for valid group', () => {
		const result = validateSignalGroupDetailed(makeGroup([makeSignalFlag('A'), makeSignalFlag('B')]));
		expect(result.valid).toBe(true);
		expect(result.rulesChecked).toContain('GROUP_SIZE');
		expect(result.rulesChecked).toContain('DURATION');
		expect(result.rulesChecked).toContain('SUBSTITUTE_POSITION');
	});

	it('includes substituteAnalysis for valid group with substitutes', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('S1')];
		const result = validateSignalGroupDetailed(makeGroup(flags));
		expect(result.valid).toBe(true);
		expect(result.substituteAnalysis).toBeDefined();
		expect(result.substituteAnalysis!.totalSubstitutes).toBe(1);
	});

	it('includes substituteAnalysis on substitute reference error', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('S2')];
		const result = validateSignalGroupDetailed(makeGroup(flags));
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_REFERENCE');
		expect(result.substituteAnalysis).toBeDefined();
	});
});

describe('generateId', () => {
	it('returns a string', () => {
		expect(typeof generateId()).toBe('string');
	});

	it('returns non-empty string', () => {
		expect(generateId().length).toBeGreaterThan(0);
	});

	it('returns unique values', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()));
		expect(ids.size).toBe(100);
	});
});

describe('analyzeSubstituteUsage', () => {
	it('returns zero substitutes for flags without substitutes', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B')];
		const result = analyzeSubstituteUsage(flags);
		expect(result.totalSubstitutes).toBe(0);
		expect(result.validReferences).toBe(0);
		expect(result.invalidReferences).toHaveLength(0);
	});

	it('counts valid substitute references', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('S1')];
		const result = analyzeSubstituteUsage(flags);
		expect(result.totalSubstitutes).toBe(1);
		expect(result.validReferences).toBe(1);
	});

	it('detects invalid substitute references', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('S2')];
		const result = analyzeSubstituteUsage(flags);
		expect(result.invalidReferences).toHaveLength(1);
		expect(result.invalidReferences[0].code).toBe('S2');
	});

	it('expands substitute codes correctly', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('S1')];
		const result = analyzeSubstituteUsage(flags);
		expect(result.expandedCodes).toEqual(['A', 'B', 'A']);
	});
});

describe('getSignalMeaning', () => {
	it('returns meaning for known single-letter code', () => {
		const flags = [makeSignalFlag('A')];
		const meaning = getSignalMeaning(flags);
		expect(meaning).toContain('潜水员');
	});

	it('returns meaning for known multi-letter code', () => {
		const flags = [makeSignalFlag('N'), makeSignalFlag('C')];
		const meaning = getSignalMeaning(flags);
		expect(meaning).toContain('遇险');
	});

	it('returns generic meaning for unknown codes', () => {
		const flags = [makeSignalFlag('X'), makeSignalFlag('Y'), makeSignalFlag('Z')];
		const meaning = getSignalMeaning(flags);
		expect(typeof meaning).toBe('string');
		expect(meaning.length).toBeGreaterThan(0);
	});
});

describe('isValidSignalCode', () => {
	it('returns true for known standard codes', () => {
		expect(isValidSignalCode('A')).toBe(true);
		expect(isValidSignalCode('NC')).toBe(true);
		expect(isValidSignalCode('SOS')).toBe(true);
	});

	it('returns true for 3+ letter uppercase codes', () => {
		expect(isValidSignalCode('XYZ')).toBe(true);
		expect(isValidSignalCode('ABCD')).toBe(true);
	});

	it('returns false for non-standard short codes', () => {
		expect(isValidSignalCode('')).toBe(false);
	});
});

describe('analyzeSignalCode', () => {
	it('analyzes single letter code', () => {
		const info = analyzeSignalCode('A');
		expect(info.type).toBe('single');
		expect(info.isStandard).toBe(true);
		expect(info.meaning).toBeDefined();
	});

	it('analyzes two-letter code', () => {
		const info = analyzeSignalCode('NC');
		expect(info.isStandard).toBe(true);
	});

	it('analyzes numeric code', () => {
		const info = analyzeSignalCode('3');
		expect(info.isStandard).toBe(true);
	});

	it('analyzes bearing code', () => {
		const info = analyzeSignalCode('0A');
		expect(info.type).toBe('bearing');
		expect(info.category).toBeDefined();
	});

	it('returns non-standard for empty code', () => {
		const info = analyzeSignalCode('');
		expect(info.isStandard).toBe(false);
	});

	it('identifies distress signals', () => {
		const info = analyzeSignalCode('SOS');
		expect(info.category).toBe('遇险/紧急信号');
	});
});

describe('expandSignalCodes', () => {
	it('returns original codes when no substitutes', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B')];
		const result = expandSignalCodes(flags);
		expect(result).toEqual(['A', 'B']);
	});

	it('expands substitutes to their referenced flags', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('S1')];
		const result = expandSignalCodes(flags);
		expect(result).toEqual(['A', 'B', 'A']);
	});

	it('expands S2 to second unique non-substitute flag', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('S2')];
		const result = expandSignalCodes(flags);
		expect(result).toEqual(['A', 'B', 'B']);
	});

	it('handles multiple substitutes', () => {
		const flags = [makeSignalFlag('A'), makeSignalFlag('B'), makeSignalFlag('S1'), makeSignalFlag('C'), makeSignalFlag('S2')];
		const result = expandSignalCodes(flags);
		expect(result).toEqual(['A', 'B', 'A', 'C', 'B']);
	});
});
