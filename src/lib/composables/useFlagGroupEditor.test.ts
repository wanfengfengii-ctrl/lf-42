import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	validateDuration,
	validateFlagOrder,
	generateId
} from '$lib/utils/validation';
import { createFlagGroupEditor } from '$lib/composables/useFlagGroupEditor.svelte';
import type { Flag, SignalFlag } from '$lib/types';

function makeFlag(overrides: Partial<Flag> = {}): Flag {
	return {
		id: 'flag-a',
		code: 'A',
		name: 'Alpha',
		meaning: '我船有潜水员，请远离，慢速航行',
		colors: ['white', 'blue'],
		pattern: 'solid',
		phonetic: 'Alfa',
		...overrides
	};
}

function makeSignalFlag(flagOverrides: Partial<Flag> = {}, duration = 3): SignalFlag {
	return { flag: makeFlag(flagOverrides), duration };
}

describe('validateDuration', () => {
	it('returns valid for a normal duration', () => {
		expect(validateDuration(3)).toEqual({ valid: true });
	});

	it('returns valid for the minimum boundary 0.5', () => {
		expect(validateDuration(0.5)).toEqual({ valid: true });
	});

	it('returns valid for the maximum boundary 30', () => {
		expect(validateDuration(30)).toEqual({ valid: true });
	});

	it('returns invalid for zero', () => {
		const result = validateDuration(0);
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('DURATION');
		expect(result.violationCode).toBe('ERR_DUR_ZERO');
	});

	it('returns invalid for negative values', () => {
		const result = validateDuration(-1);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_ZERO');
	});

	it('returns invalid for values above 30', () => {
		const result = validateDuration(31);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_MAX');
	});

	it('returns invalid for values below 0.5', () => {
		const result = validateDuration(0.4);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_MIN');
	});

	it('returns invalid for NaN', () => {
		const result = validateDuration(NaN);
		expect(result.valid).toBe(false);
		expect(result.violationCode).toBe('ERR_DUR_NAN');
	});

	it('returns invalid for Infinity', () => {
		const result = validateDuration(Infinity);
		expect(result.valid).toBe(false);
	});
});

describe('validateFlagOrder', () => {
	it('returns valid for a simple non-substitute sequence', () => {
		const flags = [makeSignalFlag({ code: 'A' }), makeSignalFlag({ code: 'B' })];
		expect(validateFlagOrder(flags)).toEqual({ valid: true });
	});

	it('returns invalid when substitute flag is first', () => {
		const flags = [makeSignalFlag({ code: 'S1' }), makeSignalFlag({ code: 'A' })];
		const result = validateFlagOrder(flags);
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_POSITION');
	});

	it('returns valid when S1 correctly references first flag', () => {
		const flags = [
			makeSignalFlag({ code: 'A' }),
			makeSignalFlag({ code: 'B' }),
			makeSignalFlag({ code: 'S1' })
		];
		expect(validateFlagOrder(flags).valid).toBe(true);
	});

	it('returns invalid when S2 references beyond available unique flags', () => {
		const flags = [makeSignalFlag({ code: 'A' }), makeSignalFlag({ code: 'S2' })];
		const result = validateFlagOrder(flags);
		expect(result.valid).toBe(false);
		expect(result.ruleViolation).toBe('SUBSTITUTE_REFERENCE');
	});

	it('returns valid for a single flag', () => {
		const flags = [makeSignalFlag({ code: 'K' })];
		expect(validateFlagOrder(flags)).toEqual({ valid: true });
	});

	it('returns valid for empty array', () => {
		expect(validateFlagOrder([])).toEqual({ valid: true });
	});
});

describe('generateId', () => {
	it('returns a string', () => {
		expect(typeof generateId()).toBe('string');
	});

	it('returns unique values on successive calls', () => {
		const ids = new Set(Array.from({ length: 50 }, () => generateId()));
		expect(ids.size).toBe(50);
	});

	it('returns a non-empty string', () => {
		expect(generateId().length).toBeGreaterThan(0);
	});
});

describe('createFlagGroupEditor', () => {
	describe('API shape', () => {
		it('returns an object with all expected getters', () => {
			const editor = createFlagGroupEditor();
			const expectedGetters = [
				'currentFlags',
				'showLibrary',
				'errorMessage',
				'successMessage',
				'currentGroupDuration',
				'orderValidation'
			];
			for (const key of expectedGetters) {
				expect(key in editor, `Missing getter: ${key}`).toBe(true);
			}
		});

		it('returns an object with all expected methods', () => {
			const editor = createFlagGroupEditor();
			const expectedMethods = [
				'addFlag',
				'removeFlag',
				'moveFlag',
				'updateFlagDuration',
				'updateFlagDurationClamped',
				'clearCurrent',
				'toggleLibrary',
				'showError',
				'showSuccess',
				'validateAndPrepare',
				'buildSignalGroup',
				'resetAfterAdd'
			];
			for (const key of expectedMethods) {
				expect(typeof (editor as Record<string, unknown>)[key], `Missing or non-function: ${key}`).toBe('function');
			}
		});

		it('has setters for mutable state properties', () => {
			const editor = createFlagGroupEditor();
			const desc = Object.getOwnPropertyDescriptors(editor);
			expect(desc.currentFlags.set).toBeDefined();
			expect(desc.showLibrary.set).toBeDefined();
			expect(desc.errorMessage.set).toBeDefined();
			expect(desc.successMessage.set).toBeDefined();
			expect(desc.currentGroupDuration.set).toBeDefined();
		});
	});

	describe('default state', () => {
		it('initializes currentFlags as empty array', () => {
			const editor = createFlagGroupEditor();
			expect(editor.currentFlags).toEqual([]);
		});

		it('initializes showLibrary as false', () => {
			const editor = createFlagGroupEditor();
			expect(editor.showLibrary).toBe(false);
		});

		it('initializes errorMessage as null', () => {
			const editor = createFlagGroupEditor();
			expect(editor.errorMessage).toBeNull();
		});

		it('initializes successMessage as null', () => {
			const editor = createFlagGroupEditor();
			expect(editor.successMessage).toBeNull();
		});

		it('initializes currentGroupDuration with default value 3', () => {
			const editor = createFlagGroupEditor();
			expect(editor.currentGroupDuration).toBe(3);
		});

		it('initializes orderValidation as null when no flags', () => {
			const editor = createFlagGroupEditor();
			expect(editor.orderValidation).toBeNull();
		});
	});

	describe('custom options', () => {
		it('uses custom defaultGroupDuration', () => {
			const editor = createFlagGroupEditor({ defaultGroupDuration: 10 });
			expect(editor.currentGroupDuration).toBe(10);
		});

		it('resets to custom defaultGroupDuration after clearCurrent', () => {
			const editor = createFlagGroupEditor({ defaultGroupDuration: 7 });
			editor.currentGroupDuration = 15;
			editor.clearCurrent();
			expect(editor.currentGroupDuration).toBe(7);
		});

		it('resets to custom defaultGroupDuration after resetAfterAdd', () => {
			const editor = createFlagGroupEditor({ defaultGroupDuration: 5 });
			editor.currentGroupDuration = 20;
			editor.resetAfterAdd();
			expect(editor.currentGroupDuration).toBe(5);
		});

		it('uses custom maxFlagsPerGroup when adding flags', () => {
			const editor = createFlagGroupEditor({ maxFlagsPerGroup: 2 });
			const flagA = makeFlag({ id: 'a', code: 'A' });
			const flagB = makeFlag({ id: 'b', code: 'B' });
			const flagC = makeFlag({ id: 'c', code: 'C' });
			editor.addFlag(flagA);
			editor.addFlag(flagB);
			editor.addFlag(flagC);
			expect(editor.currentFlags.length).toBe(2);
			expect(editor.errorMessage).toBeTruthy();
		});
	});

	describe('addFlag', () => {
		it('adds a flag to currentFlags', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			expect(editor.currentFlags.length).toBe(1);
			expect(editor.currentFlags[0].flag.code).toBe('A');
		});

		it('assigns the default flag duration', () => {
			const editor = createFlagGroupEditor({ defaultFlagDuration: 5 });
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			expect(editor.currentFlags[0].duration).toBe(5);
		});

		it('closes the library after adding', () => {
			const editor = createFlagGroupEditor();
			editor.showLibrary = true;
			editor.addFlag(makeFlag());
			expect(editor.showLibrary).toBe(false);
		});

		it('shows error when exceeding max flags', () => {
			const editor = createFlagGroupEditor({ maxFlagsPerGroup: 1 });
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.addFlag(makeFlag({ id: 'b', code: 'B' }));
			expect(editor.currentFlags.length).toBe(1);
			expect(editor.errorMessage).toContain('1');
		});
	});

	describe('removeFlag', () => {
		it('removes a flag at the given index', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.addFlag(makeFlag({ id: 'b', code: 'B' }));
			editor.removeFlag(0);
			expect(editor.currentFlags.length).toBe(1);
			expect(editor.currentFlags[0].flag.code).toBe('B');
		});

		it('handles removing from a single-element list', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.removeFlag(0);
			expect(editor.currentFlags).toEqual([]);
		});
	});

	describe('moveFlag', () => {
		it('moves a flag from one index to another', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.addFlag(makeFlag({ id: 'b', code: 'B' }));
			editor.addFlag(makeFlag({ id: 'c', code: 'C' }));
			editor.moveFlag(0, 2);
			const codes = editor.currentFlags.map(f => f.flag.code);
			expect(codes).toEqual(['B', 'C', 'A']);
		});

		it('does nothing when target index is out of bounds (negative)', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.moveFlag(0, -1);
			expect(editor.currentFlags[0].flag.code).toBe('A');
		});

		it('does nothing when target index equals length', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.moveFlag(0, 1);
			expect(editor.currentFlags[0].flag.code).toBe('A');
		});
	});

	describe('updateFlagDuration', () => {
		it('updates the duration of a flag at the given index', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.updateFlagDuration(0, 5);
			expect(editor.currentFlags[0].duration).toBe(5);
		});

		it('shows error for invalid duration', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.updateFlagDuration(0, 0);
			expect(editor.currentFlags[0].duration).toBe(3);
			expect(editor.errorMessage).toBeTruthy();
		});

		it('shows error for duration exceeding max', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.updateFlagDuration(0, 50);
			expect(editor.currentFlags[0].duration).toBe(3);
			expect(editor.errorMessage).toBeTruthy();
		});
	});

	describe('updateFlagDurationClamped', () => {
		it('updates duration with clamping to minimum of 1', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.updateFlagDurationClamped(0, 0);
			expect(editor.currentFlags[0].duration).toBe(1);
		});

		it('allows valid durations without clamping', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.updateFlagDurationClamped(0, 10);
			expect(editor.currentFlags[0].duration).toBe(10);
		});

		it('clamps negative values to 1', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.updateFlagDurationClamped(0, -5);
			expect(editor.currentFlags[0].duration).toBe(1);
		});
	});

	describe('clearCurrent', () => {
		it('clears all flags and resets group duration', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.currentGroupDuration = 10;
			editor.clearCurrent();
			expect(editor.currentFlags).toEqual([]);
			expect(editor.currentGroupDuration).toBe(3);
		});
	});

	describe('toggleLibrary', () => {
		it('toggles showLibrary from false to true', () => {
			const editor = createFlagGroupEditor();
			editor.toggleLibrary();
			expect(editor.showLibrary).toBe(true);
		});

		it('toggles showLibrary from true to false', () => {
			const editor = createFlagGroupEditor();
			editor.toggleLibrary();
			editor.toggleLibrary();
			expect(editor.showLibrary).toBe(false);
		});
	});

	describe('showError', () => {
		it('sets errorMessage', () => {
			const editor = createFlagGroupEditor();
			editor.showError('test error');
			expect(editor.errorMessage).toBe('test error');
		});

		it('auto-dismisses the error after the configured timeout', () => {
			vi.useFakeTimers();
			const editor = createFlagGroupEditor({ messageAutoDismissMs: 1000 });
			editor.showError('will disappear');
			expect(editor.errorMessage).toBe('will disappear');
			vi.advanceTimersByTime(1000);
			expect(editor.errorMessage).toBeNull();
			vi.useRealTimers();
		});
	});

	describe('showSuccess', () => {
		it('sets successMessage', () => {
			const editor = createFlagGroupEditor();
			editor.showSuccess('done');
			expect(editor.successMessage).toBe('done');
		});

		it('auto-dismisses the success after the configured timeout', () => {
			vi.useFakeTimers();
			const editor = createFlagGroupEditor({ successAutoDismissMs: 500 });
			editor.showSuccess('temporary');
			expect(editor.successMessage).toBe('temporary');
			vi.advanceTimersByTime(500);
			expect(editor.successMessage).toBeNull();
			vi.useRealTimers();
		});
	});

	describe('validateAndPrepare', () => {
		it('returns null when no flags are present', () => {
			const editor = createFlagGroupEditor();
			expect(editor.validateAndPrepare()).toBeNull();
			expect(editor.errorMessage).toBeTruthy();
		});

		it('returns null and shows error for invalid flag order', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 's1', code: 'S1' }));
			expect(editor.validateAndPrepare()).toBeNull();
			expect(editor.errorMessage).toBeTruthy();
		});

		it('returns flags and group duration for a valid group', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.addFlag(makeFlag({ id: 'b', code: 'B' }));
			editor.currentGroupDuration = 5;
			const result = editor.validateAndPrepare();
			expect(result).not.toBeNull();
			expect(result!.flags.length).toBe(2);
			expect(result!.groupDuration).toBe(5);
		});

		it('returns a copy of the flags array', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			const result = editor.validateAndPrepare();
			expect(result!.flags).not.toBe(editor.currentFlags);
		});
	});

	describe('buildSignalGroup', () => {
		it('returns null when flags are empty', () => {
			const editor = createFlagGroupEditor();
			expect(editor.buildSignalGroup(0)).toBeNull();
		});

		it('returns null when flag order is invalid', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 's1', code: 'S1' }));
			expect(editor.buildSignalGroup(0)).toBeNull();
		});

		it('builds a valid SignalGroup with correct shape', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.addFlag(makeFlag({ id: 'b', code: 'B' }));
			editor.currentGroupDuration = 8;
			const group = editor.buildSignalGroup(3);
			expect(group).not.toBeNull();
			expect(group!.id).toBeDefined();
			expect(typeof group!.id).toBe('string');
			expect(group!.flags.length).toBe(2);
			expect(group!.order).toBe(3);
			expect(group!.meaning).toBe('AB');
			expect(group!.duration).toBe(8);
		});
	});

	describe('resetAfterAdd', () => {
		it('clears flags and resets group duration', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			editor.currentGroupDuration = 15;
			editor.resetAfterAdd();
			expect(editor.currentFlags).toEqual([]);
			expect(editor.currentGroupDuration).toBe(3);
		});
	});

	describe('orderValidation derived state', () => {
		it('is null when no flags are present', () => {
			const editor = createFlagGroupEditor();
			expect(editor.orderValidation).toBeNull();
		});

		it('reflects valid result for a proper flag sequence', () => {
			const editor = createFlagGroupEditor();
			editor.addFlag(makeFlag({ id: 'a', code: 'A' }));
			expect(editor.orderValidation).toEqual({ valid: true });
		});

		it('reflects invalid result for substitute-first sequence', () => {
			const editor = createFlagGroupEditor();
			editor.currentFlags = [makeSignalFlag({ code: 'S1' })];
			const result = editor.orderValidation;
			expect(result?.valid).toBe(false);
			expect(result?.ruleViolation).toBe('SUBSTITUTE_POSITION');
		});
	});
});
