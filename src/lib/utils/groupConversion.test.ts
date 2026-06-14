import { describe, it, expect, vi } from 'vitest';
import { expandSignalCodes } from '$lib/utils/validation';
import {
	buildUserScenarioGroups,
	codesToFlags,
	normalizeCodes,
	codesMatch
} from './groupConversion';

const mockedExpandSignalCodes = vi.mocked(expandSignalCodes);

vi.mock('$lib/utils/validation', () => ({
	expandSignalCodes: vi.fn((flags) => flags.map((sf: { flag: { code: string } }) => sf.flag.code))
}));

vi.mock('$lib/data/flags', () => ({
	getFlagByCode: vi.fn((code: string) => {
		const known: Record<string, { id: string; code: string; name: string; meaning: string }> = {
			A: { id: 'flag-a', code: 'A', name: 'Alpha', meaning: 'Diver down' },
			B: { id: 'flag-b', code: 'B', name: 'Bravo', meaning: 'Dangerous cargo' }
		};
		return known[code] ?? undefined;
	})
}));

function makeFlag(code: string) {
	return { id: `flag-${code.toLowerCase()}`, code, name: code, meaning: `Meaning ${code}`, colors: ['#FFFFFF'], pattern: 'solid' as const, phonetic: code };
}

function makeSignalFlag(code: string, duration = 3) {
	return { flag: makeFlag(code), duration };
}

function makeSignalGroup(overrides: Partial<{ id: string; flags: ReturnType<typeof makeSignalFlag>[]; order: number; meaning: string; duration: number }> = {}) {
	return {
		id: 'g1',
		flags: [makeSignalFlag('A')],
		order: 0,
		meaning: 'test group',
		duration: 3,
		...overrides
	};
}

describe('buildUserScenarioGroups', () => {
	it('returns empty array for empty input', () => {
		expect(buildUserScenarioGroups([])).toEqual([]);
	});

	it('maps a single group correctly', () => {
		const groups = [makeSignalGroup()];
		const result = buildUserScenarioGroups(groups);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			id: 'g1',
			order: 0,
			flags: groups[0].flags,
			codes: ['A'],
			duration: 3
		});
	});

	it('maps multiple groups with sequential order indices', () => {
		const groups = [
			makeSignalGroup({ id: 'g1', flags: [makeSignalFlag('A')] }),
			makeSignalGroup({ id: 'g2', flags: [makeSignalFlag('B'), makeSignalFlag('C')] })
		];
		const result = buildUserScenarioGroups(groups);
		expect(result).toHaveLength(2);
		expect(result[0].order).toBe(0);
		expect(result[1].order).toBe(1);
		expect(result[0].id).toBe('g1');
		expect(result[1].id).toBe('g2');
	});

	it('falls back to duration 3 when group duration is 0', () => {
		const groups = [makeSignalGroup({ duration: 0 })];
		const result = buildUserScenarioGroups(groups);
		expect(result[0].duration).toBe(3);
	});

	it('preserves explicit duration when provided', () => {
		const groups = [makeSignalGroup({ duration: 7 })];
		const result = buildUserScenarioGroups(groups);
		expect(result[0].duration).toBe(7);
	});

	it('uses expandSignalCodes to compute codes', () => {
		mockedExpandSignalCodes.mockReturnValueOnce(['X', 'Y']);
		const groups = [makeSignalGroup()];
		const result = buildUserScenarioGroups(groups);
		expect(result[0].codes).toEqual(['X', 'Y']);
	});
});

describe('codesToFlags', () => {
	it('returns empty array for empty input', () => {
		expect(codesToFlags([])).toEqual([]);
	});

	it('converts valid codes to SignalFlags', () => {
		const result = codesToFlags(['A', 'B']);
		expect(result).toEqual([
			{ flag: { id: 'flag-a', code: 'A', name: 'Alpha', meaning: 'Diver down' }, duration: 3 },
			{ flag: { id: 'flag-b', code: 'B', name: 'Bravo', meaning: 'Dangerous cargo' }, duration: 3 }
		]);
	});

	it('skips invalid codes', () => {
		const result = codesToFlags(['A', 'Z', 'B']);
		expect(result).toHaveLength(2);
		expect(result[0].flag.code).toBe('A');
		expect(result[1].flag.code).toBe('B');
	});

	it('returns empty when all codes are invalid', () => {
		expect(codesToFlags(['ZZZ', 'YYY'])).toEqual([]);
	});
});

describe('normalizeCodes', () => {
	it('returns empty array for empty input', () => {
		expect(normalizeCodes([])).toEqual([]);
	});

	it('uppercases codes', () => {
		expect(normalizeCodes(['a', 'bC'])).toEqual(['A', 'BC']);
	});

	it('trims whitespace', () => {
		expect(normalizeCodes(['  A  ', ' B '])).toEqual(['A', 'B']);
	});

	it('filters out empty strings after trim', () => {
		expect(normalizeCodes(['A', '  ', '', 'B'])).toEqual(['A', 'B']);
	});

	it('handles all-whitespace input', () => {
		expect(normalizeCodes(['   ', ' '])).toEqual([]);
	});
});

describe('codesMatch', () => {
	it('returns true for equal arrays', () => {
		expect(codesMatch(['A', 'B'], ['A', 'B'])).toBe(true);
	});

	it('returns false for different lengths', () => {
		expect(codesMatch(['A'], ['A', 'B'])).toBe(false);
	});

	it('returns false for same length but different elements', () => {
		expect(codesMatch(['A', 'B'], ['A', 'C'])).toBe(false);
	});

	it('returns true for two empty arrays', () => {
		expect(codesMatch([], [])).toBe(true);
	});

	it('returns false when one is empty and the other is not', () => {
		expect(codesMatch(['A'], [])).toBe(false);
	});
});
