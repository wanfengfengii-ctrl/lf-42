<script lang="ts">
	import { FlagImage } from '$lib';
	import type { SignalGroup } from '$lib/types';
	import { training, currentTrainingSignal, generateRandomSignal, statistics } from '$lib/stores/signalStore';
	import { generateId } from '$lib/utils/validation';
	import { Play, SkipForward, AlertTriangle, CheckCircle, XCircle, Clock, Trophy, Settings, Eye, CloudRain, Wind, Cloud, CloudFog, Zap, Sun } from 'lucide-svelte';

	const showAnswerStore = currentTrainingSignal.showAnswer;
	const userHasAnsweredStore = currentTrainingSignal.userHasAnswered;

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
	let currentResult = $state<{
		isCorrect: boolean;
		isTimeout: boolean;
		isMisjudged: boolean;
		reactionTime: number;
	} | null>(null);

	let timeLimitByDifficulty = $derived({
		easy: 45,
		medium: 30,
		hard: 15
	});

	let canStartTraining = $derived(!isSessionActive && ($training === null || $training.endTime !== undefined));

	function getWeatherLabel(i: number): string {
		if (i === 0) return '晴朗';
		if (i <= 20) return '微风';
		if (i <= 40) return '轻浪';
		if (i <= 60) return '强风';
		if (i <= 80) return '暴雨';
		return '台风';
	}

	function getWeatherIcon(i: number): typeof Sun {
		if (i === 0) return Sun;
		if (i <= 20) return Wind;
		if (i <= 40) return Cloud;
		if (i <= 60) return Wind;
		if (i <= 80) return CloudRain;
		return Zap;
	}

	function startTraining() {
		training.startSession(difficulty);
		timeLimit = timeLimitByDifficulty[difficulty];
		questionCount = 0;
		isSessionActive = true;
		nextQuestion();
	}

	function nextQuestion() {
		if (questionCount >= maxQuestions) {
			endSession();
			return;
		}

		const signal = generateRandomSignal(difficulty);
		currentTrainingSignal.setSignal(signal);
		remainingTime = timeLimit;
		selectedAnswer = '';
		answerSubmitted = false;
		currentResult = null;
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

		const isCorrect = checkAnswer(userAnswer, correctAnswer);
		const isMisjudged = !isCorrect && userAnswer.length > 0;

		currentResult = {
			isCorrect,
			isTimeout: false,
			isMisjudged,
			reactionTime
		};

		currentTrainingSignal.revealAnswer();
		saveResult(false);
	}

	function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
		const normalizedUser = userAnswer.toLowerCase().replace(/\s+/g, '');
		const normalizedCorrect = correctAnswer.toLowerCase().replace(/\s+/g, '');

		if (normalizedUser === normalizedCorrect) return true;

		if (normalizedCorrect.includes(normalizedUser) && normalizedUser.length > 5) return true;

		const keywords = correctAnswer.split(/[，。、\\s]+/).filter(k => k.length >= 2);
		const matchedKeywords = keywords.filter(k => 
			userAnswer.toLowerCase().includes(k.toLowerCase())
		);
		if (matchedKeywords.length >= keywords.length * 0.7 && keywords.length >= 2) return true;

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
			timeLimit
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
				<h2 class="text-2xl font-bold text-surface-900-100-token">训练模式</h2>
			</div>

			<div class="grid md:grid-cols-3 gap-6 mb-8">
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
						{difficulty === 'easy' ? '单旗识别，45秒答题时间' : 
						 difficulty === 'medium' ? '1-2面旗帜，30秒答题时间' : 
						 '2-3面旗帜，15秒答题时间'}
					</p>
				</div>

				<div class="space-y-3">
					<label class="flex items-center gap-2 text-sm font-medium text-surface-700-300-token">
						<CloudRain class="w-4 h-4" />
						天气干扰强度
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
							<span class="text-[10px] text-surface-500">微风</span>
							<span class="text-[10px] text-surface-500">强风</span>
							<span class="text-[10px] text-surface-500">暴雨</span>
							<span class="text-[10px] text-surface-500">台风</span>
						</div>
						<p class="text-xs text-surface-500">
							当前：{getWeatherLabel(weatherIntensity)} - 强度 {weatherIntensity}%，干扰越旗帜越难识别
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
				开始训练
			</button>
		</div>
	{:else}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-3">
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
				</div>
				<div class="flex items-center gap-2">
					<Clock class="w-5 h-5 {getTimeColor()}" />
					<span class="text-2xl font-mono font-bold {getTimeColor()}">
						{remainingTime.toFixed(1)}s
					</span>
				</div>
			</div>

			{#if $currentTrainingSignal}
				<div class="mb-6 p-8 bg-gradient-to-br from-surface-50-900-token to-surface-100-800-token rounded-xl border border-surface-200-700-token relative overflow-hidden">
					{#if weatherIntensity > 60}
						<div class="absolute inset-0 bg-surface-300-600-token/20 pointer-events-none"></div>
					{/if}
					<div class="flex items-center justify-center gap-6 min-h-48 relative z-10">
						{#each $currentTrainingSignal.flags as sf, i (sf.flag.id + i)}
							<div class="flex flex-col items-center gap-2">
								<FlagImage flag={sf.flag} size={120} animated={true} weatherIntensity={weatherIntensity} />
								{#if $showAnswerStore}
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
						请输入信号含义：
					</label>
					<textarea
						id="answer-input"
						bind:value={selectedAnswer}
						disabled={answerSubmitted}
						placeholder="请输入你识别到的信号含义..."
						class="w-full px-4 py-3 rounded-lg border border-surface-300-600-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
						rows={3}
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								if (!answerSubmitted) submitAnswer();
							}
						}}
					></textarea>
				</div>

				{#if answerSubmitted && currentResult}
					<div class={`mb-6 p-4 rounded-lg border-2 ${getResultStatusClass()}`}>
						<div class="flex items-start gap-3">
							{#if currentResult.isTimeout}
								<AlertTriangle class="w-6 h-6 text-warning-500 flex-shrink-0" />
								<div class="flex-1">
									<h4 class="font-bold text-warning-600 mb-1">⏰ 超时未作答</h4>
									<p class="text-sm text-surface-600-400-token">已超过 {timeLimit} 秒答题时间</p>
								</div>
							{:else if currentResult.isCorrect}
								<CheckCircle class="w-6 h-6 text-success-500 flex-shrink-0" />
								<div class="flex-1">
									<h4 class="font-bold text-success-600 mb-1">🎉 回答正确！</h4>
									<p class="text-sm text-surface-600-400-token">用时 {currentResult.reactionTime.toFixed(2)} 秒</p>
								</div>
							{:else}
								<XCircle class="w-6 h-6 text-error-500 flex-shrink-0" />
								<div class="flex-1">
									<h4 class="font-bold text-error-600 mb-1">❌ 回答错误</h4>
									<p class="text-sm text-surface-600-400-token">用时 {currentResult.reactionTime.toFixed(2)} 秒</p>
								</div>
							{/if}
						</div>

						<div class="mt-4 pt-4 border-t border-surface-300-600-token/30 space-y-2">
							<div class="flex items-center gap-2">
								<Eye class="w-4 h-4 text-primary-500" />
								<span class="text-xs font-semibold text-primary-500 uppercase tracking-wide">答案揭晓</span>
							</div>
							<div class="p-3 bg-primary-500/10 rounded-lg">
								<div class="flex items-center gap-2 mb-2">
									<span class="px-2 py-0.5 bg-primary-500/30 text-primary-700-300-token text-xs font-semibold rounded">
										旗帜代码
									</span>
									<span class="font-mono text-sm font-bold text-surface-900-100-token">
										{$currentTrainingSignal.flags.map(f => f.flag.code).join(' · ')}
									</span>
								</div>
								<div class="space-y-1">
									<p class="text-xs text-surface-500">信号含义：</p>
									<p class="font-medium text-surface-900-100-token leading-relaxed">{$currentTrainingSignal.meaning}</p>
								</div>
								{#if currentResult.isMisjudged && !currentResult.isTimeout}
									<div class="mt-3 pt-3 border-t border-error-500/20">
										<p class="text-xs text-surface-500 mb-1">你的答案：</p>
										<p class="font-medium text-error-600">{selectedAnswer || '（未作答）'}</p>
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
								class="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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
					<div class="text-xs text-success-500 font-medium">✅ 正确</div>
				</div>
				<div>
					<div class="text-2xl font-bold text-error-500">{$statistics.misjudgedAnswers}</div>
					<div class="text-xs text-error-500 font-medium">❌ 误判</div>
				</div>
				<div>
					<div class="text-2xl font-bold text-warning-500">{$statistics.timeoutAnswers}</div>
					<div class="text-xs text-warning-500 font-medium">⏰ 超时</div>
				</div>
				<div>
					<div class="text-2xl font-bold text-primary-500">
						{$statistics.totalQuestions > 0 ? Math.round(($statistics.correctAnswers / $statistics.totalQuestions) * 100) : 0}%
					</div>
					<div class="text-xs text-primary-500 font-medium">📊 正确率</div>
				</div>
			</div>
		</div>
	{/if}
</div>
