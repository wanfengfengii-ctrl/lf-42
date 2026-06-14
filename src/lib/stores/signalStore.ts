import { writable, derived, type Readable } from 'svelte/store';
import type { SignalGroup, SignalFlag, PlayerState, TrainingSession, TrainingResult, Statistics, WeatherCondition } from '$lib/types';
import { generateId, getSignalMeaning, validateSignalGroup, validateFlagOrder } from '$lib/utils/validation';
import { allFlags } from '$lib/data/flags';

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
		weather: 'calm'
	});

	return {
		subscribe,
		play: () => update(state => ({ ...state, isPlaying: true, isPaused: false })),
		pause: () => update(state => ({ ...state, isPaused: true })),
		resume: () => update(state => ({ ...state, isPaused: false })),
		stop: () => set({
			isPlaying: false,
			isPaused: false,
			currentGroupIndex: 0,
			currentFlagIndex: 0,
			progress: 0,
			weather: 'calm'
		}),
		setProgress: (progress: number) => update(state => ({ ...state, progress })),
		setCurrentPosition: (groupIndex: number, flagIndex: number) => 
			update(state => ({ ...state, currentGroupIndex: groupIndex, currentFlagIndex: flagIndex })),
		setWeather: (weather: WeatherCondition) => update(state => ({ ...state, weather }))
	};
}

export const player = createPlayerStore();

function createTrainingStore() {
	const { subscribe, set, update } = writable<TrainingSession | null>(null);
	const results = writable<TrainingResult[]>([]);

	return {
		subscribe,
		results: { subscribe: results.subscribe },
		startSession: (difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
			const session: TrainingSession = {
				id: generateId(),
				startTime: Date.now(),
				results: [],
				difficulty
			};
			set(session);
			results.set([]);
			return session;
		},
		addResult: (result: TrainingResult) => {
			results.update(r => [...r, result]);
			update(session => {
				if (session) {
					return { ...session, results: [...session.results, result] };
				}
				return session;
			});
		},
		endSession: () => {
			update(session => {
				if (session) {
					return { ...session, endTime: Date.now() };
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

export const training = createTrainingStore();

export const statistics: Readable<Statistics> = derived([training.results], ([$results]) => {
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
	}

	const misjudgedCount: Record<string, number> = {};
	$results
		.filter(r => r.isMisjudged)
		.forEach(r => {
			r.signal.flags.forEach(sf => {
				const flagId = sf.flag.id;
				misjudgedCount[flagId] = (misjudgedCount[flagId] || 0) + 1;
			});
		});

	const mostMisjudged = Object.entries(misjudgedCount)
		.map(([flagId, count]) => ({ flagId, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	return {
		totalQuestions: total,
		correctAnswers: correct,
		timeoutAnswers: timeout,
		misjudgedAnswers: misjudged,
		averageReactionTime: avgReactionTime,
		accuracyHistory,
		reactionTimeHistory,
		mostMisjudged
	};
});

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

export function generateRandomSignal(difficulty: 'easy' | 'medium' | 'hard'): SignalGroup {
	let flags: SignalFlag[] = [];
	
	if (difficulty === 'easy') {
		const randomFlag = allFlags[Math.floor(Math.random() * 26)];
		flags = [{ flag: randomFlag, duration: 3 }];
	} else if (difficulty === 'medium') {
		const len = Math.random() > 0.5 ? 1 : 2;
		for (let i = 0; i < len; i++) {
			const randomFlag = allFlags[Math.floor(Math.random() * 36)];
			flags.push({ flag: randomFlag, duration: 2 });
		}
	} else {
		const len = 2 + Math.floor(Math.random() * 2);
		for (let i = 0; i < len; i++) {
			const randomFlag = allFlags[Math.floor(Math.random() * 40)];
			flags.push({ flag: randomFlag, duration: 1.5 });
		}
	}

	const meaning = getSignalMeaning(flags);
	
	return {
		id: generateId(),
		flags,
		order: 0,
		meaning
	};
}
