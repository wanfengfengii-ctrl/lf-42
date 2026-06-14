<script lang="ts">
	import { FlagImage } from '$lib';
	import { signalGroups, player } from '$lib/stores/signalStore';
	import type { SignalFlag, WeatherCondition } from '$lib/types';
	import { Play, Pause, Square, FastForward, Cloud, Wind, CloudRain, CloudFog } from 'lucide-svelte';

	let { flagSize = 120 }: { flagSize?: number } = $props();

	let playbackSpeed = $state(1);
	let flagContainers = $state<(HTMLDivElement | null)[]>([]);
	let raiseAnimations = $state<(Animation | null)[]>([]);
	let swingAnimations = $state<(Animation | null)[]>([]);
	let lowerAnimations = $state<(Animation | null)[]>([]);

	let savedRaiseTimes = $state<(number | null)[]>([]);
	let savedSwingTimes = $state<(number | null)[]>([]);
	let savedLowerTimes = $state<(number | null)[]>([]);

	let elapsedTime = $state(0);
	let animationFrameId = $state<number | null>(null);
	let lastTimestamp = $state<number | null>(null);
	let activeFlagIndex = $state<number | null>(null);

	type FlagPlayState = 'idle' | 'raising' | 'holding' | 'lowering' | 'done';
	let flagStates = $state<FlagPlayState[]>([]);
	let holdRemainingTime = $state<number>(0);
	let holdStartTime = $state<number>(0);

	const speeds = [0.5, 1, 1.5, 2];
	const weatherConditions: WeatherCondition[] = ['calm', 'moderate', 'storm', 'fog'];
	const weatherLabels: Record<WeatherCondition, string> = {
		calm: '平静',
		moderate: '微风',
		storm: '暴风雨',
		fog: '大雾'
	};

	const weatherIcons: Record<WeatherCondition, typeof Cloud> = {
		calm: Cloud,
		moderate: Wind,
		storm: CloudRain,
		fog: CloudFog
	};

	const RAISE_DURATION = 800;
	const LOWER_DURATION = 600;

	const totalDuration = $derived(
		$signalGroups.reduce((total, group) => {
			return total + group.flags.reduce((groupTotal, sf) => groupTotal + sf.duration, 0);
		}, 0)
	);

	const currentGroup = $derived(
		$signalGroups[$player.currentGroupIndex] || null
	);

	const currentFlag = $derived(
		currentGroup?.flags[$player.currentFlagIndex] || null
	);

	const remainingTime = $derived(
		Math.max(0, totalDuration - elapsedTime)
	);

	const formattedRemainingTime = $derived(
		formatTime(remainingTime)
	);

	const formattedElapsedTime = $derived(
		formatTime(elapsedTime)
	);

	const progressPercent = $derived(
		totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0
	);

	const hasContent = $derived(
		$signalGroups.length > 0
	);

	const allActiveFlags = $derived(
		$signalGroups.flatMap(group => group.flags)
	);

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function initStates() {
		const count = allActiveFlags.length;
		flagStates = Array(count).fill('idle');
		raiseAnimations = Array(count).fill(null);
		swingAnimations = Array(count).fill(null);
		lowerAnimations = Array(count).fill(null);
		savedRaiseTimes = Array(count).fill(null);
		savedSwingTimes = Array(count).fill(null);
		savedLowerTimes = Array(count).fill(null);
	}

	function createRaiseAnimation(element: HTMLElement): Animation {
		const keyframes = [
			{ transform: 'translateY(100%)', opacity: 0 },
			{ transform: 'translateY(0)', opacity: 1 }
		];
		const options = {
			duration: RAISE_DURATION,
			easing: 'ease-out',
			fill: 'forwards' as FillMode
		};
		return element.animate(keyframes, options);
	}

	function createSwingAnimation(element: HTMLElement, weather: WeatherCondition): Animation {
		const swingAmount = weather === 'storm' ? 8 : weather === 'moderate' ? 3 : 0;
		const duration = weather === 'storm' ? 800 : weather === 'moderate' ? 2000 : 3000;
		
		const keyframes = swingAmount > 0
			? [
				{ transform: 'rotate(0deg)' },
				{ transform: `rotate(${swingAmount}deg)` },
				{ transform: 'rotate(0deg)' },
				{ transform: `rotate(${-swingAmount}deg)` },
				{ transform: 'rotate(0deg)' }
			]
			: [
				{ transform: 'rotate(0deg)' },
				{ transform: 'rotate(0deg)' }
			];

		const options = {
			duration,
			easing: 'ease-in-out',
			iterations: Infinity,
			fill: 'forwards' as FillMode
		};

		return element.animate(keyframes, options);
	}

	function createLowerAnimation(element: HTMLElement): Animation {
		const keyframes = [
			{ transform: 'translateY(0)', opacity: 1 },
			{ transform: 'translateY(100%)', opacity: 0 }
		];
		const options = {
			duration: LOWER_DURATION,
			easing: 'ease-in',
			fill: 'forwards' as FillMode
		};
		return element.animate(keyframes, options);
	}

	function setAnimationPlaybackRate(animations: (Animation | null)[], rate: number) {
		animations.forEach(anim => {
			if (anim && anim.playState !== 'idle') {
				anim.playbackRate = rate;
			}
		});
	}

	function startRaise(index: number) {
		const element = flagContainers[index];
		if (!element) return;

		flagStates[index] = 'raising';
		activeFlagIndex = index;

		const raiseAnim = createRaiseAnimation(element);
		raiseAnim.playbackRate = playbackSpeed;
		raiseAnimations[index] = raiseAnim;

		raiseAnim.onfinish = () => {
			if (flagStates[index] !== 'raising') return;
			startHold(index);
		};
	}

	function startHold(index: number) {
		const element = flagContainers[index];
		if (!element) return;

		flagStates[index] = 'holding';

		const swingAnim = createSwingAnimation(element, $player.weather);
		swingAnim.playbackRate = playbackSpeed;
		swingAnimations[index] = swingAnim;

		const sf = allActiveFlags[index];
		holdRemainingTime = sf.duration * 1000;
		holdStartTime = performance.now();
	}

	function startLower(index: number) {
		const element = flagContainers[index];
		if (!element) return;

		flagStates[index] = 'lowering';

		if (swingAnimations[index]) {
			swingAnimations[index]?.cancel();
			swingAnimations[index] = null;
		}

		const lowerAnim = createLowerAnimation(element);
		lowerAnim.playbackRate = playbackSpeed;
		lowerAnimations[index] = lowerAnim;

		lowerAnim.onfinish = () => {
			flagStates[index] = 'done';
			activeFlagIndex = null;
			advanceToNextFlag();
		};
	}

	function updateHoldProgress(deltaMs: number) {
		if (activeFlagIndex === null || flagStates[activeFlagIndex] !== 'holding') return;

		holdRemainingTime -= deltaMs * playbackSpeed;

		if (holdRemainingTime <= 0) {
			startLower(activeFlagIndex);
		}
	}

	function pauseAllAnimations() {
		raiseAnimations.forEach((anim, i) => {
			if (anim && anim.playState === 'running') {
				savedRaiseTimes[i] = anim.currentTime as number | null;
				anim.pause();
			}
		});
		swingAnimations.forEach((anim, i) => {
			if (anim && anim.playState === 'running') {
				savedSwingTimes[i] = anim.currentTime as number | null;
				anim.pause();
			}
		});
		lowerAnimations.forEach((anim, i) => {
			if (anim && anim.playState === 'running') {
				savedLowerTimes[i] = anim.currentTime as number | null;
				anim.pause();
			}
		});

		if (activeFlagIndex !== null && flagStates[activeFlagIndex] === 'holding') {
			const now = performance.now();
			holdRemainingTime -= (now - holdStartTime) * playbackSpeed;
		}
	}

	function resumeAllAnimations() {
		raiseAnimations.forEach((anim, i) => {
			if (anim && anim.playState === 'paused' && savedRaiseTimes[i] !== null) {
				anim.currentTime = savedRaiseTimes[i];
				anim.play();
			}
		});
		swingAnimations.forEach((anim, i) => {
			if (anim && anim.playState === 'paused' && savedSwingTimes[i] !== null) {
				anim.currentTime = savedSwingTimes[i];
				anim.play();
			}
		});
		lowerAnimations.forEach((anim, i) => {
			if (anim && anim.playState === 'paused' && savedLowerTimes[i] !== null) {
				anim.currentTime = savedLowerTimes[i];
				anim.play();
			}
		});

		if (activeFlagIndex !== null && flagStates[activeFlagIndex] === 'holding') {
			holdStartTime = performance.now();
		}
	}

	function cancelAnimationAtIndex(index: number) {
		raiseAnimations[index]?.cancel();
		swingAnimations[index]?.cancel();
		lowerAnimations[index]?.cancel();
		raiseAnimations[index] = null;
		swingAnimations[index] = null;
		lowerAnimations[index] = null;
		savedRaiseTimes[index] = null;
		savedSwingTimes[index] = null;
		savedLowerTimes[index] = null;
	}

	function cancelAllAnimations() {
		raiseAnimations.forEach(anim => anim?.cancel());
		swingAnimations.forEach(anim => anim?.cancel());
		lowerAnimations.forEach(anim => anim?.cancel());
		raiseAnimations = [];
		swingAnimations = [];
		lowerAnimations = [];
		savedRaiseTimes = [];
		savedSwingTimes = [];
		savedLowerTimes = [];
		activeFlagIndex = null;
		flagStates = [];
		holdRemainingTime = 0;
	}

	function advanceToNextFlag() {
		if (!$player.isPlaying || $player.isPaused) return;

		const currentGroup = $signalGroups[$player.currentGroupIndex];
		if (!currentGroup) {
			handlePlaybackComplete();
			return;
		}

		let nextFlagIndex = $player.currentFlagIndex + 1;
		let nextGroupIndex = $player.currentGroupIndex;

		if (nextFlagIndex >= currentGroup.flags.length) {
			nextFlagIndex = 0;
			nextGroupIndex++;
		}

		if (nextGroupIndex >= $signalGroups.length) {
			handlePlaybackComplete();
			return;
		}

		player.setCurrentPosition(nextGroupIndex, nextFlagIndex);
		startRaise(getAbsoluteIndex(nextGroupIndex, nextFlagIndex));
	}

	function getAbsoluteIndex(groupIndex: number, flagIndex: number): number {
		let absoluteIndex = 0;
		for (let i = 0; i < groupIndex; i++) {
			absoluteIndex += $signalGroups[i].flags.length;
		}
		return absoluteIndex + flagIndex;
	}

	function handlePlaybackComplete() {
		stopTimer();
		cancelAllAnimations();
		player.stop();
		elapsedTime = 0;
	}

	function startTimer() {
		lastTimestamp = performance.now();
		const tick = (timestamp: number) => {
			if (lastTimestamp !== null && !$player.isPaused) {
				const delta = timestamp - lastTimestamp;
				elapsedTime += (delta / 1000) * playbackSpeed;
				player.setProgress(Math.min(1, elapsedTime / totalDuration));
				updateHoldProgress(delta);
			}
			lastTimestamp = timestamp;
			animationFrameId = requestAnimationFrame(tick);
		};
		animationFrameId = requestAnimationFrame(tick);
	}

	function stopTimer() {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		lastTimestamp = null;
	}

	function handlePlay() {
		if (!hasContent) return;

		if ($player.isPaused) {
			player.resume();
			resumeAllAnimations();
			startTimer();
		} else if (!$player.isPlaying) {
			initStates();
			player.play();
			startTimer();
			startRaise(0);
		}
	}

	function handlePause() {
		if (!$player.isPlaying || $player.isPaused) return;
		player.pause();
		pauseAllAnimations();
		stopTimer();
	}

	function handleStop() {
		stopTimer();
		cancelAllAnimations();
		player.stop();
		elapsedTime = 0;
	}

	function handleSpeedChange(speed: number) {
		if (activeFlagIndex !== null && flagStates[activeFlagIndex] === 'holding') {
			const now = performance.now();
			holdRemainingTime -= (now - holdStartTime) * playbackSpeed;
			holdStartTime = now;
		}

		playbackSpeed = speed;
		setAnimationPlaybackRate(raiseAnimations, speed);
		setAnimationPlaybackRate(swingAnimations, speed);
		setAnimationPlaybackRate(lowerAnimations, speed);
	}

	function handleWeatherChange(weather: WeatherCondition) {
		player.setWeather(weather);
		if (activeFlagIndex !== null && swingAnimations[activeFlagIndex]) {
			const element = flagContainers[activeFlagIndex];
			if (element) {
				const currentTime = swingAnimations[activeFlagIndex]?.currentTime as number || 0;
				swingAnimations[activeFlagIndex]?.cancel();
				const newSwingAnim = createSwingAnimation(element, weather);
				newSwingAnim.playbackRate = playbackSpeed;
				newSwingAnim.currentTime = currentTime;
				swingAnimations[activeFlagIndex] = newSwingAnim;
			}
		}
	}

	$effect(() => {
		if ($signalGroups.length > 0) {
			initStates();
		}
	});

	$effect(() => {
		return () => {
			stopTimer();
			cancelAllAnimations();
		};
	});
</script>

<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg space-y-6">
	<div class="flex items-center justify-between">
		<h3 class="text-xl font-bold text-surface-900-100-token">信号播放</h3>
		<div class="flex items-center gap-2">
			<span class="text-sm text-surface-600-400-token">天气:</span>
			<div class="flex gap-1">
				{#each weatherConditions as weather}
					{@const WeatherIcon = weatherIcons[weather]}
					<button
						onclick={() => handleWeatherChange(weather)}
						class="p-2 rounded-lg transition-all"
						class:bg-primary-500={$player.weather === weather}
						class:text-white={$player.weather === weather}
						class:bg-surface-200-700-token={$player.weather !== weather}
						class:text-surface-600-400-token={$player.weather !== weather}
						class:hover:bg-surface-300-600-token={$player.weather !== weather}
						title={weatherLabels[weather]}
					>
						<WeatherIcon class="w-4 h-4" />
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="relative bg-surface-50-900-token rounded-xl p-8 min-h-[200px] border border-surface-200-700-token overflow-hidden">
		{#if $player.weather === 'fog'}
			<div class="absolute inset-0 bg-surface-300-600-token/40 pointer-events-none z-20"></div>
		{/if}

		{#if $player.weather === 'storm'}
			<div class="absolute inset-0 pointer-events-none z-20 overflow-hidden">
				<div class="absolute inset-0 bg-surface-700-300-token/10 animate-pulse"></div>
			</div>
		{/if}

		{#if !hasContent}
			<div class="flex items-center justify-center h-48 text-surface-500">
				暂无信号组，请先添加信号组
			</div>
		{:else}
			<div class="flex items-end justify-center gap-4 h-48">
				{#each allActiveFlags as sf, index (sf.flag.id + index)}
					<div class="relative flex flex-col items-center">
						<div class="w-1 h-full bg-surface-400 absolute left-1/2 -translate-x-1/2 bottom-0 rounded-full" style="height: calc(100% - {flagSize / 1.5}px);"></div>
						<div
							bind:this={flagContainers[index]}
							class="relative z-10 overflow-visible flag-init-hidden"
							style:transform-origin="left center"
						>
							<FlagImage
								flag={sf.flag}
								size={flagSize}
								animated={false}
								weather={$player.weather}
							/>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="space-y-3">
		<div class="flex items-center justify-between text-sm">
			<span class="text-surface-600-400-token">
				{formattedElapsedTime}
			</span>
			<span class="text-surface-600-400-token">
				{formattedRemainingTime}
			</span>
		</div>
		<div class="h-2 bg-surface-200-700-token rounded-full overflow-hidden">
			<div
				class="h-full bg-primary-500 transition-all duration-100 rounded-full"
				style:width={progressPercent + '%'}
			></div>
		</div>
	</div>

	{#if currentGroup}
		<div class="p-4 bg-surface-50-900-token rounded-lg border border-surface-200-700-token">
			<div class="flex items-center justify-between mb-2">
				<div class="flex items-center gap-2">
					<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
						#{$player.currentGroupIndex + 1} / {$signalGroups.length}
					</span>
					<span class="font-mono text-lg font-bold text-surface-900-100-token">
						{currentGroup.flags.map(f => f.flag.code).join(' ')}
					</span>
				</div>
				<span class="text-sm text-surface-500">
					旗帜 {$player.currentFlagIndex + 1} / {currentGroup.flags.length}
				</span>
			</div>
			<p class="text-sm text-surface-600-400-token">{currentGroup.meaning}</p>
		</div>
	{/if}

	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-sm text-surface-600-400-token">速度:</span>
			<div class="flex gap-1">
				{#each speeds as speed}
					<button
						onclick={() => handleSpeedChange(speed)}
						class="px-3 py-1 rounded-lg text-sm font-medium transition-all"
						class:bg-primary-500={playbackSpeed === speed}
						class:text-white={playbackSpeed === speed}
						class:bg-surface-200-700-token={playbackSpeed !== speed}
						class:text-surface-600-400-token={playbackSpeed !== speed}
						class:hover:bg-surface-300-600-token={playbackSpeed !== speed}
					>
						{speed}x
					</button>
				{/each}
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={handleStop}
				disabled={!hasContent || (!$player.isPlaying && !$player.isPaused)}
				class="flex items-center gap-2 px-4 py-2 bg-surface-200-700-token hover:bg-surface-300-600-token disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
				title="停止"
			>
				<Square class="w-4 h-4" />
			</button>

			{#if !$player.isPlaying || $player.isPaused}
				<button
					onclick={handlePlay}
					disabled={!hasContent}
					class="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white disabled:bg-surface-400 disabled:cursor-not-allowed rounded-lg transition-colors"
					title={$player.isPaused ? '继续' : '播放'}
				>
					<Play class="w-4 h-4" />
					<span>{$player.isPaused ? '继续' : '播放'}</span>
				</button>
			{:else}
				<button
					onclick={handlePause}
					disabled={!hasContent}
					class="flex items-center gap-2 px-6 py-2 bg-warning-500 hover:bg-warning-600 text-white disabled:bg-surface-400 disabled:cursor-not-allowed rounded-lg transition-colors"
					title="暂停"
				>
					<Pause class="w-4 h-4" />
					<span>暂停</span>
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.flag-init-hidden {
		transform: translateY(100%);
		opacity: 0;
	}
</style>
