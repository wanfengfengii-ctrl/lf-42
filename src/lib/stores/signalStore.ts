import { writable, derived, type Readable } from 'svelte/store';
import type { SignalGroup, SignalFlag, PlayerState, TrainingSession, TrainingResult, Statistics, WeatherIntensity, ResultCategory } from '$lib/types';
import { generateId, getSignalMeaning, validateSignalGroup, validateFlagOrder, analyzeSubstituteUsage } from '$lib/utils/validation';
import { allFlags, getFlagById } from '$lib/data/flags';

function createSignalGroupsStore() {
	const { subscribe, set, update } = writable<SignalGroup[]>([]);

	return {
		subscribe,
		addGroup: (flags: SignalFlag[]) => {
			const meaning = getSignalMeaning(flags);
			const group: SignalGroup = {
				id: generateId(),
				flags: [...flags],
				order: 0,
				meaning
			};

			const orderValidation = validateFlagOrder(flags);
			if (!orderValidation.valid) {
				return { success: false, message: orderValidation.message };
			}

			const validation = validateSignalGroup(group);
			if (!validation.valid) {
				return { success: false, message: validation.message };
			}

			update(groups => {
				const newGroups = [...groups, group];
				return newGroups.map((g, i) => ({ ...g, order: i }));
			});
			return { success: true };
		},
		removeGroup: (id: string) => {
			update(groups => {
				return groups.filter(g => g.id !== id).map((g, i) => ({ ...g, order: i }));
			});
		},
		moveGroup: (fromIndex: number, toIndex: number) => {
			update(groups => {
				const newGroups = [...groups];
				const [removed] = newGroups.splice(fromIndex, 1);
				newGroups.splice(toIndex, 0, removed);
				return newGroups.map((g, i) => ({ ...g, order: i }));
			});
		},
		updateGroupFlags: (id: string, flags: SignalFlag[]) => {
			update(groups => {
				return groups.map(g => {
					if (g.id === id) {
						const meaning = getSignalMeaning(flags);
						return { ...g, flags: [...flags], meaning };
					}
					return g;
				});
			});
		},
		clear: () => set([])
	};
}

export const signalGroups = createSignalGroupsStore();

function createPlayerStore() {
	const { subscribe, set, update } = writable<PlayerState>({
		isPlaying: false,
		isPaused: false,
		currentGroupIndex: 0,
		currentFlagIndex: 0,
		progress: 0,
		weatherIntensity: 0
	});

	return {
		subscribe,
		play: () => update(state => ({ ...state, isPlaying: true, isPaused: false })),
		pause: () => update(state => ({ ...state, isPaused: true })),
		resume: () => update(state => ({ ...state, isPaused: false })),
		stop: () => update(state => ({
			...state,
			isPlaying: false,
			isPaused: false,
			currentGroupIndex: 0,
			currentFlagIndex: 0,
			progress: 0
		})),
		setProgress: (progress: number) => update(state => ({ ...state, progress })),
		setCurrentPosition: (groupIndex: number, flagIndex: number) =>
			update(state => ({ ...state, currentGroupIndex: groupIndex, currentFlagIndex: flagIndex })),
		setWeatherIntensity: (intensity: WeatherIntensity) => update(state => ({ ...state, weatherIntensity: Math.max(0, Math.min(100, intensity)) }))
	};
}

export const player = createPlayerStore();

function createTrainingStore() {
	const { subscribe, set, update } = writable<TrainingSession | null>(null);
	const results = writable<TrainingResult[]>([]);
	const sessionHistory = writable<TrainingSession[]>([]);

	return {
		subscribe,
		results: { subscribe: results.subscribe },
		sessionHistory: { subscribe: sessionHistory.subscribe },
		startSession: (difficulty: 'easy' | 'medium' | 'hard' = 'medium', weatherIntensity: number = 0, isBlindMode: boolean = false, maxQuestions: number = 10) => {
			const session: TrainingSession = {
				id: generateId(),
				startTime: Date.now(),
				results: [],
				difficulty,
				weatherIntensity,
				isBlindMode,
				maxQuestions
			};
			set(session);
			results.set([]);
			return session;
		},
		addResult: (result: TrainingResult) => {
			const categorizedResult: TrainingResult = {
				...result,
				resultCategory: categorizeResult(result)
			};
			results.update(r => [...r, categorizedResult]);
			update(session => {
				if (session) {
					return { ...session, results: [...session.results, categorizedResult] };
				}
				return session;
			});
		},
		endSession: () => {
			update(session => {
				if (session) {
					const ended = { ...session, endTime: Date.now() };
					sessionHistory.update(h => [...h, ended]);
					return ended;
				}
				return session;
			});
		},
		clear: () => {
			set(null);
			results.set([]);
		}
	};
}

function categorizeResult(r: TrainingResult): ResultCategory {
	if (r.isTimeout) return 'timeout';
	if (r.isMisjudged) return 'misjudged';
	return 'correct';
}

export const training = createTrainingStore();

export const statistics: Readable<Statistics> = derived([training.results, training.sessionHistory], ([$results, $sessionHistory]) => {
	const total = $results.length;
	const correct = $results.filter(r => r.isCorrect && !r.isTimeout).length;
	const timeout = $results.filter(r => r.isTimeout).length;
	const misjudged = $results.filter(r => r.isMisjudged && !r.isTimeout).length;

	const reactionTimes = $results
		.filter(r => !r.isTimeout)
		.map(r => r.reactionTime);
	const avgReactionTime = reactionTimes.length > 0
		? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
		: 0;

	const sessionSize = 10;
	const accuracyHistory: { session: number; accuracy: number }[] = [];
	const reactionTimeHistory: { session: number; time: number }[] = [];
	const perSessionAccuracy: { sessionId: string; sessionNum: number; accuracy: number; total: number; correct: number; timestamp?: number }[] = [];
	const perQuestionReactionTime: { questionNum: number; time: number; isCorrect: boolean; category: ResultCategory }[] = [];

	if ($sessionHistory.length > 0) {
		$sessionHistory.forEach((session, idx) => {
			const sessionResults = session.results;
			const sessionNum = idx + 1;
			const sessionCorrect = sessionResults.filter(r => r.isCorrect && !r.isTimeout).length;
			const sessionAccuracy = sessionResults.length > 0 ? (sessionCorrect / sessionResults.length) * 100 : 0;
			accuracyHistory.push({ session: sessionNum, accuracy: sessionAccuracy });

			const sessionReactionTimes = sessionResults
				.filter(r => !r.isTimeout)
				.map(r => r.reactionTime);
			const sessionAvgReaction = sessionReactionTimes.length > 0
				? sessionReactionTimes.reduce((a, b) => a + b, 0) / sessionReactionTimes.length
				: 0;
			reactionTimeHistory.push({ session: sessionNum, time: sessionAvgReaction });

			perSessionAccuracy.push({
				sessionId: session.id,
				sessionNum,
				accuracy: sessionAccuracy,
				total: sessionResults.length,
				correct: sessionCorrect,
				timestamp: session.startTime
			});
		});
	} else {
		for (let i = 0; i < $results.length; i += sessionSize) {
			const sessionResults = $results.slice(i, i + sessionSize);
			const sessionNum = Math.floor(i / sessionSize) + 1;
			const sessionCorrect = sessionResults.filter(r => r.isCorrect && !r.isTimeout).length;
			const sessionAccuracy = sessionResults.length > 0 ? (sessionCorrect / sessionResults.length) * 100 : 0;
			accuracyHistory.push({ session: sessionNum, accuracy: sessionAccuracy });

			const sessionReactionTimes = sessionResults
				.filter(r => !r.isTimeout)
				.map(r => r.reactionTime);
			const sessionAvgReaction = sessionReactionTimes.length > 0
				? sessionReactionTimes.reduce((a, b) => a + b, 0) / sessionReactionTimes.length
				: 0;
			reactionTimeHistory.push({ session: sessionNum, time: sessionAvgReaction });

			perSessionAccuracy.push({
				sessionId: `session-${sessionNum}`,
				sessionNum,
				accuracy: sessionAccuracy,
				total: sessionResults.length,
				correct: sessionCorrect
			});
		}
	}

	$results.forEach((r, idx) => {
		perQuestionReactionTime.push({
			questionNum: idx + 1,
			time: r.reactionTime,
			isCorrect: r.isCorrect,
			category: r.resultCategory || categorizeResult(r)
		});
	});

	const misjudgedCount: Record<string, number> = {};
	const misjudgedWithConfusion: Record<string, { count: number; confusedWithIds: Set<string> }> = {};

	$results
		.filter(r => r.isMisjudged && !r.isTimeout)
		.forEach(r => {
			r.signal.flags.forEach(sf => {
				const flagId = sf.flag.id;
				const flagCode = sf.flag.code;
				misjudgedCount[flagId] = (misjudgedCount[flagId] || 0) + 1;

				if (!misjudgedWithConfusion[flagId]) {
					misjudgedWithConfusion[flagId] = { count: 0, confusedWithIds: new Set() };
				}
				misjudgedWithConfusion[flagId].count++;

				if (r.misjudgedFlagIds && r.misjudgedFlagIds.length > 0) {
					r.misjudgedFlagIds.forEach(id => {
						if (id !== flagId) {
							misjudgedWithConfusion[flagId].confusedWithIds.add(id);
						}
					});
				} else {
					const userAnswerNorm = (r.userAnswer || '').toLowerCase().trim();
					if (userAnswerNorm.length > 0) {
						const similarFlags = findSimilarFlags(flagCode, userAnswerNorm);
						similarFlags.forEach(id => {
							if (id !== flagId) {
								misjudgedWithConfusion[flagId].confusedWithIds.add(id);
							}
						});
					}
				}
			});
		});

	const mostMisjudged = Object.entries(misjudgedCount)
		.map(([flagId, count]) => ({ flagId, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	const misjudgedWithDetails = Object.entries(misjudgedWithConfusion)
		.map(([flagId, data]) => ({
			flagId,
			count: data.count,
			confusedWithIds: Array.from(data.confusedWithIds).slice(0, 5)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	const flagAppearances: Record<string, number> = {};
	const flagErrors: Record<string, number> = {};

	$results.forEach(r => {
		r.signal.flags.forEach(sf => {
			const flagId = sf.flag.id;
			flagAppearances[flagId] = (flagAppearances[flagId] || 0) + 1;
		});
	});

	$results.filter(r => r.isMisjudged || r.isTimeout).forEach(r => {
		if (r.misjudgedFlagIds) {
			r.misjudgedFlagIds.forEach(id => {
				flagErrors[id] = (flagErrors[id] || 0) + 1;
			});
		} else if (r.isMisjudged) {
			r.signal.flags.forEach(sf => {
				flagErrors[sf.flag.id] = (flagErrors[sf.flag.id] || 0) + 1;
			});
		}
	});

	const flagErrorRate = Object.entries(flagAppearances)
		.map(([flagId, totalAppearances]) => {
			const flag = getFlagById(flagId);
			const errorCount = flagErrors[flagId] || 0;
			return {
				flagId,
				code: flag?.code || flagId,
				name: flag?.name || flagId,
				totalAppearances,
				errorCount,
				errorRate: totalAppearances > 0 ? (errorCount / totalAppearances) * 100 : 0
			};
		})
		.sort((a, b) => b.errorRate - a.errorRate)
		.slice(0, 15);

	const reactionTimeTrend: { questionNum: number; time: number; category: ResultCategory; rollingAvg: number }[] = [];
	const windowSize = 5;
	$results.forEach((r, idx) => {
		const start = Math.max(0, idx - windowSize + 1);
		const window = $results.slice(start, idx + 1).filter(rr => !rr.isTimeout);
		const rollingAvg = window.length > 0
			? window.reduce((sum, rr) => sum + rr.reactionTime, 0) / window.length
			: r.reactionTime;
		reactionTimeTrend.push({
			questionNum: idx + 1,
			time: r.reactionTime,
			category: r.resultCategory || categorizeResult(r),
			rollingAvg
		});
	});

	return {
		totalQuestions: total,
		correctAnswers: correct,
		timeoutAnswers: timeout,
		misjudgedAnswers: misjudged,
		averageReactionTime: avgReactionTime,
		accuracyHistory,
		reactionTimeHistory,
		mostMisjudged,
		perSessionAccuracy,
		perQuestionReactionTime,
		misjudgedWithDetails,
		flagErrorRate,
		reactionTimeTrend
	};
});

function findSimilarFlags(sourceCode: string, userAnswer: string): string[] {
	const similar: string[] = [];
	const keywords = userAnswer.split(/[\s，。、；：]+/).filter(k => k.length >= 2);

	allFlags.forEach(flag => {
		if (flag.code === sourceCode) return;
		const flagMeaning = flag.meaning.toLowerCase();
		const flagName = flag.name.toLowerCase();

		const hasKeywordMatch = keywords.some(kw =>
			flagMeaning.includes(kw) || flagName.includes(kw)
		);

		if (hasKeywordMatch) {
			similar.push(flag.id);
		}
	});

	if (similar.length === 0 && sourceCode.length >= 1) {
		allFlags.forEach(flag => {
			if (flag.code === sourceCode) return;
			if (flag.code.charAt(0) === sourceCode.charAt(0)) {
				similar.push(flag.id);
			}
		});
	}

	return similar.slice(0, 3);
}

function createCurrentTrainingSignalStore() {
	const { subscribe, set } = writable<SignalGroup | null>(null);
	const startTime = writable<number>(0);
	const showAnswer = writable<boolean>(false);
	const userHasAnswered = writable<boolean>(false);

	return {
		subscribe,
		startTime: { subscribe: startTime.subscribe },
		showAnswer: { subscribe: showAnswer.subscribe },
		userHasAnswered: { subscribe: userHasAnswered.subscribe },
		setSignal: (signal: SignalGroup) => {
			set(signal);
			startTime.set(Date.now());
			showAnswer.set(false);
			userHasAnswered.set(false);
		},
		revealAnswer: () => {
			showAnswer.set(true);
		},
		markAnswered: () => {
			userHasAnswered.set(true);
		},
		clear: () => {
			set(null);
			startTime.set(0);
			showAnswer.set(false);
			userHasAnswered.set(false);
		}
	};
}

export const currentTrainingSignal = createCurrentTrainingSignalStore();

export function generateRandomSignal(difficulty: 'easy' | 'medium' | 'hard', validateRules: boolean = false): SignalGroup {
	let flags: SignalFlag[] = [];
	let attempts = 0;
	const maxAttempts = validateRules ? 50 : 1;

	while (attempts < maxAttempts) {
		attempts++;
		flags = [];

		if (difficulty === 'easy') {
			const idx = Math.floor(Math.random() * 26);
			flags = [{ flag: allFlags[idx], duration: 3 }];
		} else if (difficulty === 'medium') {
			const len = Math.random() > 0.5 ? 1 : 2;
			for (let i = 0; i < len; i++) {
				const idx = Math.floor(Math.random() * 36);
				flags.push({ flag: allFlags[idx], duration: 2 });
			}
		} else {
			const len = 2 + Math.floor(Math.random() * 2);
			for (let i = 0; i < len; i++) {
				const idx = Math.floor(Math.random() * 40);
				flags.push({ flag: allFlags[idx], duration: 1.5 });
			}
		}

		if (!validateRules) break;

		const meaning = getSignalMeaning(flags);
		const group: SignalGroup = {
			id: generateId(),
			flags,
			order: 0,
			meaning
		};
		const validation = validateSignalGroup(group);
		if (validation.valid) break;
	}

	const meaning = getSignalMeaning(flags);

	return {
		id: generateId(),
		flags,
		order: 0,
		meaning
	};
}

export function generateValidatedSignal(difficulty: 'easy' | 'medium' | 'hard'): SignalGroup {
	return generateRandomSignal(difficulty, true);
}
