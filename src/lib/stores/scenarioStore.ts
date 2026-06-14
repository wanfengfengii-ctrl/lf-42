import { writable, derived, type Readable } from 'svelte/store';
import type {
	ScenarioInfo,
	ScenarioSession,
	ScenarioResult,
	ScenarioStatistics,
	ScenarioCategory,
	ScenarioAbilityRadar,
	ScenarioHistoryData,
	UserScenarioGroup,
	ScenarioScoreBreakdown
} from '$lib/types';
import { generateId } from '$lib/utils/validation';
import { getRandomScenario, scenarioCategoryLabels } from '$lib/data/scenarios';

interface ScenarioTaskState {
	currentScenario: ScenarioInfo | null;
	startTime: number;
	userGroups: UserScenarioGroup[];
	isSubmitted: boolean;
	lastResult: ScenarioResult | null;
}

function createScenarioTaskStore() {
	const currentScenario = writable<ScenarioInfo | null>(null);
	const startTime = writable<number>(0);
	const userGroups = writable<UserScenarioGroup[]>([]);
	const isSubmitted = writable<boolean>(false);
	const lastResult = writable<ScenarioResult | null>(null);

	const combined = derived(
		[currentScenario, startTime, userGroups, isSubmitted, lastResult],
		([cs, st, ug, is, lr]) => ({
			currentScenario: cs,
			startTime: st,
			userGroups: ug,
			isSubmitted: is,
			lastResult: lr
		})
	);

	function subscribe(run: (value: ScenarioTaskState) => void) {
		return combined.subscribe(run);
	}

	return {
		subscribe,
		currentScenario,
		startTime,
		userGroups,
		isSubmitted,
		lastResult,

		startTask: (scenario?: ScenarioInfo, category: ScenarioCategory | 'all' = 'all') => {
			const s = scenario || getRandomScenario(category);
			currentScenario.set(s);
			startTime.set(Date.now());
			userGroups.set([]);
			isSubmitted.set(false);
			lastResult.set(null);
			return s;
		},

		setUserGroups: (groups: UserScenarioGroup[]) => {
			userGroups.set(groups);
		},

		submitResult: (result: ScenarioResult) => {
			isSubmitted.set(true);
			lastResult.set(result);
			scenarioHistory.addResult(result);
		},

		clear: () => {
			currentScenario.set(null);
			startTime.set(0);
			userGroups.set([]);
			isSubmitted.set(false);
			lastResult.set(null);
		}
	};
}

export const scenarioTask = createScenarioTaskStore();

interface ScenarioHistoryState {
	results: ScenarioResult[];
	sessions: ScenarioSession[];
	currentSession: ScenarioSession | null;
}

function createScenarioHistoryStore() {
	const results = writable<ScenarioResult[]>([]);
	const sessions = writable<ScenarioSession[]>([]);
	const currentSession = writable<ScenarioSession | null>(null);

	const combined = derived(
		[results, sessions, currentSession],
		([r, s, cs]) => ({
			results: r,
			sessions: s,
			currentSession: cs
		})
	);

	function subscribe(run: (value: ScenarioHistoryState) => void) {
		return combined.subscribe(run);
	}

	return {
		subscribe,
		results,
		sessions,
		currentSession,

		startSession: (categoryFilter: ScenarioCategory | 'all' = 'all') => {
			const session: ScenarioSession = {
				id: generateId(),
				startTime: Date.now(),
				results: [],
				categoryFilter
			};
			currentSession.set(session);
			return session;
		},

		addResult: (result: ScenarioResult) => {
			results.update(r => [...r, result]);
			currentSession.update(session => {
				if (session) {
					return { ...session, results: [...session.results, result] };
				}
				return session;
			});
		},

		endSession: () => {
			currentSession.update(session => {
				if (session) {
					const ended = { ...session, endTime: Date.now() };
					sessions.update(s => [...s, ended]);
					return ended;
				}
				return session;
			});
		},

		clear: () => {
			results.set([]);
			sessions.set([]);
			currentSession.set(null);
		}
	};
}

export const scenarioHistory = createScenarioHistoryStore();

export const scenarioStatistics: Readable<ScenarioStatistics> = derived(
	[scenarioHistory.results, scenarioHistory.sessions],
	([$results, $sessions]) => {
		const totalTasks = $results.length;

		const categoryScores: Record<ScenarioCategory, number> = {
			'collision': 0,
			'distress': 0,
			'pilotage': 0,
			'quarantine': 0,
			'dangerous-cargo': 0,
			'towing': 0
		};
		const categoryTaskCounts: Record<ScenarioCategory, number> = {
			'collision': 0,
			'distress': 0,
			'pilotage': 0,
			'quarantine': 0,
			'dangerous-cargo': 0,
			'towing': 0
		};
		const categoryBreakdowns: Record<ScenarioCategory, ScenarioScoreBreakdown[]> = {
			'collision': [],
			'distress': [],
			'pilotage': [],
			'quarantine': [],
			'dangerous-cargo': [],
			'towing': []
		};

		let totalScoreSum = 0;

		$results.forEach(r => {
			const scorePercent = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
			totalScoreSum += scorePercent;
			categoryScores[r.scenarioCategory] += scorePercent;
			categoryTaskCounts[r.scenarioCategory]++;
			categoryBreakdowns[r.scenarioCategory].push(r.scoreBreakdown);
		});

		const averageScore = totalTasks > 0 ? totalScoreSum / totalTasks : 0;

		(Object.keys(categoryScores) as ScenarioCategory[]).forEach(cat => {
			categoryScores[cat] = categoryTaskCounts[cat] > 0
				? categoryScores[cat] / categoryTaskCounts[cat]
				: 0;
		});

		const abilityRadar: ScenarioAbilityRadar[] = (Object.keys(categoryScores) as ScenarioCategory[]).map(cat => {
			const breakdowns = categoryBreakdowns[cat];
			let legality = 0, timing = 0, matching = 0, speed = 0;
			if (breakdowns.length > 0) {
				breakdowns.forEach(b => {
					legality += b.legality;
					timing += b.timing;
					matching += b.matching;
					speed += b.speed;
				});
				legality = (legality / breakdowns.length / 25) * 100;
				timing = (timing / breakdowns.length / 20) * 100;
				matching = (matching / breakdowns.length / 40) * 100;
				speed = (speed / breakdowns.length / 15) * 100;
			}
			const overall = (legality + timing + matching + speed) / 4;
			return {
				category: cat,
				categoryLabel: scenarioCategoryLabels[cat],
				legality: Math.round(legality),
				timing: Math.round(timing),
				matching: Math.round(matching),
				speed: Math.round(speed),
				overall: Math.round(overall),
				taskCount: categoryTaskCounts[cat]
			};
		});

		const history: ScenarioHistoryData[] = [];
		if ($sessions.length > 0) {
			$sessions.forEach((session, idx) => {
				session.results.forEach(r => {
					const scorePercent = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
					history.push({
						sessionNum: idx + 1,
						score: Math.round(scorePercent),
						category: r.scenarioCategory,
						timestamp: r.timestamp
					});
				});
			});
		} else {
			$results.forEach((r, idx) => {
				const scorePercent = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
				history.push({
					sessionNum: Math.floor(idx / 5) + 1,
					score: Math.round(scorePercent),
					category: r.scenarioCategory,
					timestamp: r.timestamp
				});
			});
		}

		let weakestCategory: ScenarioCategory | null = null;
		let strongestCategory: ScenarioCategory | null = null;
		let minScore = Infinity;
		let maxScore = -Infinity;

		abilityRadar.forEach(r => {
			if (r.taskCount > 0) {
				if (r.overall < minScore) {
					minScore = r.overall;
					weakestCategory = r.category;
				}
				if (r.overall > maxScore) {
					maxScore = r.overall;
					strongestCategory = r.category;
				}
			}
		});

		return {
			totalTasks,
			averageScore: Math.round(averageScore),
			categoryScores,
			categoryTaskCounts,
			abilityRadar,
			history,
			weakestCategory,
			strongestCategory
		};
	}
);
