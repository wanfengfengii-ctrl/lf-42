import type { SignalFlag, Flag, ValidationResult } from '$lib/types';
import { validateDuration, validateFlagOrder, generateId } from '$lib/utils/validation';

export interface FlagGroupEditorOptions {
	maxFlagsPerGroup?: number;
	defaultFlagDuration?: number;
	defaultGroupDuration?: number;
	messageAutoDismissMs?: number;
	successAutoDismissMs?: number;
}

export interface FlagGroupEditorState {
	currentFlags: SignalFlag[];
	showLibrary: boolean;
	errorMessage: string | null;
	successMessage: string | null;
	currentGroupDuration: number;
	orderValidation: ValidationResult | null;
}

export function createFlagGroupEditor(options?: FlagGroupEditorOptions) {
	const maxFlagsPerGroup = options?.maxFlagsPerGroup ?? 5;
	const defaultFlagDuration = options?.defaultFlagDuration ?? 3;
	const defaultGroupDuration = options?.defaultGroupDuration ?? 3;
	const messageAutoDismissMs = options?.messageAutoDismissMs ?? 3000;
	const successAutoDismissMs = options?.successAutoDismissMs ?? 2000;

	let currentFlags = $state<SignalFlag[]>([]);
	let showLibrary = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let currentGroupDuration = $state<number>(defaultGroupDuration);

	let orderValidation = $derived<ValidationResult | null>(
		currentFlags.length > 0 ? validateFlagOrder(currentFlags) : null
	);

	function addFlag(flag: Flag) {
		if (currentFlags.length >= maxFlagsPerGroup) {
			showError(`信号组最多包含${maxFlagsPerGroup}面旗帜`);
			return;
		}
		currentFlags.push({ flag, duration: defaultFlagDuration });
		showLibrary = false;
	}

	function removeFlag(index: number) {
		currentFlags.splice(index, 1);
	}

	function moveFlag(fromIndex: number, toIndex: number) {
		if (toIndex < 0 || toIndex >= currentFlags.length) return;
		const [removed] = currentFlags.splice(fromIndex, 1);
		currentFlags.splice(toIndex, 0, removed);
	}

	function updateFlagDuration(index: number, duration: number) {
		const validation = validateDuration(duration);
		if (!validation.valid) {
			showError(validation.message || '无效的停留时间');
			return;
		}
		currentFlags[index] = { ...currentFlags[index], duration };
	}

	function updateFlagDurationClamped(index: number, duration: number) {
		currentFlags[index] = { ...currentFlags[index], duration: Math.max(1, duration) };
	}

	function clearCurrent() {
		currentFlags = [];
		currentGroupDuration = defaultGroupDuration;
	}

	function toggleLibrary() {
		showLibrary = !showLibrary;
	}

	function showError(msg: string) {
		errorMessage = msg;
		setTimeout(() => (errorMessage = null), messageAutoDismissMs);
	}

	function showSuccess(msg: string) {
		successMessage = msg;
		setTimeout(() => (successMessage = null), successAutoDismissMs);
	}

	function validateAndPrepare(): { flags: SignalFlag[]; groupDuration: number } | null {
		if (currentFlags.length === 0) {
			showError('请至少选择一面旗帜');
			return null;
		}

		const orderCheck = validateFlagOrder(currentFlags);
		if (!orderCheck.valid) {
			showError(orderCheck.message || '信号组不合法');
			return null;
		}

		return { flags: [...currentFlags], groupDuration: currentGroupDuration };
	}

	function buildSignalGroup(existingCount: number): import('$lib/types').SignalGroup | null {
		const prepared = validateAndPrepare();
		if (!prepared) return null;

		return {
			id: generateId(),
			flags: prepared.flags,
			order: existingCount,
			meaning: prepared.flags.map(f => f.flag.code).join(''),
			duration: prepared.groupDuration
		};
	}

	function resetAfterAdd() {
		currentFlags = [];
		currentGroupDuration = defaultGroupDuration;
	}

	return {
		get currentFlags() { return currentFlags; },
		set currentFlags(v: SignalFlag[]) { currentFlags = v; },
		get showLibrary() { return showLibrary; },
		set showLibrary(v: boolean) { showLibrary = v; },
		get errorMessage() { return errorMessage; },
		set errorMessage(v: string | null) { errorMessage = v; },
		get successMessage() { return successMessage; },
		set successMessage(v: string | null) { successMessage = v; },
		get currentGroupDuration() { return currentGroupDuration; },
		set currentGroupDuration(v: number) { currentGroupDuration = v; },
		get orderValidation() { return orderValidation; },

		addFlag,
		removeFlag,
		moveFlag,
		updateFlagDuration,
		updateFlagDurationClamped,
		clearCurrent,
		toggleLibrary,
		showError,
		showSuccess,
		validateAndPrepare,
		buildSignalGroup,
		resetAfterAdd
	};
}
