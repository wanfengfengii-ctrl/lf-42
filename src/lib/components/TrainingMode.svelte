<script lang="ts">
	import { FlagImage } from '$lib';
	import type { SignalGroup } from '$lib/types';
	import { training, currentTrainingSignal, generateValidatedSignal, statistics } from '$lib/stores/signalStore';
	import { generateId, analyzeSubstituteUsage, validateSignalGroup } from '$lib/utils/validation';
	import { Play, SkipForward, AlertTriangle, CheckCircle, XCircle, Clock, Trophy, Settings, Eye, EyeOff, CloudRain, Wind, Cloud, CloudFog, Zap, Sun, Lock, Unlock, ShieldAlert, Gauge, Flag } from 'lucide-svelte';

	const showAnswerStore = currentTrainingSignal.showAnswer;
	const userHasAnsweredStore = currentTrainingSignal.userHasAnswered;
	const startTimeStore = currentTrainingSignal.startTime;

	let difficulty = $state<'easy' | 'medium' | 'hard'>('medium');
	let timeLimit = $state(30);
	let weatherIntensity = $state(0);
	let remainingTime = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let isSessionActive = $state(false);
	let questionCount = $state(0);
	let maxQuestions = $state(10);
	let selectedAnswer = $state<string>('');
	let answerSubmitted = $state(false);
	let isBlindMode = $state(false);
	let showPeekWarning = $state(false);
	let sessionStartTime = $state<number>(0);
	let validateFlagRules = $state(true);
	let currentResult = $state<{
		isCorrect: boolean;
		isTimeout: boolean;
		isMisjudged: boolean;
		reactionTime: number;
		misjudgedFlagIds?: string[];
		userInputCodes?: string[];
		validationWarning?: string;
	} | null>(null);

	let timeLimitByDifficulty = $derived({
		easy: 45,
		medium: 30,
		hard: 15
	});

	let canStartTraining = $derived(!isSessionActive && ($training === null || $training.endTime !== undefined));

	let effectiveTimeLimit = $derived.by(() => {
		const base = timeLimitByDifficulty[difficulty];
		const multiplier = getDifficultyMultiplier(difficulty);
		let limit = Math.max(5, Math.round(base / multiplier));
		if (weatherIntensity > 40) {
			limit = Math.max(5, Math.round(limit * (1 + (weatherIntensity - 40) / 200)));
		}
		return limit;
	});

	function getWeatherLabel(i: number): string {
		if (i === 0) return '晴朗';
		if (i <= 20) return '微风';
		if (i <= 40) return '轻雾';
		if (i <= 60) return '强风';
		if (i <= 80) return '暴雨';
		return '台风';
	}

	function getWeatherIcon(i: number): typeof Sun {
		if (i === 0) return Sun;
		if (i <= 20) return Wind;
		if (i <= 40) return CloudFog;
		if (i <= 60) return Wind;
		if (i <= 80) return CloudRain;
		return Zap;
	}

	function getDifficultyMultiplier(d: 'easy' | 'medium' | 'hard'): number {
		switch (d) {
			case 'easy': return 1.0;
			case 'medium': return 1.3;
			case 'hard': return 1.8;
		}
	}

	function getWeatherDifficultyLabel(i: number): string {
		if (i === 0) return '无干扰';
		if (i <= 20) return '轻微遮挡';
		if (i <= 40) return '中度模糊';
		if (i <= 60) return '旗帜摆动';
		if (i <= 80) return '严重遮挡';
		return '极限识别';
	}

	function startTraining() {
		timeLimit = effectiveTimeLimit;
		training.startSession(difficulty, weatherIntensity, isBlindMode, maxQuestions);
		questionCount = 0;
		isSessionActive = true;
		sessionStartTime = Date.now();
		nextQuestion();
	}

	function nextQuestion() {
		if (questionCount >= maxQuestions) {
			endSession();
			return;
		}

		const signal = generateValidatedSignal(difficulty);
		currentTrainingSignal.setSignal(signal);
		remainingTime = timeLimit;
		selectedAnswer = '';
		answerSubmitted = false;
		currentResult = null;
		showPeekWarning = false;
		questionCount++;

		startTimer();
	}

	function startTimer() {
		if (timerInterval) clearInterval(timerInterval);

		timerInterval = setInterval(() => {
			if (remainingTime > 0) {
				remainingTime -= 0.1;
				if (remainingTime <= 0) {
					remainingTime = 0;
					handleTimeout();
				}
			}
		}, 100);
	}

	function pauseTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function analyzeMisjudgedFlags(userAnswer: string, signal: SignalGroup): string[] {
		const misjudged: string[] = [];
		const userLower = userAnswer.toLowerCase().trim();

		if (userLower.length === 0) return misjudged;

		signal.flags.forEach(sf => {
			const flagCode = sf.flag.code.toLowerCase();
			const flagName = sf.flag.name.toLowerCase();
			const flagMeaning = sf.flag.meaning.toLowerCase();

			const hasExactMatch = userLower.includes(flagCode) ||
				userLower.includes(flagName) ||
				userAnswer.split(/[\s，。、；：]+/).some(
					kw => kw.length >= 2 && flagMeaning.includes(kw.toLowerCase())
				);
			if (!hasExactMatch) {
				misjudged.push(sf.flag.id);
			}
		});

		return misjudged;
	}

	function extractUserInputCodes(userAnswer: string): string[] {
		const codes: string[] = [];
		const codePattern = /\b([A-Z]{1,2}|[0-9]|S[1-4])\b/g;
		const matches = userAnswer.toUpperCase().match(codePattern);
		if (matches) {
			matches.forEach(m => codes.push(m));
		}
		return codes;
	}

	function handleTimeout() {
		pauseTimer();

		if (!$currentTrainingSignal) return;

		currentResult = {
			isCorrect: false,
			isTimeout: true,
			isMisjudged: false,
			reactionTime: timeLimit
		};

		answerSubmitted = true;
		currentTrainingSignal.markAnswered();
		currentTrainingSignal.revealAnswer();
		saveResult(true);
	}

	function submitAnswer() {
		if (answerSubmitted || !$currentTrainingSignal) return;

		pauseTimer();
		answerSubmitted = true;
		currentTrainingSignal.markAnswered();

		const signal = $currentTrainingSignal;
		const userAnswer = selectedAnswer.trim();
		const correctAnswer = signal.meaning;
		const reactionTime = timeLimit - remainingTime;

		const isCorrect = checkAnswer(userAnswer, correctAnswer, signal);
		const isMisjudged = !isCorrect && userAnswer.length > 0;
		const misjudgedFlagIds = isMisjudged ? analyzeMisjudgedFlags(userAnswer, signal) : [];
		const userInputCodes = extractUserInputCodes(userAnswer);

		let validationWarning: string | undefined;
		if (validateFlagRules && userInputCodes.length > 0) {
			const groupValidation = validateSignalGroup(signal);
			if (!groupValidation.valid) {
				validationWarning = groupValidation.message;
			}
		}

		currentResult = {
			isCorrect,
			isTimeout: false,
			isMisjudged,
			reactionTime,
			misjudgedFlagIds,
			userInputCodes,
			validationWarning
		};

		currentTrainingSignal.revealAnswer();
		saveResult(false);
	}

	function checkAnswer(userAnswer: string, correctAnswer: string, signal: SignalGroup): boolean {
		const normalizedUser = userAnswer.toLowerCase().replace(/\s+/g, '');
		const normalizedCorrect = correctAnswer.toLowerCase().replace(/\s+/g, '');

		if (normalizedUser === normalizedCorrect) return true;

		if (normalizedCorrect.includes(normalizedUser) && normalizedUser.length > 5) return true;

		const keywords = correctAnswer.split(/[，。、\\s]+/).filter(k => k.length >= 2);
		const matchedKeywords = keywords.filter(k =>
			userAnswer.toLowerCase().includes(k.toLowerCase())
		);
		if (matchedKeywords.length >= keywords.length * 0.7 && keywords.length >= 2) return true;

		const subAnalysis = analyzeSubstituteUsage(signal.flags);
		const codes = subAnalysis.expandedCodes || signal.flags.map(f => f.flag.code);
		const userCodes = extractUserInputCodes(userAnswer);

		if (userCodes.length > 0 && codes.length > 0) {
			const upperCodes = codes.map(c => c.toUpperCase());
			const upperUser = userCodes.map(c => c.toUpperCase());

			const normalizedUserCodes = upperUser.map(c => {
				if (/^S[1-4]$/.test(c)) {
					const idx = parseInt(c.charAt(1)) - 1;
					return upperCodes[idx] || c;
				}
				return c;
			});

			if (normalizedUserCodes.length === upperCodes.length &&
				normalizedUserCodes.every((c, i) => c === upperCodes[i])) {
				return true;
			}
		}

		return false;
	}

	function saveResult(isTimeout: boolean) {
		if (!$currentTrainingSignal || !$training || !currentResult) return;

		const result = {
			id: generateId(),
			timestamp: Date.now(),
			signal: $currentTrainingSignal,
			userAnswer: selectedAnswer,
			correctAnswer: $currentTrainingSignal.meaning,
			isCorrect: currentResult.isCorrect,
			isTimeout: currentResult.isTimeout,
			isMisjudged: currentResult.isMisjudged,
			reactionTime: currentResult.reactionTime,
			timeLimit,
			misjudgedFlagIds: currentResult.misjudgedFlagIds,
			userInputCodes: currentResult.userInputCodes,
			weatherIntensity,
			isBlindMode,
			sessionId: $training?.id
		};

		training.addResult(result);
	}

	function continueToNext() {
		nextQuestion();
	}

	function endSession() {
		pauseTimer();
		isSessionActive = false;
		training.endSession();
		currentTrainingSignal.clear();
	}

	function skipQuestion() {
		if (answerSubmitted) return;

		pauseTimer();
		answerSubmitted = true;

		currentResult = {
			isCorrect: false,
			isTimeout: false,
			isMisjudged: true,
			reactionTime: timeLimit - remainingTime
		};

		currentTrainingSignal.markAnswered();
		currentTrainingSignal.revealAnswer();
		saveResult(false);
	}

	function triggerPeekWarning() {
		if (isBlindMode && !answerSubmitted) {
			showPeekWarning = true;
			setTimeout(() => showPeekWarning = false, 2000);
		}
	}

	function getTimeColor(): string {
		if (remainingTime > timeLimit * 0.5) return 'text-success-500';
		if (remainingTime > timeLimit * 0.25) return 'text-warning-500';
		return 'text-error-500';
	}

	function getResultStatusClass(): string {
		if (!currentResult) return '';
		if (currentResult.isTimeout) return 'bg-warning-500/20 border-warning-500';
		if (currentResult.isCorrect) return 'bg-success-500/20 border-success-500';
		return 'bg-error-500/20 border-error-500';
	}

	function getResultCategoryLabel(): string {
		if (!currentResult) return '';
		if (currentResult.isTimeout) return '⏰ 超时';
		if (currentResult.isCorrect) return '✅ 完全正确';
		return '❌ 误判';
	}

	$effect(() => {
		return () => {
			if (timerInterval) clearInterval(timerInterval);
		};
	});
</script>

<div class="space-y-6">
	{#if !isSessionActive}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center gap-3 mb-6">
				<Trophy class="w-8 h-8 text-primary-500" />
				<h2 class="text-2xl font-bold text-surface-900-100-token">标准化海上旗语训练升级版</h2>
			</div>

			<div class="grid md:grid-cols-2 gap-6 mb-8">
				<div class="space-y-3">
					<label class="flex items-center gap-2 text-sm font-medium text-surface-700-300-token">
						<Settings class="w-4 h-4" />
						难度等级
					</label>
					<div class="flex gap-2">
						{#each (['easy', 'medium', 'hard'] as const) as d}
							<button
								onclick={() => difficulty = d}
								class="flex-1 px-4 py-2 rounded-lg font-medium transition-all {difficulty === d ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
							>
								{d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
							</button>
						{/each}
					</div>
					<p class="text-xs text-surface-500">
						{difficulty === 'easy' ? `单旗识别，${timeLimitByDifficulty.easy}秒答题时间` :
						 difficulty === 'medium' ? `1-2面旗帜，${timeLimitByDifficulty.medium}秒答题时间` :
						 `2-3面旗帜，${timeLimitByDifficulty.hard}秒答题时间`}
					</p>
				</div>

				<div class="space-y-3">
					<label class="flex items-center gap-2 text-sm font-medium text-surface-700-300-token">
						<Gauge class="w-4 h-4" />
						天气干扰强度（0-100%）
					</label>
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							{#each [getWeatherIcon(weatherIntensity)] as WeatherIcon}
								<WeatherIcon class="w-5 h-5 text-surface-500 flex-shrink-0" />
							{/each}
							<input
								type="range"
								bind:value={weatherIntensity}
								min="0"
								max="100"
								step="1"
								class="flex-1 w-full accent-primary-500"
							/>
							<span class="text-sm font-semibold text-primary-500 w-8 text-right">{weatherIntensity}%</span>
						</div>
						<div class="flex justify-between px-2">
							<span class="text-[10px] text-surface-500">晴朗</span>
							<span class="text-[10px] text-surface-500">轻雾</span>
							<span class="text-[10px] text-surface-500">强风</span>
							<span class="text-[10px] text-surface-500">暴雨</span>
							<span class="text-[10px] text-surface-500">台风</span>
						</div>
						<p class="text-xs text-surface-500">
							当前：{getWeatherLabel(weatherIntensity)} - {getWeatherDifficultyLabel(weatherIntensity)}
							{weatherIntensity > 40 ? '，答题时间已自动延长' : ''}
						</p>
					</div>
				</div>

				<div class="space-y-3">
					<label class="flex items-center gap-2 text-sm font-medium text-surface-700-300-token">
						<Trophy class="w-4 h-4" />
						题目数量
					</label>
					<input
						type="number"
						bind:value={maxQuestions}
						min="5"
						max="50"
						step="5"
						class="w-full px-4 py-2 rounded-lg border border-surface-300-600-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
					<p class="text-xs text-surface-500">本次训练共 {maxQuestions} 道题</p>
				</div>

				<div class="space-y-3">
					<label class="flex items-center gap-2 text-sm font-medium text-surface-700-300-token">
						{#if isBlindMode}
							<Lock class="w-4 h-4 text-error-500" />
						{:else}
							<Eye class="w-4 h-4" />
						{/if}
						答题模式
					</label>
					<div class="flex gap-2 h-[42px]">
						<button
							onclick={() => isBlindMode = false}
							class="flex-1 px-4 py-2 rounded-lg font-medium transition-all {!isBlindMode ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
						>
							普通模式
						</button>
						<button
							onclick={() => isBlindMode = true}
							class="flex-1 px-4 py-2 rounded-lg font-medium transition-all {isBlindMode ? 'bg-error-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
						>
							完全盲答
						</button>
					</div>
					<div class="p-3 rounded-lg border {isBlindMode ? 'bg-error-500/10 border-error-500/30' : 'bg-surface-50-900-token border-surface-200-700-token'}">
						{#if isBlindMode}
							<div class="flex items-start gap-2">
								<ShieldAlert class="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
								<div>
									<p class="text-xs font-bold text-error-600">盲答模式已启用</p>
									<p class="text-[11px] text-surface-600 mt-1 leading-relaxed">
										训练开始后：
										<br />
										• 旗帜代码、名称、含义完全隐藏
										<br />
										• 提交答案或超时前无法查看正确答案
										<br />
										• 无任何提示，完全靠记忆作答
										<br />
										• 右键/长按无法查看答案
									</p>
								</div>
							</div>
						{:else}
							<p class="text-xs text-surface-500">普通模式：可随时查看旗帜代码，提交后显示答案</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
				<div class="flex items-center gap-2 mb-2">
					<Flag class="w-4 h-4 text-primary-500" />
					<h4 class="font-semibold text-primary-600-400-token text-sm">国际旗语规则校验</h4>
				</div>
				<div class="flex items-center gap-3">
					<button
						onclick={() => validateFlagRules = !validateFlagRules}
						class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all {validateFlagRules ? 'bg-success-500 text-white' : 'bg-surface-200-700-token text-surface-600-400-token'}"
					>
						{#if validateFlagRules}<CheckCircle class="w-3.5 h-3.5" />{:else}<XCircle class="w-3.5 h-3.5" />{/if}
						{validateFlagRules ? '已启用规则校验' : '未启用规则校验'}
					</button>
					<p class="text-xs text-surface-500">
						启用后将按国际信号规则校验合法旗组与代旗用法，仅生成合规信号
					</p>
				</div>
			</div>

			{#if $training && $training.endTime}
				<div class="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
					<h4 class="font-semibold text-primary-600-400-token mb-2">上一次训练成绩</h4>
					<div class="grid grid-cols-4 gap-4 text-center">
						<div>
							<div class="text-2xl font-bold text-surface-900-100-token">{$statistics.correctAnswers}/{$statistics.totalQuestions}</div>
							<div class="text-xs text-surface-500">正确/总数</div>
						</div>
						<div>
							<div class="text-2xl font-bold text-success-500">
								{$statistics.totalQuestions > 0 ? Math.round(($statistics.correctAnswers / $statistics.totalQuestions) * 100) : 0}%
							</div>
							<div class="text-xs text-surface-500">正确率</div>
						</div>
						<div>
							<div class="text-2xl font-bold text-warning-500">{$statistics.timeoutAnswers}</div>
							<div class="text-xs text-surface-500">超时</div>
						</div>
						<div>
							<div class="text-2xl font-bold text-error-500">{$statistics.misjudgedAnswers}</div>
							<div class="text-xs text-surface-500">误判</div>
						</div>
					</div>
				</div>
			{/if}

			<button
				onclick={startTraining}
				disabled={!canStartTraining}
				class="w-full flex items-center justify-center gap-3 px-8 py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
			>
				<Play class="w-6 h-6" />
				{isBlindMode ? '开始盲答训练' : '开始训练'}
			</button>
		</div>
	{:else}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-6 flex-wrap gap-4">
				<div class="flex items-center gap-3 flex-wrap">
					<span class="px-3 py-1 bg-primary-100-800-token text-primary-700-300-token font-semibold rounded-full text-sm">
						第 {questionCount}/{maxQuestions} 题
					</span>
					<span class="px-3 py-1 bg-surface-200-700-token text-surface-700-300-token font-semibold rounded-full text-sm">
						{difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}
					</span>
					<span class="px-3 py-1 bg-warning-100-800-token text-warning-700-300-token font-semibold rounded-full text-sm flex items-center gap-1">
						{#each [getWeatherIcon(weatherIntensity)] as WeatherIcon}
							<WeatherIcon class="w-3 h-3" />
						{/each}
						{getWeatherLabel(weatherIntensity)}
					</span>
					{#if isBlindMode}
						<span class="px-3 py-1 bg-error-500/20 text-error-600 font-bold rounded-full text-sm flex items-center gap-1 animate-pulse">
							<Lock class="w-3 h-3" />
							盲答模式
						</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<Clock class="w-5 h-5 {getTimeColor()}" />
					<span class="text-2xl font-mono font-bold {getTimeColor()}">
						{remainingTime.toFixed(1)}s
					</span>
				</div>
			</div>

			{#if showPeekWarning}
				<div class="mb-4 p-3 bg-error-500/20 border border-error-500/50 rounded-lg flex items-center gap-2 animate-pulse">
					<ShieldAlert class="w-5 h-5 text-error-500" />
					<span class="font-bold text-error-600">盲答模式中禁止查看答案！请独立作答</span>
				</div>
			{/if}

			{#if $currentTrainingSignal}
				<div class="mb-6 p-8 bg-gradient-to-br from-surface-50-900-token to-surface-100-800-token rounded-xl border border-surface-200-700-token relative overflow-hidden">
					{#if weatherIntensity > 60}
						<div class="absolute inset-0 bg-surface-300-600-token/20 pointer-events-none"></div>
					{/if}

					{#if isBlindMode && !answerSubmitted}
						<div class="absolute inset-0 z-20" role="presentation" oncontextmenu={(e) => { e.preventDefault(); triggerPeekWarning(); }}>
							<div class="absolute inset-0 bg-surface-900-100-token/5 backdrop-blur-[2px] rounded-xl"></div>
							<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div class="bg-surface-50-900-token/95 backdrop-blur-md rounded-2xl p-6 text-center border border-surface-200-700-token shadow-2xl max-w-md">
									<Lock class="w-12 h-12 text-error-500 mx-auto mb-3" />
									<h3 class="text-xl font-bold text-surface-900-100-token mb-2">盲答模式</h3>
									<p class="text-sm text-surface-600-400-token leading-relaxed">
										旗帜代码与答案提示已隐藏
										<br />
										请仔细观察旗帜图案
										<br />
										<span class="text-xs text-error-600 font-semibold">提交答案或超时后才可查看</span>
									</p>
								</div>
							</div>
						</div>
					{/if}

					<div class="flex items-center justify-center gap-6 min-h-48 relative z-10">
						{#each $currentTrainingSignal.flags as sf, i (sf.flag.id + i)}
							<div class="flex flex-col items-center gap-2">
								<div
									role="presentation"
									class={isBlindMode && !answerSubmitted ? 'cursor-not-allowed select-none' : ''}
									oncontextmenu={(e) => {
										if (isBlindMode && !answerSubmitted) {
											e.preventDefault();
											triggerPeekWarning();
										}
									}}
								>
									<FlagImage
										flag={sf.flag}
										size={120}
										animated={true}
										weatherIntensity={weatherIntensity}
									/>
								</div>
								{#if !isBlindMode}
									<div class="mt-2 px-3 py-1 bg-surface-200-700-token rounded-lg">
										<span class="text-sm font-mono text-surface-500">{sf.flag.code}</span>
									</div>
								{:else if answerSubmitted}
									<div class="mt-2 px-3 py-1 bg-primary-500/20 rounded-lg">
										<span class="text-sm font-mono font-bold text-primary-600-400-token">{sf.flag.code}</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="mb-6">
					<label for="answer-input" class="block text-sm font-medium text-surface-700-300-token mb-2">
						请输入信号含义 {isBlindMode && !answerSubmitted ? '（盲答模式：仅根据旗帜识别）' : ''}
					</label>
					<textarea
						id="answer-input"
						bind:value={selectedAnswer}
						disabled={answerSubmitted}
						placeholder={isBlindMode
							? "请根据你观察到的旗帜，输入信号含义或旗帜代码组合..."
							: "请输入你识别到的信号含义..."}
						class="w-full px-4 py-3 rounded-lg border border-surface-300-600-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-500 disabled:cursor-not-allowed resize-none"
						rows={3}
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								if (!answerSubmitted) submitAnswer();
							}
						}}
					></textarea>
					{#if isBlindMode && !answerSubmitted}
						<p class="mt-2 text-[11px] text-error-600 flex items-center gap-1">
							<Lock class="w-3 h-3" />
							提示：可以输入旗帜代码组合（如 A B C）或信号含义描述
						</p>
					{/if}
				</div>

				{#if answerSubmitted && currentResult}
					<div class="mb-6 p-4 rounded-lg border-2 {getResultStatusClass()}">
						<div class="flex items-start gap-3">
							{#if currentResult.isTimeout}
								<AlertTriangle class="w-6 h-6 text-warning-500 flex-shrink-0" />
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-1">
										<h4 class="font-bold text-warning-600">超时未作答</h4>
										<span class="px-2 py-0.5 bg-warning-500/20 text-warning-600 text-[10px] font-bold rounded-full">
											超时
										</span>
									</div>
									<p class="text-sm text-surface-600-400-token">已超过 {timeLimit} 秒答题时间</p>
								</div>
							{:else if currentResult.isCorrect}
								<CheckCircle class="w-6 h-6 text-success-500 flex-shrink-0" />
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-1">
										<h4 class="font-bold text-success-600">回答正确！</h4>
										<span class="px-2 py-0.5 bg-success-500/20 text-success-600 text-[10px] font-bold rounded-full">
											完全正确
										</span>
									</div>
									<p class="text-sm text-surface-600-400-token">用时 {currentResult.reactionTime.toFixed(2)} 秒</p>
								</div>
							{:else}
								<XCircle class="w-6 h-6 text-error-500 flex-shrink-0" />
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-1">
										<h4 class="font-bold text-error-600">回答错误</h4>
										<span class="px-2 py-0.5 bg-error-500/20 text-error-600 text-[10px] font-bold rounded-full">
											误判
										</span>
									</div>
									<p class="text-sm text-surface-600-400-token">用时 {currentResult.reactionTime.toFixed(2)} 秒</p>
								</div>
							{/if}
						</div>

						<div class="mt-4 pt-4 border-t border-surface-300-600-token/30 space-y-3">
							<div class="flex items-center gap-2">
								{#if isBlindMode}<Unlock class="w-4 h-4 text-primary-500" />{:else}<Eye class="w-4 h-4 text-primary-500" />{/if}
								<span class="text-xs font-semibold text-primary-500 uppercase tracking-wide">答案揭晓</span>
								<span class="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full {currentResult.isTimeout ? 'bg-warning-500 text-white' : currentResult.isCorrect ? 'bg-success-500 text-white' : 'bg-error-500 text-white'}">
									{getResultCategoryLabel()}
								</span>
							</div>
							<div class="p-3 bg-primary-500/10 rounded-lg">
								<div class="flex items-center gap-2 mb-2 flex-wrap">
									<span class="px-2 py-0.5 bg-primary-500/30 text-primary-700-300-token text-xs font-semibold rounded">
										旗帜代码
									</span>
									<span class="font-mono text-sm font-bold text-surface-900-100-token">
										{$currentTrainingSignal.flags.map(f => f.flag.code).join(' · ')}
									</span>
									<span class="px-2 py-0.5 bg-surface-200-700-token text-surface-600-400-token text-xs font-semibold rounded">
										展开
									</span>
									<span class="font-mono text-sm text-surface-700-300-token">
										{(() => {
											const sub = analyzeSubstituteUsage($currentTrainingSignal.flags);
											return (sub.expandedCodes || []).join(' · ');
										})()}
									</span>
								</div>
								<div class="space-y-1 mt-3">
									<p class="text-xs text-surface-500">信号含义：</p>
									<p class="font-medium text-surface-900-100-token leading-relaxed">{$currentTrainingSignal.meaning}</p>
								</div>
								{#if currentResult.isMisjudged && !currentResult.isTimeout}
									<div class="mt-3 pt-3 border-t border-error-500/20">
										<p class="text-xs text-surface-500 mb-1">你的答案：</p>
										<p class="font-medium text-error-600">{selectedAnswer || '（未作答）'}</p>
										{#if currentResult.misjudgedFlagIds && currentResult.misjudgedFlagIds.length > 0}
											<div class="mt-2 pt-2">
												<p class="text-[10px] font-semibold text-error-500 uppercase tracking-wide mb-1">误判旗帜：</p>
												<div class="flex flex-wrap gap-1">
													{#each currentResult.misjudgedFlagIds as fid (fid)}
														{@const flag = $currentTrainingSignal?.flags.find(f => f.flag.id === fid)?.flag}
														{#if flag}
															<span class="px-2 py-0.5 bg-error-500/20 border border-error-500/40 text-error-600 text-[10px] font-bold rounded">
																{flag.code} - {flag.name}
															</span>
														{/if}
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/if}
								{#if currentResult.validationWarning}
									<div class="mt-3 pt-3 border-t border-warning-500/20">
										<p class="text-[10px] font-semibold text-warning-500 uppercase tracking-wide mb-1">规则提示：</p>
										<p class="text-xs text-warning-600">{currentResult.validationWarning}</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<div class="flex items-center justify-between">
					<div class="flex gap-2">
						{#if !answerSubmitted}
							<button
								onclick={skipQuestion}
								class="flex items-center gap-2 px-4 py-2 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
							>
								<SkipForward class="w-4 h-4" />
								跳过
							</button>
						{/if}
					</div>

					<div class="flex gap-3">
						{#if !answerSubmitted}
							<button
								onclick={submitAnswer}
								disabled={selectedAnswer.trim().length === 0}
								class="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
							>
								<CheckCircle class="w-4 h-4" />
								提交答案
							</button>
						{:else}
							<button
								onclick={continueToNext}
								class="flex items-center gap-2 px-6 py-2 bg-success-500 hover:bg-success-600 text-white rounded-lg transition-colors font-medium"
							>
								{questionCount >= maxQuestions ? '查看完整成绩' : '下一题'}
								<SkipForward class="w-4 h-4" />
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<div class="bg-surface-100-800-token rounded-xl p-4 shadow-lg">
			<div class="grid grid-cols-4 gap-4 text-center">
				<div>
					<div class="text-2xl font-bold text-surface-900-100-token">{$statistics.correctAnswers}</div>
					<div class="text-xs text-success-500 font-medium">正确</div>
				</div>
				<div>
					<div class="text-2xl font-bold text-error-500">{$statistics.misjudgedAnswers}</div>
					<div class="text-xs text-error-500 font-medium">误判</div>
				</div>
				<div>
					<div class="text-2xl font-bold text-warning-500">{$statistics.timeoutAnswers}</div>
					<div class="text-xs text-warning-500 font-medium">超时</div>
				</div>
				<div>
					<div class="text-2xl font-bold text-primary-500">
						{$statistics.totalQuestions > 0 ? Math.round(($statistics.correctAnswers / $statistics.totalQuestions) * 100) : 0}%
					</div>
					<div class="text-xs text-primary-500 font-medium">正确率</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.blind-flag-wrapper {
		filter: contrast(1.05);
	}
</style>
