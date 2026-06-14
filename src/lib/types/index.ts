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
	duration: number;
}

export interface ValidationResult {
	valid: boolean;
	message?: string;
	ruleViolation?: ValidationRuleType;
	violationCode?: string;
}

export type ValidationRuleType = 
	| 'GROUP_SIZE'
	| 'DURATION'
	| 'SUBSTITUTE_POSITION'
	| 'SUBSTITUTE_ONLY'
	| 'SUBSTITUTE_REFERENCE'
	| 'SUBSTITUTE_CONSECUTIVE'
	| 'SUBSTITUTE_DUPLICATE'
	| 'DUPLICATE_WITHOUT_SUBSTITUTE'
	| 'INVALID_SIGNAL_CODE'
	| 'SIGNAL_MEANING_NOT_FOUND'
	| 'NUMBER_FLAG_ORDER'
	| 'LETTER_NUMBER_MIX'
	| 'GROUP_STRUCTURE';

export interface DetailedValidationResult extends ValidationResult {
	warnings?: ValidationResult[];
	rulesChecked?: string[];
	substituteAnalysis?: SubstituteAnalysis;
}

export interface SubstituteAnalysis {
	totalSubstitutes: number;
	validReferences: number;
	invalidReferences: Array<{
		code: string;
		position: number;
		reason: string;
	}>;
	expandedCodes?: string[];
}

export interface SignalCodeInfo {
	code: string;
	type: 'single' | 'two-letter' | 'three-letter' | 'numeric' | 'alphanumeric' | 'bearing' | 'distress';
	isStandard: boolean;
	meaning?: string;
	category?: string;
}

export type WeatherCondition = 'calm' | 'light' | 'moderate' | 'strong' | 'storm' | 'typhoon' | 'fog-light' | 'fog-heavy' | 'fog-storm';

export type WeatherIntensity = number;

export interface WeatherEffect {
	visibility: number;
	swingAmplitude: number;
	waveAmplitude: number;
	blurAmount: number;
	fogOpacity: number;
	rainIntensity: number;
	lightningFrequency: number;
	debrisAmount: number;
	occlusionStrength: number;
	difficultyMultiplier: number;
}

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
	misjudgedFlagIds?: string[];
	userInputCodes?: string[];
	weatherIntensity?: number;
	isBlindMode?: boolean;
	sessionId?: string;
	resultCategory?: 'timeout' | 'misjudged' | 'correct';
}

export type ResultCategory = 'timeout' | 'misjudged' | 'correct';

export interface TrainingSession {
	id: string;
	startTime: number;
	endTime?: number;
	results: TrainingResult[];
	difficulty: 'easy' | 'medium' | 'hard';
	weatherIntensity?: number;
	isBlindMode?: boolean;
	maxQuestions?: number;
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
	perSessionAccuracy: { sessionId: string; sessionNum: number; accuracy: number; total: number; correct: number; timestamp?: number }[];
	perQuestionReactionTime: { questionNum: number; time: number; isCorrect: boolean; category: ResultCategory }[];
	misjudgedWithDetails: { flagId: string; count: number; confusedWithIds?: string[] }[];
	flagErrorRate: { flagId: string; code: string; name: string; totalAppearances: number; errorCount: number; errorRate: number }[];
	reactionTimeTrend: { questionNum: number; time: number; category: ResultCategory; rollingAvg: number }[];
}

export type PageMode = 'compose' | 'train' | 'review' | 'scenario';

export type ScenarioCategory = 'collision' | 'distress' | 'pilotage' | 'quarantine' | 'dangerous-cargo' | 'towing';

export interface ScenarioInfo {
	id: string;
	category: ScenarioCategory;
	categoryLabel: string;
	title: string;
	description: string;
	context: string;
	difficulty: 'easy' | 'medium' | 'hard';
	timeLimit: number;
	standardGroups: ScenarioStandardGroup[];
	alternativeGroups: ScenarioAlternativeGroup[];
	keyPoints: string[];
}

export interface ScenarioStandardGroup {
	id: string;
	order: number;
	codes: string[];
	meaning: string;
	purpose: string;
	critical: boolean;
	duration: number;
}

export interface ScenarioAlternativeGroup {
	id: string;
	order: number;
	codes: string[][];
	meaning: string;
	equivalenceLevel: 'equivalent' | 'acceptable' | 'partial';
}

export interface UserScenarioGroup {
	id: string;
	order: number;
	flags: SignalFlag[];
	codes: string[];
	duration: number;
}

export interface ScenarioScoreBreakdown {
	legality: number;
	timing: number;
	matching: number;
	speed: number;
}

export interface ScenarioErrorDetail {
	groupOrder: number;
	groupCodes: string[];
	errorType: 'missing-critical' | 'wrong-flags' | 'wrong-order' | 'invalid-group' | 'unnecessary-group';
	errorMessage: string;
	correctCodes?: string[];
	correctMeaning?: string;
}

export interface ScenarioResult {
	id: string;
	timestamp: number;
	scenarioId: string;
	scenarioCategory: ScenarioCategory;
	totalScore: number;
	maxScore: number;
	scoreBreakdown: ScenarioScoreBreakdown;
	userGroups: UserScenarioGroup[];
	errors: ScenarioErrorDetail[];
	reactionTime: number;
	timeLimit: number;
	isTimeout: boolean;
	alternativeSuggestions: ScenarioAlternativeGroup[];
	sessionId?: string;
}

export interface ScenarioSession {
	id: string;
	startTime: number;
	endTime?: number;
	results: ScenarioResult[];
	categoryFilter?: ScenarioCategory | 'all';
}

export interface ScenarioAbilityRadar {
	category: ScenarioCategory;
	categoryLabel: string;
	legality: number;
	timing: number;
	matching: number;
	speed: number;
	overall: number;
	taskCount: number;
}

export interface ScenarioHistoryData {
	sessionNum: number;
	score: number;
	category: ScenarioCategory;
	timestamp: number;
}

export interface ScenarioStatistics {
	totalTasks: number;
	averageScore: number;
	categoryScores: Record<ScenarioCategory, number>;
	categoryTaskCounts: Record<ScenarioCategory, number>;
	abilityRadar: ScenarioAbilityRadar[];
	history: ScenarioHistoryData[];
	weakestCategory: ScenarioCategory | null;
	strongestCategory: ScenarioCategory | null;
}

