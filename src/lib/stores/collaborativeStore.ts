import { writable, derived, type Readable } from 'svelte/store';
import type {
	CollaborativeScenarioInfo,
	CollaborativeRoleType,
	UserScenarioGroup,
	CollaborativeResult,
	CollaborativeSession,
	CollaborativeStatistics,
	CollaborativeHistoryData
} from '$lib/types';
import { generateId } from '$lib/utils/validation';
import { collaborativeRoleLabels } from '$lib/data/collaborativeScenarios';

interface PlayerState {
	id: string;
	name: string;
	roleType: CollaborativeRoleType;
	groups: UserScenarioGroup[];
	submitted: boolean;
	submittedAt: number;
}

interface CollaborativeTaskState {
	currentScenario: CollaborativeScenarioInfo | null;
	startTime: number;
	players: PlayerState[];
	isAllSubmitted: boolean;
	lastResult: CollaborativeResult | null;
}

function createCollaborativeTaskStore() {
	const currentScenario = writable<CollaborativeScenarioInfo | null>(null);
	const startTime = writable<number>(0);
	const players = writable<PlayerState[]>([]);
	const isAllSubmitted = writable<boolean>(false);
	const lastResult = writable<CollaborativeResult | null>(null);

	const combined = derived(
		[currentScenario, startTime, players, isAllSubmitted, lastResult],
		([cs, st, pl, ia, lr]) => ({
			currentScenario: cs,
			startTime: st,
			players: pl,
			isAllSubmitted: ia,
			lastResult: lr
		})
	);

	function subscribe(run: (value: CollaborativeTaskState) => void) {
		return combined.subscribe(run);
	}

	function startSession(
		scenario: CollaborativeScenarioInfo,
		playerConfigs: Array<{ name: string; roleType: CollaborativeRoleType }>
	) {
		currentScenario.set(scenario);
		startTime.set(Date.now());
		players.set(
			playerConfigs.map(p => ({
				id: generateId(),
				name: p.name,
				roleType: p.roleType,
				groups: [],
				submitted: false,
				submittedAt: 0
			}))
		);
		isAllSubmitted.set(false);
		lastResult.set(null);

		const session: CollaborativeSession = {
			id: generateId(),
			startTime: Date.now(),
			scenarioId: scenario.id,
			players: playerConfigs.map(p => ({
				id: generateId(),
				name: p.name,
				roleType: p.roleType
			})),
			results: []
		};
		collaborativeHistory.setCurrentSession(session);
		return session;
	}

	function setPlayerGroups(playerId: string, groups: UserScenarioGroup[]) {
		players.update(pls =>
			pls.map(p => (p.id === playerId ? { ...p, groups } : p))
		);
	}

	function submitPlayer(playerId: string) {
		players.update(pls => {
			const updated = pls.map(p =>
				p.id === playerId ? { ...p, submitted: true, submittedAt: Date.now() } : p
			);
			if (updated.every(p => p.submitted)) {
				isAllSubmitted.set(true);
			}
			return updated;
		});
	}

	function setResult(result: CollaborativeResult) {
		lastResult.set(result);
		collaborativeHistory.addResult(result);
	}

	function clear() {
		currentScenario.set(null);
		startTime.set(0);
		players.set([]);
		isAllSubmitted.set(false);
		lastResult.set(null);
	}

	return {
		subscribe,
		currentScenario,
		startTime,
		players,
		isAllSubmitted,
		lastResult,
		startSession,
		setPlayerGroups,
		submitPlayer,
		setResult,
		clear
	};
}

export const collaborativeTask = createCollaborativeTaskStore();

interface CollaborativeHistoryState {
	results: CollaborativeResult[];
	sessions: CollaborativeSession[];
	currentSession: CollaborativeSession | null;
}

function createCollaborativeHistoryStore() {
	const results = writable<CollaborativeResult[]>([]);
	const sessions = writable<CollaborativeSession[]>([]);
	const currentSession = writable<CollaborativeSession | null>(null);

	const combined = derived(
		[results, sessions, currentSession],
		([r, s, cs]) => ({
			results: r,
			sessions: s,
			currentSession: cs
		})
	);

	function subscribe(run: (value: CollaborativeHistoryState) => void) {
		return combined.subscribe(run);
	}

	function setCurrentSession(session: CollaborativeSession) {
		currentSession.set(session);
	}

	function addResult(result: CollaborativeResult) {
		results.update(r => [...r, result]);
		currentSession.update(session => {
			if (session) {
				return { ...session, results: [...session.results, result] };
			}
			return session;
		});
	}

	function endSession() {
		currentSession.update(session => {
			if (session) {
				const ended = { ...session, endTime: Date.now() };
				sessions.update(s => [...s, ended]);
				return ended;
			}
			return session;
		});
	}

	function clear() {
		results.set([]);
		sessions.set([]);
		currentSession.set(null);
	}

	return {
		subscribe,
		results,
		sessions,
		currentSession,
		setCurrentSession,
		addResult,
		endSession,
		clear
	};
}

export const collaborativeHistory = createCollaborativeHistoryStore();

export const collaborativeStatistics: Readable<CollaborativeStatistics> = derived(
	[collaborativeHistory.results, collaborativeHistory.sessions],
	([$results, $sessions]) => {
		const totalSessions = $sessions.length > 0 ? $sessions.length : Math.ceil($results.length / 3);

		let totalScore = 0;
		let totalConsistency = 0;
		let totalTiming = 0;
		let totalCompleteness = 0;
		let totalCollaboration = 0;

		const roleScores: Record<
			CollaborativeRoleType,
			{ total: number; count: number }
		> = {
			'own-ship': { total: 0, count: 0 },
			'target-ship': { total: 0, count: 0 },
			'pilot-vessel': { total: 0, count: 0 },
			'port-control': { total: 0, count: 0 }
		};

		$results.forEach(r => {
			const scorePercent = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
			totalScore += scorePercent;
			totalConsistency += r.scoreBreakdown.consistency;
			totalTiming += r.scoreBreakdown.timing;
			totalCompleteness += r.scoreBreakdown.completeness;
			totalCollaboration += r.scoreBreakdown.collaboration;

			r.roleScores.forEach(rs => {
				const rolePercent = rs.maxScore > 0 ? (rs.totalScore / rs.maxScore) * 100 : 0;
				roleScores[rs.roleType].total += rolePercent;
				roleScores[rs.roleType].count++;
			});
		});

		const resultCount = $results.length;
		const averageScore = resultCount > 0 ? totalScore / resultCount : 0;
		const averageConsistency = resultCount > 0 ? totalConsistency / resultCount : 0;
		const averageTiming = resultCount > 0 ? totalTiming / resultCount : 0;
		const averageCompleteness = resultCount > 0 ? totalCompleteness / resultCount : 0;
		const averageCollaboration = resultCount > 0 ? totalCollaboration / resultCount : 0;

		const rolePerformance: Record<
			CollaborativeRoleType,
			{ averageScore: number; sessionCount: number }
		> = {
			'own-ship': {
				averageScore:
					roleScores['own-ship'].count > 0
						? Math.round(roleScores['own-ship'].total / roleScores['own-ship'].count)
						: 0,
				sessionCount: roleScores['own-ship'].count
			},
			'target-ship': {
				averageScore:
					roleScores['target-ship'].count > 0
						? Math.round(roleScores['target-ship'].total / roleScores['target-ship'].count)
						: 0,
				sessionCount: roleScores['target-ship'].count
			},
			'pilot-vessel': {
				averageScore:
					roleScores['pilot-vessel'].count > 0
						? Math.round(roleScores['pilot-vessel'].total / roleScores['pilot-vessel'].count)
						: 0,
				sessionCount: roleScores['pilot-vessel'].count
			},
			'port-control': {
				averageScore:
					roleScores['port-control'].count > 0
						? Math.round(roleScores['port-control'].total / roleScores['port-control'].count)
						: 0,
				sessionCount: roleScores['port-control'].count
			}
		};

		const history: CollaborativeHistoryData[] = [];
		if ($sessions.length > 0) {
			$sessions.forEach((session, idx) => {
				let sessionScore = 0;
				let sessionConsistency = 0;
				let sessionTiming = 0;
				let sessionCompleteness = 0;
				let sessionCollaboration = 0;
				const playerCount = session.players.length;

				session.results.forEach(r => {
					const scorePercent = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
					sessionScore += scorePercent;
					sessionConsistency += r.scoreBreakdown.consistency;
					sessionTiming += r.scoreBreakdown.timing;
					sessionCompleteness += r.scoreBreakdown.completeness;
					sessionCollaboration += r.scoreBreakdown.collaboration;
				});

				const rCount = Math.max(session.results.length, 1);
				history.push({
					sessionNum: idx + 1,
					score: Math.round(sessionScore / rCount),
					consistency: Math.round(sessionConsistency / rCount),
					timing: Math.round(sessionTiming / rCount),
					completeness: Math.round(sessionCompleteness / rCount),
					collaboration: Math.round(sessionCollaboration / rCount),
					playerCount,
					timestamp: session.startTime
				});
			});
		} else {
			const sessionSize = 3;
			for (let i = 0; i < $results.length; i += sessionSize) {
				const sessionResults = $results.slice(i, i + sessionSize);
				const sessionNum = Math.floor(i / sessionSize) + 1;
				let sessionScore = 0;
				let sessionConsistency = 0;
				let sessionTiming = 0;
				let sessionCompleteness = 0;
				let sessionCollaboration = 0;
				let playerCount = 0;

				sessionResults.forEach(r => {
					const scorePercent = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
					sessionScore += scorePercent;
					sessionConsistency += r.scoreBreakdown.consistency;
					sessionTiming += r.scoreBreakdown.timing;
					sessionCompleteness += r.scoreBreakdown.completeness;
					sessionCollaboration += r.scoreBreakdown.collaboration;
					playerCount = Math.max(playerCount, r.roleScores.length);
				});

				const rCount = Math.max(sessionResults.length, 1);
				history.push({
					sessionNum,
					score: Math.round(sessionScore / rCount),
					consistency: Math.round(sessionConsistency / rCount),
					timing: Math.round(sessionTiming / rCount),
					completeness: Math.round(sessionCompleteness / rCount),
					collaboration: Math.round(sessionCollaboration / rCount),
					playerCount,
					timestamp: sessionResults[0]?.timestamp || Date.now()
				});
			}
		}

		return {
			totalSessions,
			averageScore: Math.round(averageScore),
			averageConsistency: Math.round(averageConsistency),
			averageTiming: Math.round(averageTiming),
			averageCompleteness: Math.round(averageCompleteness),
			averageCollaboration: Math.round(averageCollaboration),
			history,
			rolePerformance
		};
	}
);
