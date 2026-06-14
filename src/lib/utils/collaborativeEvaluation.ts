import type {
	CollaborativeScenarioInfo,
	UserScenarioGroup,
	CollaborativeResult,
	CollaborativeScoreBreakdown,
	RoleScore,
	RoleScoreBreakdown,
	TimelineEvent,
	ConflictDetail,
	BestCollaborationPlan,
	ScenarioErrorDetail,
	CollaborativeRoleType,
	RoleRequiredGroup,
	SignalGroup
} from '$lib/types';
import { generateId, validateSignalGroup, validateFlagOrder } from './validation';
import { buildUserScenarioGroups, codesToFlags, normalizeCodes, codesMatch } from './groupConversion';
import { collaborativeRoleLabels } from '$lib/data/collaborativeScenarios';

export { buildUserScenarioGroups, codesToFlags } from './groupConversion';

const CONSISTENCY_WEIGHT = 25;
const TIMING_WEIGHT = 25;
const COMPLETENESS_WEIGHT = 25;
const COLLABORATION_WEIGHT = 15;
const SPEED_WEIGHT = 10;

const ROLE_LEGALITY_WEIGHT = 20;
const ROLE_TIMING_WEIGHT = 20;
const ROLE_MATCHING_WEIGHT = 30;
const ROLE_SPEED_WEIGHT = 15;
const ROLE_COLLABORATION_WEIGHT = 15;

interface PlayerSubmission {
	playerId: string;
	playerName: string;
	roleType: CollaborativeRoleType;
	groups: UserScenarioGroup[];
	submittedAt: number;
}

export interface CollaborativeEvaluationResult {
	totalScore: number;
	maxScore: number;
	scoreBreakdown: CollaborativeScoreBreakdown;
	roleScores: RoleScore[];
	timeline: TimelineEvent[];
	conflicts: ConflictDetail[];
	bestPlan: BestCollaborationPlan;
}

export function evaluateCollaborativeTask(
	scenario: CollaborativeScenarioInfo,
	submissions: PlayerSubmission[],
	startTime: number,
	timeLimit: number
): CollaborativeEvaluationResult {
	const timeline: TimelineEvent[] = [];
	const conflicts: ConflictDetail[] = [];

	const roleScores = evaluateRoleScores(scenario, submissions, startTime, timeLimit, timeline);

	const consistencyScore = evaluateConsistency(scenario, submissions, timeline, conflicts);
	const timingScore = evaluateTimingCoordination(scenario, submissions, timeline, conflicts);
	const completenessScore = evaluateCompleteness(scenario, submissions);
	const collaborationScore = evaluateCollaboration(scenario, submissions, conflicts);
	const speedScore = evaluateSpeed(submissions, startTime, timeLimit);

	const totalScore =
		consistencyScore + timingScore + completenessScore + collaborationScore + speedScore;
	const maxScore = CONSISTENCY_WEIGHT + TIMING_WEIGHT + COMPLETENESS_WEIGHT + COLLABORATION_WEIGHT + SPEED_WEIGHT;

	const bestPlan = generateBestPlan(scenario);

	return {
		totalScore: Math.round(totalScore),
		maxScore,
		scoreBreakdown: {
			consistency: Math.round(consistencyScore),
			timing: Math.round(timingScore),
			completeness: Math.round(completenessScore),
			collaboration: Math.round(collaborationScore),
			speed: Math.round(speedScore)
		},
		roleScores,
		timeline: timeline.sort((a, b) => a.time - b.time),
		conflicts,
		bestPlan
	};
}

function evaluateRoleScores(
	scenario: CollaborativeScenarioInfo,
	submissions: PlayerSubmission[],
	startTime: number,
	timeLimit: number,
	_timeline: TimelineEvent[]
): RoleScore[] {
	return submissions.map(sub => {
		const roleTask = scenario.roleTasks[sub.roleType];
		if (!roleTask) {
			return {
				roleType: sub.roleType,
				playerName: sub.playerName,
				totalScore: 0,
				maxScore: 100,
				breakdown: { legality: 0, timing: 0, matching: 0, speed: 0, collaboration: 0 },
				errors: []
			};
		}

		const errors: ScenarioErrorDetail[] = [];

		const legalityScore = evaluateRoleLegality(sub.groups, errors);
		const matchingScore = evaluateRoleMatching(sub.groups, roleTask.requiredGroups, errors);
		const timingScore = evaluateRoleTiming(sub.groups, roleTask.requiredGroups, sub.submittedAt - startTime, errors);
		const speedScore = evaluateRoleSpeed(sub.submittedAt - startTime, timeLimit);
		const collaborationScore = evaluateRoleCollaboration(sub.groups, roleTask.requiredGroups, scenario, submissions, errors);

		const totalScore = legalityScore + matchingScore + timingScore + speedScore + collaborationScore;
		const maxScore = ROLE_LEGALITY_WEIGHT + ROLE_MATCHING_WEIGHT + ROLE_TIMING_WEIGHT + ROLE_SPEED_WEIGHT + ROLE_COLLABORATION_WEIGHT;

		return {
			roleType: sub.roleType,
			playerName: sub.playerName,
			totalScore: Math.round(totalScore),
			maxScore,
			breakdown: {
				legality: Math.round(legalityScore),
				timing: Math.round(timingScore),
				matching: Math.round(matchingScore),
				speed: Math.round(speedScore),
				collaboration: Math.round(collaborationScore)
			},
			errors
		};
	});
}

function evaluateRoleLegality(groups: UserScenarioGroup[], errors: ScenarioErrorDetail[]): number {
	if (groups.length === 0) return 0;

	let validGroups = 0;
	groups.forEach((ug, idx) => {
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

	return (validGroups / Math.max(groups.length, 1)) * ROLE_LEGALITY_WEIGHT;
}

function evaluateRoleMatching(
	groups: UserScenarioGroup[],
	requiredGroups: RoleRequiredGroup[],
	errors: ScenarioErrorDetail[]
): number {
	const userNormCodes = groups.map(g => normalizeCodes(g.codes));
	let criticalMatched = 0;
	let nonCriticalMatched = 0;
	const totalCritical = requiredGroups.filter(g => g.critical).length;
	const totalNonCritical = requiredGroups.filter(g => !g.critical).length;

	requiredGroups.forEach(rg => {
		const rgNorm = normalizeCodes(rg.codes);
		const matchIdx = userNormCodes.findIndex(uc => codesMatch(uc, rgNorm));

		if (matchIdx >= 0) {
			if (rg.critical) criticalMatched++;
			else nonCriticalMatched++;
		} else {
			errors.push({
				groupOrder: rg.order,
				groupCodes: [],
				errorType: rg.critical ? 'missing-critical' : 'wrong-flags',
				errorMessage: rg.critical
					? `缺少关键信号：${rg.codes.join('')}（${rg.purpose}）`
					: `缺少建议信号：${rg.codes.join('')}（${rg.purpose}）`,
				correctCodes: rg.codes,
				correctMeaning: rg.meaning
			});
		}
	});

	const criticalRatio = totalCritical > 0 ? criticalMatched / totalCritical : 1;
	const nonCriticalRatio = totalNonCritical > 0 ? nonCriticalMatched / totalNonCritical : 1;
	const matchingRatio = criticalRatio * 0.7 + nonCriticalRatio * 0.3;

	return matchingRatio * ROLE_MATCHING_WEIGHT;
}

function evaluateRoleTiming(
	groups: UserScenarioGroup[],
	requiredGroups: RoleRequiredGroup[],
	submissionTime: number,
	errors: ScenarioErrorDetail[]
): number {
	if (groups.length <= 1) return ROLE_TIMING_WEIGHT;

	const userCodesByOrder = groups.map(g => normalizeCodes(g.codes));
	const sortedRequired = [...requiredGroups].sort((a, b) => a.order - b.order);

	const userCriticalOrder: number[] = [];
	const standardCriticalOrder: number[] = [];

	groups.forEach((ug, uIdx) => {
		const userNorm = normalizeCodes(ug.codes);
		sortedRequired.forEach((rg, sIdx) => {
			if (rg.critical && codesMatch(userNorm, normalizeCodes(rg.codes))) {
				userCriticalOrder.push(uIdx);
				standardCriticalOrder.push(sIdx);
			}
		});
	});

	let orderScore = ROLE_TIMING_WEIGHT;

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
				errorMessage: `关键信号顺序有 ${inversions} 处颠倒，建议顺序：${sortedRequired
					.filter(g => g.critical)
					.map(g => g.codes.join(''))
					.join(' → ')}`
			});
		}

		orderScore = orderPreservation * ROLE_TIMING_WEIGHT;
	}

	let timeWindowScore = 1;
	sortedRequired.forEach(rg => {
		if (rg.timeWindow) {
			const matchIdx = userCodesByOrder.findIndex(uc => codesMatch(uc, normalizeCodes(rg.codes)));
			if (matchIdx >= 0) {
				const estimatedTime = (matchIdx / Math.max(groups.length, 1)) * submissionTime;
				if (estimatedTime < rg.timeWindow.earliest || estimatedTime > rg.timeWindow.latest) {
					timeWindowScore -= 0.2;
				}
			}
		}
	});

	return orderScore * 0.6 + ROLE_TIMING_WEIGHT * 0.4 * Math.max(0, timeWindowScore);
}

function evaluateRoleSpeed(reactionTime: number, timeLimit: number): number {
	if (reactionTime <= 0) return 0;
	if (reactionTime <= timeLimit * 0.25) return ROLE_SPEED_WEIGHT;
	if (reactionTime <= timeLimit * 0.5) return ROLE_SPEED_WEIGHT * 0.85;
	if (reactionTime <= timeLimit * 0.75) return ROLE_SPEED_WEIGHT * 0.65;
	if (reactionTime <= timeLimit) return ROLE_SPEED_WEIGHT * 0.4;
	return ROLE_SPEED_WEIGHT * 0.1;
}

function evaluateRoleCollaboration(
	_groups: UserScenarioGroup[],
	requiredGroups: RoleRequiredGroup[],
	scenario: CollaborativeScenarioInfo,
	submissions: PlayerSubmission[],
	errors: ScenarioErrorDetail[]
): number {
	let dependencyScore = 1;

	requiredGroups.forEach(rg => {
		if (rg.dependsOn) {
			const depRole = submissions.find(s => s.roleType === rg.dependsOn!.roleType);
			if (depRole) {
				const depNorm = scenario.roleTasks[rg.dependsOn.roleType]?.requiredGroups.find(
					g => g.id === rg.dependsOn!.groupId
				);
				if (depNorm) {
					const depNormCodes = normalizeCodes(depNorm.codes);
					const depSubmitted = depRole.groups.some(g =>
						codesMatch(normalizeCodes(g.codes), depNormCodes)
					);
					if (!depSubmitted) {
						dependencyScore -= 0.2;
					}
				}
			}
		}
	});

	if (dependencyScore < 1) {
		errors.push({
			groupOrder: 0,
			groupCodes: [],
			errorType: 'wrong-order',
			errorMessage: '部分信号未能与其他角色形成有效协同，建议关注关联角色的信号'
		});
	}

	return Math.max(0, dependencyScore) * ROLE_COLLABORATION_WEIGHT;
}

function evaluateConsistency(
	scenario: CollaborativeScenarioInfo,
	submissions: PlayerSubmission[],
	timeline: TimelineEvent[],
	conflicts: ConflictDetail[]
): number {
	let matchedRoles = 0;
	let totalRequired = 0;

	submissions.forEach(sub => {
		const roleTask = scenario.roleTasks[sub.roleType];
		if (!roleTask) return;

		const userNormCodes = sub.groups.map(g => normalizeCodes(g.codes));
		let cumulativeTime = 0;

		sub.groups.forEach((g, idx) => {
			const groupTime = cumulativeTime;
			cumulativeTime += (g.duration || 3) * 5;

			const matchedRequired = roleTask.requiredGroups.find(rg =>
				codesMatch(normalizeCodes(rg.codes), normalizeCodes(g.codes))
			);

			timeline.push({
				id: generateId(),
				time: groupTime,
				roleType: sub.roleType,
				groupCodes: g.codes,
				meaning: matchedRequired?.meaning || g.codes.join(''),
				isCorrect: !!matchedRequired
			});
		});

		roleTask.requiredGroups.forEach(rg => {
			totalRequired++;
			const rgNorm = normalizeCodes(rg.codes);
			const matchIdx = userNormCodes.findIndex(uc => codesMatch(uc, rgNorm));
			if (matchIdx >= 0) {
				matchedRoles++;
			}
		});
	});

	const consistencyRatio = totalRequired > 0 ? matchedRoles / totalRequired : 0;
	return consistencyRatio * CONSISTENCY_WEIGHT;
}

function evaluateTimingCoordination(
	scenario: CollaborativeScenarioInfo,
	submissions: PlayerSubmission[],
	_timeline: TimelineEvent[],
	conflicts: ConflictDetail[]
): number {
	const roleEvents: Record<CollaborativeRoleType, { codes: string[]; order: number }[]> = {} as any;

	submissions.forEach(sub => {
		roleEvents[sub.roleType] = sub.groups.map((g, idx) => ({
			codes: normalizeCodes(g.codes),
			order: idx
		}));
	});

	let coordinationScore = 1;
	let dependencyViolations = 0;
	let totalDependencies = 0;

	submissions.forEach(sub => {
		const roleTask = scenario.roleTasks[sub.roleType];
		if (!roleTask) return;

		roleTask.requiredGroups.forEach(rg => {
			if (rg.dependsOn) {
				totalDependencies++;
				const depRoleSubmission = submissions.find(s => s.roleType === rg.dependsOn!.roleType);
				if (!depRoleSubmission) {
					dependencyViolations++;
					return;
				}

				const depRoleTask = scenario.roleTasks[rg.dependsOn.roleType];
				const depGroup = depRoleTask?.requiredGroups.find(g => g.id === rg.dependsOn!.groupId);
				if (!depGroup) {
					dependencyViolations++;
					return;
				}

				const depSubmitted = depRoleSubmission.groups.some(g =>
					codesMatch(normalizeCodes(g.codes), normalizeCodes(depGroup.codes))
				);
				const rgSubmitted = sub.groups.some(g =>
					codesMatch(normalizeCodes(g.codes), normalizeCodes(rg.codes))
				);

				if (rgSubmitted && !depSubmitted) {
					dependencyViolations++;
					conflicts.push({
						id: generateId(),
						time: (sub.submittedAt - sub.submittedAt) / 1000,
						roles: [sub.roleType, rg.dependsOn.roleType],
						groupCodes: rg.codes,
						description: `${collaborativeRoleLabels[sub.roleType]}发送了${rg.codes.join('')}，但${collaborativeRoleLabels[rg.dependsOn.roleType]}尚未发送前置信号${depGroup.codes.join('')}`,
						severity: 'medium',
						suggestion: `应先等待${collaborativeRoleLabels[rg.dependsOn.roleType]}发送${depGroup.codes.join('')}后再响应`
					});
				}
			}
		});
	});

	if (totalDependencies > 0) {
		coordinationScore = 1 - dependencyViolations / totalDependencies;
	}

	return coordinationScore * TIMING_WEIGHT;
}

function evaluateCompleteness(
	scenario: CollaborativeScenarioInfo,
	submissions: PlayerSubmission[]
): number {
	let totalCritical = 0;
	let matchedCritical = 0;

	submissions.forEach(sub => {
		const roleTask = scenario.roleTasks[sub.roleType];
		if (!roleTask) return;

		const userNormCodes = sub.groups.map(g => normalizeCodes(g.codes));
		roleTask.requiredGroups.forEach(rg => {
			if (rg.critical) {
				totalCritical++;
				const rgNorm = normalizeCodes(rg.codes);
				if (userNormCodes.some(uc => codesMatch(uc, rgNorm))) {
					matchedCritical++;
				}
			}
		});
	});

	const completenessRatio = totalCritical > 0 ? matchedCritical / totalCritical : 1;
	return completenessRatio * COMPLETENESS_WEIGHT;
}

function evaluateCollaboration(
	scenario: CollaborativeScenarioInfo,
	submissions: PlayerSubmission[],
	conflicts: ConflictDetail[]
): number {
	let collaborationScore = COLLABORATION_WEIGHT;

	const opposingPairs: Array<[CollaborativeRoleType, CollaborativeRoleType]> = [
		['own-ship', 'target-ship']
	];

	opposingPairs.forEach(([roleA, roleB]) => {
		const subA = submissions.find(s => s.roleType === roleA);
		const subB = submissions.find(s => s.roleType === roleB);
		if (!subA || !subB) return;

		const taskA = scenario.roleTasks[roleA];
		const taskB = scenario.roleTasks[roleB];
		if (!taskA || !taskB) return;

		const codesA = subA.groups.map(g => g.codes.join(''));
		const codesB = subB.groups.map(g => g.codes.join(''));

		if (codesA.includes('E') && !codesB.includes('E')) {
			collaborationScore -= 3;
			conflicts.push({
				id: generateId(),
				time: 0,
				roles: [roleA, roleB],
				groupCodes: ['E'],
				description: `${collaborativeRoleLabels[roleA]}声明向右转向，但${collaborativeRoleLabels[roleB]}未做出对应回应`,
				severity: 'high',
				suggestion: '对遇局面下双方应同时或相继声明向右转向'
			});
		}

		if (codesA.includes('I') && codesB.includes('I')) {
			collaborationScore -= 5;
			conflicts.push({
				id: generateId(),
				time: 0,
				roles: [roleA, roleB],
				groupCodes: ['I'],
				description: `双方均发送向左转向信号，可能导致碰撞风险加剧`,
				severity: 'high',
				suggestion: '对遇局面应各自向右转向（E旗），而非向左转向'
			});
		}
	});

	return Math.max(0, collaborationScore);
}

function evaluateSpeed(
	submissions: PlayerSubmission[],
	startTime: number,
	timeLimit: number
): number {
	if (submissions.length === 0) return 0;

	const avgTime =
		submissions.reduce((sum, s) => sum + Math.max(0, s.submittedAt - startTime), 0) /
		submissions.length /
		1000;

	if (avgTime <= timeLimit * 0.25) return SPEED_WEIGHT;
	if (avgTime <= timeLimit * 0.5) return SPEED_WEIGHT * 0.85;
	if (avgTime <= timeLimit * 0.75) return SPEED_WEIGHT * 0.65;
	if (avgTime <= timeLimit) return SPEED_WEIGHT * 0.4;
	return SPEED_WEIGHT * 0.1;
}

function generateBestPlan(scenario: CollaborativeScenarioInfo): BestCollaborationPlan {
	const steps = scenario.idealTimeline
		.sort((a, b) => a.time - b.time)
		.map(ev => ({
			time: formatTime(ev.time),
			role: collaborativeRoleLabels[ev.roleType],
			action: `发送信号 ${ev.groupCodes.join(' · ')}（${ev.meaning}）`,
			reason: ev.description
		}));

	return {
		description: `本场景最佳协同方案：${scenario.description}`,
		steps
	};
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}



export function createCollaborativeResult(
	scenario: CollaborativeScenarioInfo,
	evaluation: CollaborativeEvaluationResult,
	reactionTime: number,
	isTimeout: boolean,
	sessionId?: string
): CollaborativeResult {
	return {
		id: generateId(),
		timestamp: Date.now(),
		scenarioId: scenario.id,
		scenarioTitle: scenario.title,
		category: scenario.category,
		totalScore: evaluation.totalScore,
		maxScore: evaluation.maxScore,
		scoreBreakdown: evaluation.scoreBreakdown,
		roleScores: evaluation.roleScores,
		timeline: evaluation.timeline,
		conflicts: evaluation.conflicts,
		bestPlan: evaluation.bestPlan,
		reactionTime,
		timeLimit: scenario.timeLimit,
		isTimeout,
		sessionId
	};
}
