import type {
	ScenarioInfo,
	UserScenarioGroup,
	ScenarioResult,
	ScenarioErrorDetail,
	ScenarioScoreBreakdown,
	SignalFlag,
	SignalGroup
} from '$lib/types';
import { validateSignalGroup, validateFlagOrder, generateId } from './validation';
import { buildUserScenarioGroups, codesToFlags, normalizeCodes, codesMatch } from './groupConversion';

export { buildUserScenarioGroups, codesToFlags } from './groupConversion';

export interface ScenarioEvaluationResult {
	totalScore: number;
	maxScore: number;
	scoreBreakdown: ScenarioScoreBreakdown;
	errors: ScenarioErrorDetail[];
	alternativeSuggestions: ScenarioInfo['alternativeGroups'];
}

const LEGALITY_WEIGHT = 25;
const TIMING_WEIGHT = 20;
const MATCHING_WEIGHT = 40;
const SPEED_WEIGHT = 15;

export function evaluateScenarioTask(
	scenario: ScenarioInfo,
	userGroups: UserScenarioGroup[],
	reactionTime: number,
	timeLimit: number
): ScenarioEvaluationResult {
	const errors: ScenarioErrorDetail[] = [];

	const { score: legalityScore, errors: legalityErrors } = evaluateLegality(userGroups);
	errors.push(...legalityErrors);

	const { score: timingScore, errors: timingErrors } = evaluateTiming(userGroups, scenario);
	errors.push(...timingErrors);

	const { score: matchingScore, errors: matchingErrors, alternativeSuggestions } = evaluateMatching(userGroups, scenario);
	errors.push(...matchingErrors);

	const speedScore = evaluateSpeed(reactionTime, timeLimit);

	const totalScore = legalityScore + timingScore + matchingScore + speedScore;
	const maxScore = LEGALITY_WEIGHT + TIMING_WEIGHT + MATCHING_WEIGHT + SPEED_WEIGHT;

	return {
		totalScore: Math.round(totalScore),
		maxScore,
		scoreBreakdown: {
			legality: Math.round(legalityScore),
			timing: Math.round(timingScore),
			matching: Math.round(matchingScore),
			speed: Math.round(speedScore)
		},
		errors,
		alternativeSuggestions
	};
}

function evaluateLegality(userGroups: UserScenarioGroup[]): { score: number; errors: ScenarioErrorDetail[] } {
	const errors: ScenarioErrorDetail[] = [];
	let validGroups = 0;
	const totalGroups = Math.max(userGroups.length, 1);

	userGroups.forEach((ug, idx) => {
		if (ug.flags.length === 0) {
			errors.push({
				groupOrder: idx + 1,
				groupCodes: ug.codes,
				errorType: 'invalid-group',
				errorMessage: `第 ${idx + 1} 个信号组为空`
			});
			return;
		}

		const signalGroup: SignalGroup = {
			id: ug.id,
			flags: ug.flags,
			order: ug.order,
			meaning: '',
			duration: ug.duration || 3
		};

		const orderValidation = validateFlagOrder(ug.flags);
		if (!orderValidation.valid) {
			errors.push({
				groupOrder: idx + 1,
				groupCodes: ug.codes,
				errorType: 'invalid-group',
				errorMessage: `第 ${idx + 1} 个信号组：${orderValidation.message}`
			});
			return;
		}

		const validation = validateSignalGroup(signalGroup);
		if (!validation.valid) {
			errors.push({
				groupOrder: idx + 1,
				groupCodes: ug.codes,
				errorType: 'invalid-group',
				errorMessage: `第 ${idx + 1} 个信号组：${validation.message}`
			});
			return;
		}

		validGroups++;
	});

	const score = (validGroups / totalGroups) * LEGALITY_WEIGHT;
	return { score, errors };
}

function evaluateTiming(userGroups: UserScenarioGroup[], scenario: ScenarioInfo): { score: number; errors: ScenarioErrorDetail[] } {
	const errors: ScenarioErrorDetail[] = [];

	if (userGroups.length <= 1) {
		return { score: TIMING_WEIGHT, errors };
	}

	const userCodesByOrder = userGroups.map(ug => normalizeCodes(ug.codes));
	const standardGroups = [...scenario.standardGroups].sort((a, b) => a.order - b.order);
	const standardCodesByOrder = standardGroups.map(sg => normalizeCodes(sg.codes));

	const ORDER_WEIGHT = 0.6;
	const DURATION_WEIGHT = 0.4;

	const userCriticalOrder: number[] = [];
	const standardCriticalOrder: number[] = [];

	userGroups.forEach((ug, uIdx) => {
		const userNorm = normalizeCodes(ug.codes);
		standardGroups.forEach((sg, sIdx) => {
			if (sg.critical && codesMatch(userNorm, normalizeCodes(sg.codes))) {
				userCriticalOrder.push(uIdx);
				standardCriticalOrder.push(sIdx);
			}
		});
	});

	let orderScore = TIMING_WEIGHT;

	if (userCriticalOrder.length >= 2) {
		let inversions = 0;
		for (let i = 0; i < userCriticalOrder.length; i++) {
			for (let j = i + 1; j < userCriticalOrder.length; j++) {
				if (userCriticalOrder[i] > userCriticalOrder[j]) {
					inversions++;
				}
			}
		}
		const maxInversions = (userCriticalOrder.length * (userCriticalOrder.length - 1)) / 2;
		const orderPreservation = maxInversions > 0 ? 1 - inversions / maxInversions : 1;

		if (inversions > 0) {
			errors.push({
				groupOrder: 0,
				groupCodes: [],
				errorType: 'wrong-order',
				errorMessage: `关键信号的发送顺序有 ${inversions} 处颠倒，正确顺序应为：${standardGroups.filter(g => g.critical).map(g => g.codes.join('')).join(' → ')}`
			});
		}

		orderScore = orderPreservation * TIMING_WEIGHT;
	} else {
		let orderMatches = 0;
		let totalComparisons = 0;

		for (let i = 0; i < standardCodesByOrder.length; i++) {
			for (let j = i + 1; j < standardCodesByOrder.length; j++) {
				const iUserIdx = userCodesByOrder.findIndex(uc => codesMatch(uc, standardCodesByOrder[i]));
				const jUserIdx = userCodesByOrder.findIndex(uc => codesMatch(uc, standardCodesByOrder[j]));
				if (iUserIdx >= 0 && jUserIdx >= 0) {
					totalComparisons++;
					if (iUserIdx < jUserIdx) {
						orderMatches++;
					}
				}
			}
		}

		orderScore = totalComparisons > 0 ? (orderMatches / totalComparisons) * TIMING_WEIGHT : TIMING_WEIGHT;
	}

	let durationScoreRatio = 1;
	const durationErrors: string[] = [];

	standardGroups.forEach((sg, sIdx) => {
		const sgNorm = normalizeCodes(sg.codes);
		const userMatchIdx = userCodesByOrder.findIndex(uc => codesMatch(uc, sgNorm));

		if (userMatchIdx >= 0 && userGroups[userMatchIdx]) {
			const userDuration = userGroups[userMatchIdx].duration || 3;
			const expectedDuration = sg.duration || 3;
			const diffRatio = Math.abs(userDuration - expectedDuration) / expectedDuration;

			if (diffRatio > 0.7) {
				durationErrors.push(
					`信号 ${sg.codes.join('')} 的停留时间（${userDuration}秒）与建议时间（${expectedDuration}秒）相差过大，${sg.critical ? '关键信号建议停留更久以确保对方看清' : '建议调整为更合理的时长'}`
				);
			}
		}
	});

	if (durationErrors.length > 0) {
		durationScoreRatio = Math.max(0, 1 - durationErrors.length / standardGroups.length * 0.5);
		errors.push({
			groupOrder: 0,
			groupCodes: [],
			errorType: 'wrong-order',
			errorMessage: `时长配置建议：\n${durationErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
		});
	}

	const finalScore = orderScore * ORDER_WEIGHT + TIMING_WEIGHT * DURATION_WEIGHT * durationScoreRatio;
	return { score: finalScore, errors };
}

function evaluateMatching(
	userGroups: UserScenarioGroup[],
	scenario: ScenarioInfo
): { score: number; errors: ScenarioErrorDetail[]; alternativeSuggestions: ScenarioInfo['alternativeGroups'] } {
	const errors: ScenarioErrorDetail[] = [];
	const alternativeSuggestions: ScenarioInfo['alternativeGroups'] = [];

	const standardGroups = [...scenario.standardGroups].sort((a, b) => a.order - b.order);
	const userNormCodes = userGroups.map(ug => normalizeCodes(ug.codes));

	let criticalMatched = 0;
	let nonCriticalMatched = 0;
	const totalCritical = standardGroups.filter(g => g.critical).length;
	const totalNonCritical = standardGroups.filter(g => !g.critical).length;

	standardGroups.forEach(sg => {
		const sgNorm = normalizeCodes(sg.codes);
		const matchIdx = userNormCodes.findIndex(uc => codesMatch(uc, sgNorm));

		if (matchIdx >= 0) {
			if (sg.critical) criticalMatched++;
			else nonCriticalMatched++;
		} else {
			let foundAlternative = false;
			const alternativesForOrder = scenario.alternativeGroups.filter(ag => ag.order === sg.order);
			for (const alt of alternativesForOrder) {
				for (const altCodes of alt.codes) {
					const altNorm = normalizeCodes(altCodes);
					const altMatchIdx = userNormCodes.findIndex(uc => codesMatch(uc, altNorm));
					if (altMatchIdx >= 0) {
						foundAlternative = true;
						let bonus = 0;
						switch (alt.equivalenceLevel) {
							case 'equivalent': bonus = 1.0; break;
							case 'acceptable': bonus = 0.8; break;
							case 'partial': bonus = 0.5; break;
						}
						if (sg.critical) criticalMatched += bonus;
						else nonCriticalMatched += bonus;
						break;
					}
				}
				if (foundAlternative) break;
			}

			if (!foundAlternative) {
				errors.push({
					groupOrder: sg.order,
					groupCodes: [],
					errorType: sg.critical ? 'missing-critical' : 'wrong-flags',
					errorMessage: sg.critical
						? `缺少关键信号：${sg.codes.join('')}（${sg.purpose}）`
						: `缺少建议信号：${sg.codes.join('')}（${sg.purpose}）`,
					correctCodes: sg.codes,
					correctMeaning: sg.meaning
				});
				if (alternativesForOrder.length > 0) {
					alternativeSuggestions.push(...alternativesForOrder);
				}
			}
		}
	});

	const userCodesSet = new Set(userNormCodes.map(c => c.join(',')));
	standardGroups.forEach(sg => {
		const sgNorm = normalizeCodes(sg.codes).join(',');
		userCodesSet.delete(sgNorm);
		scenario.alternativeGroups.forEach(ag => {
			if (ag.order === sg.order) {
				ag.codes.forEach(ac => {
					userCodesSet.delete(normalizeCodes(ac).join(','));
				});
			}
		});
	});

	if (userCodesSet.size > 0 && userGroups.length > standardGroups.length) {
		errors.push({
			groupOrder: 0,
			groupCodes: [],
			errorType: 'unnecessary-group',
			errorMessage: `存在 ${userCodesSet.size} 个与本场景无关的信号组，建议精简`
		});
	}

	const criticalRatio = totalCritical > 0 ? criticalMatched / totalCritical : 1;
	const nonCriticalRatio = totalNonCritical > 0 ? nonCriticalMatched / totalNonCritical : 1;

	const criticalWeight = 0.7;
	const nonCriticalWeight = 0.3;
	const matchingRatio = criticalRatio * criticalWeight + nonCriticalRatio * nonCriticalWeight;

	const score = matchingRatio * MATCHING_WEIGHT;

	return { score, errors, alternativeSuggestions };
}

function evaluateSpeed(reactionTime: number, timeLimit: number): number {
	if (reactionTime <= 0) return 0;
	if (reactionTime <= timeLimit * 0.25) return SPEED_WEIGHT;
	if (reactionTime <= timeLimit * 0.5) return SPEED_WEIGHT * 0.85;
	if (reactionTime <= timeLimit * 0.75) return SPEED_WEIGHT * 0.65;
	if (reactionTime <= timeLimit) return SPEED_WEIGHT * 0.4;
	return SPEED_WEIGHT * 0.1;
}



export function createScenarioResult(
	scenario: ScenarioInfo,
	userGroups: UserScenarioGroup[],
	evaluation: ScenarioEvaluationResult,
	reactionTime: number,
	isTimeout: boolean,
	sessionId?: string
): ScenarioResult {
	return {
		id: generateId(),
		timestamp: Date.now(),
		scenarioId: scenario.id,
		scenarioCategory: scenario.category,
		totalScore: evaluation.totalScore,
		maxScore: evaluation.maxScore,
		scoreBreakdown: evaluation.scoreBreakdown,
		userGroups,
		errors: evaluation.errors,
		reactionTime,
		timeLimit: scenario.timeLimit,
		isTimeout,
		alternativeSuggestions: evaluation.alternativeSuggestions,
		sessionId
	};
}
