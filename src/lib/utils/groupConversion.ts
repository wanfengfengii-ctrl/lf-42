import type { SignalFlag, SignalGroup, UserScenarioGroup } from '$lib/types';
import { expandSignalCodes } from '$lib/utils/validation';
import { getFlagByCode } from '$lib/data/flags';

export function buildUserScenarioGroups(groups: SignalGroup[]): UserScenarioGroup[] {
	return groups.map((g, idx) => ({
		id: g.id,
		order: idx,
		flags: g.flags,
		codes: expandSignalCodes(g.flags),
		duration: g.duration || 3
	}));
}

export function codesToFlags(codes: string[]): SignalFlag[] {
	const flags: SignalFlag[] = [];
	for (const code of codes) {
		const flag = getFlagByCode(code);
		if (flag) {
			flags.push({ flag, duration: 3 });
		}
	}
	return flags;
}

export function normalizeCodes(codes: string[]): string[] {
	return codes
		.map(c => c.toUpperCase().trim())
		.filter(c => c.length > 0);
}

export function codesMatch(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
