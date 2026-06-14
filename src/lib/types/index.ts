export interface Flag {
	id: string;
	code: string;
	name: string;
	meaning: string;
	colors: string[];
	pattern: 'solid' | 'horizontal' | 'vertical' | 'diagonal' | 'cross' | 'saltire' | 'canton' | 'checker';
	phonetic: string;
}

export interface SignalFlag {
	flag: Flag;
	duration: number;
}

export interface SignalGroup {
	id: string;
	flags: SignalFlag[];
	order: number;
	meaning: string;
}

export interface ValidationResult {
	valid: boolean;
	message?: string;
}

export type WeatherCondition = 'calm' | 'moderate' | 'storm' | 'fog';

export type WeatherIntensity = number;

export interface PlayerState {
	isPlaying: boolean;
	isPaused: boolean;
	currentGroupIndex: number;
	currentFlagIndex: number;
	progress: number;
	weatherIntensity: WeatherIntensity;
}

export interface TrainingResult {
	id: string;
	timestamp: number;
	signal: SignalGroup;
	userAnswer: string;
	correctAnswer: string;
	isCorrect: boolean;
	isTimeout: boolean;
	isMisjudged: boolean;
	reactionTime: number;
	timeLimit: number;
}

export interface TrainingSession {
	id: string;
	startTime: number;
	endTime?: number;
	results: TrainingResult[];
	difficulty: 'easy' | 'medium' | 'hard';
}

export interface Statistics {
	totalQuestions: number;
	correctAnswers: number;
	timeoutAnswers: number;
	misjudgedAnswers: number;
	averageReactionTime: number;
	accuracyHistory: { session: number; accuracy: number }[];
	reactionTimeHistory: { session: number; time: number }[];
	mostMisjudged: { flagId: string; count: number }[];
}

export type PageMode = 'compose' | 'train' | 'review';
