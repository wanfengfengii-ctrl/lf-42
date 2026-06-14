<script lang="ts">
	import { FlagImage } from '$lib';
	import { signalGroups, player } from '$lib/stores/signalStore';
	import type { WeatherIntensity } from '$lib/types';
	import { Play, Pause, Square, Sun, Wind, CloudRain, Zap, CloudFog } from 'lucide-svelte';

	let { flagSize = 120 }: { flagSize?: number } = $props();

	let playbackSpeed = $state(1);
	let animationFrameId = $state<number | null>(null);
	let lastTimestamp = $state<number | null>(null);

	type FlagPlayState = 'idle' | 'raising' | 'holding' | 'lowering' | 'done';
	let flagStates = $state<FlagPlayState[]>([]);
	let activeFlagIndex = $state<number | null>(null);
	let holdRemainingTime = $state<number>(0);
	let holdStartTime = $state<number>(0);
	let holdTotalDuration = $state<number>(0);
	let elapsedTime = $state(0);

	let pauseSnapshot = $state<{
		elapsedTime: number;
		flagStates: FlagPlayState[];
		activeFlagIndex: number | null;
		holdRemainingTime: number;
		holdElapsedRatio: number;
		groupIndex: number;
		flagIndex: number;
		progress: number;
	} | null>(null);

	const speeds = [0.5, 1, 1.5, 2];
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

	const formattedTotalTime = $derived(
		formatTime(totalDuration)
	);

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

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
		if (i <= 40) return CloudFog;
		if (i <= 60) return Wind;
		if (i <= 80) return CloudRain;
		return Zap;
	}

	function computeFlagStatesAndPosition(elapsed: number): {
		states: FlagPlayState[];
		active: number | null;
		groupIdx: number;
		flagIdx: number;
		holdRemaining: number;
	} {
		let timeAccum = 0;
		let groupIdx = 0;
		let flagIdx = 0;
		let active: number | null = null;
		const states: FlagPlayState[] = [];
		let holdRemaining = 0;
		let found = false;

		for (let gi = 0; gi < $signalGroups.length; gi++) {
			const group = $signalGroups[gi];
			for (let fi = 0; fi < group.flags.length; fi++) {
				const sf = group.flags[fi];
				const raiseMs = RAISE_DURATION;
				const holdMs = sf.duration * 1000;
				const lowerMs = LOWER_DURATION;
				const flagTotalMs = raiseMs + holdMs + lowerMs;

				if (!found) {
					if (elapsed * 1000 < timeAccum + raiseMs) {
						states.push('raising');
						active = states.length - 1;
						groupIdx = gi;
						flagIdx = fi;
						holdRemaining = sf.duration;
						found = true;
					} else if (elapsed * 1000 < timeAccum + raiseMs + holdMs) {
						states.push('holding');
						active = states.length - 1;
						groupIdx = gi;
						flagIdx = fi;
						holdRemaining = (timeAccum + raiseMs + holdMs - elapsed * 1000) / 1000;
						found = true;
					} else if (elapsed * 1000 < timeAccum + flagTotalMs) {
						states.push('lowering');
						active = states.length - 1;
						groupIdx = gi;
						flagIdx = fi;
						holdRemaining = 0;
						found = true;
					} else {
						states.push('done');
					}
				} else {
					states.push('idle');
				}
				timeAccum += flagTotalMs / 1000;
			}
		}

		return { states, active, groupIdx, flagIdx, holdRemaining };
	}

	function initFlagStates() {
		const allFlags = $signalGroups.flatMap(g => g.flags);
		flagStates = allFlags.map(() => 'idle' as FlagPlayState);
		activeFlagIndex = null;
		holdRemainingTime = 0;
		elapsedTime = 0;
		pauseSnapshot = null;
	}

	function startPlayback() {
		if ($signalGroups.length === 0) return;
		initFlagStates();
		player.play();
		lastTimestamp = null;
		animationFrameId = requestAnimationFrame(tick);
	}

	function pausePlayback() {
		if (!$player.isPlaying || $player.isPaused) return;
		
		player.pause();
		
		pauseSnapshot = {
			elapsedTime,
			flagStates: [...flagStates],
			activeFlagIndex,
			holdRemainingTime,
			holdElapsedRatio: holdTotalDuration > 0 ? holdRemainingTime / holdTotalDuration : 0,
			groupIndex: $player.currentGroupIndex,
			flagIndex: $player.currentFlagIndex,
			progress: $player.progress
		};

		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	function resumePlayback() {
		if (!$player.isPaused) return;
		
		player.resume();
		lastTimestamp = null;
		
		if (pauseSnapshot) {
			const result = computeFlagStatesAndPosition(pauseSnapshot.elapsedTime);
			flagStates = result.states;
			activeFlagIndex = result.active;
			holdRemainingTime = result.holdRemaining;
			player.setCurrentPosition(result.groupIdx, result.flagIdx);
			player.setProgress(pauseSnapshot.progress);
			elapsedTime = pauseSnapshot.elapsedTime;
		}
		
		animationFrameId = requestAnimationFrame(tick);
	}

	function stopPlayback() {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		player.stop();
		initFlagStates();
		elapsedTime = 0;
		lastTimestamp = null;
		pauseSnapshot = null;
	}

	function tick(timestamp: number) {
		if (!$player.isPlaying || $player.isPaused) return;

		if (lastTimestamp === null) {
			lastTimestamp = timestamp;
			animationFrameId = requestAnimationFrame(tick);
			return;
		}

		const delta = (timestamp - lastTimestamp) / 1000;
		lastTimestamp = timestamp;

		elapsedTime += delta * playbackSpeed;

		if (elapsedTime >= totalDuration) {
			elapsedTime = totalDuration;
			stopPlayback();
			return;
		}

		const result = computeFlagStatesAndPosition(elapsedTime);
		flagStates = result.states;
		activeFlagIndex = result.active;
		holdRemainingTime = result.holdRemaining;
		
		player.setCurrentPosition(result.groupIdx, result.flagIdx);
		player.setProgress(totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0);

		animationFrameId = requestAnimationFrame(tick);
	}

	function getFlagStateClass(state: FlagPlayState): string {
		switch (state) {
			case 'raising': return 'flag-raise';
			case 'holding': return 'flag-hold';
			case 'lowering': return 'flag-lower';
			case 'done': return 'flag-done';
			default: return 'flag-idle';
		}
	}

	function getFlagOpacity(state: FlagPlayState): number {
		switch (state) {
			case 'idle': return 0.15;
			case 'done': return 0.35;
			case 'lowering': return 0.6;
			default: return 1;
		}
	}

	$effect(() => {
		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});
</script>

<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-xl font-bold text-surface-900-100-token">信号播放</h3>
		<div class="flex items-center gap-2">
			<span class="text-sm text-surface-600-400-token">播放速度:</span>
			<div class="flex gap-1">
				{#each speeds as s}
					<button
						onclick={() => playbackSpeed = s}
						class="px-3 py-1 rounded text-xs font-semibold transition-all {playbackSpeed === s ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token text-surface-700-300-token'}"
					>
						{s}x
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="mb-4">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm text-surface-500">{formattedRemainingTime}</span>
			<span class="text-sm text-surface-500">{formattedTotalTime}</span>
		</div>
		<div class="w-full h-2 bg-surface-200-700-token rounded-full overflow-hidden">
			<div
				class="h-full bg-primary-500 rounded-full transition-all duration-100"
				style="width: {$player.progress}%"
			></div>
		</div>
	</div>

	{#if $signalGroups.length === 0}
		<div class="border-2 border-dashed border-surface-300-600-token rounded-xl p-8 text-center text-surface-500">
			请先在编排页面添加旗组
		</div>
	{:else}
		<div class="space-y-4 mb-6 min-h-64">
			{#each $signalGroups as group, gi}
				<div class="p-4 bg-surface-50-900-token rounded-lg border border-surface-200-700-token">
					<div class="flex items-center gap-2 mb-3">
						<span class="px-2 py-0.5 bg-primary-500/20 text-primary-600-400-token text-xs font-semibold rounded">
							旗组 #{gi + 1}
						</span>
						<span class="text-sm text-surface-600-400-token">{group.meaning}</span>
					</div>
					<div class="flex items-center gap-4 flex-wrap">
						{#each group.flags as sf, fi}
							{@const flatIndex = $signalGroups.slice(0, gi).reduce((acc, g) => acc + g.flags.length, 0) + fi}
							{@const state = flagStates[flatIndex] || 'idle'}
							{@const isActive = activeFlagIndex === flatIndex}
							<div class="flex flex-col items-center gap-2 transition-all duration-300 {getFlagStateClass(state)}"
								style:opacity={getFlagOpacity(state)}
							>
								<div class="relative">
									<FlagImage
										flag={sf.flag}
										size={flagSize}
										animated={isActive}
										weatherIntensity={$player.weatherIntensity}
									/>
									{#if isActive && state === 'holding'}
										<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-surface-200-700-token rounded-full overflow-hidden">
											<div
												class="h-full bg-success-500 rounded-full transition-all duration-100"
												style="width: {holdTotalDuration > 0 ? ((1 - holdRemainingTime / holdTotalDuration) * 100) : 0}%"
											></div>
										</div>
									{/if}
								</div>
								<div class="text-center">
									<span class="text-xs font-mono font-bold {isActive ? 'text-primary-500' : 'text-surface-500'}">
										{sf.flag.code}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex items-center justify-between flex-wrap gap-4">
		<div class="flex items-center gap-3">
			{#if !$player.isPlaying}
				<button
					onclick={startPlayback}
					disabled={$signalGroups.length === 0}
					class="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
				>
					<Play class="w-5 h-5" />
					播放
				</button>
			{:else if $player.isPaused}
				<button
					onclick={resumePlayback}
					class="flex items-center gap-2 px-6 py-2.5 bg-success-500 hover:bg-success-600 text-white rounded-lg transition-colors font-medium"
				>
					<Play class="w-5 h-5" />
					继续
				</button>
			{:else}
				<button
					onclick={pausePlayback}
					class="flex items-center gap-2 px-6 py-2.5 bg-warning-500 hover:bg-warning-600 text-white rounded-lg transition-colors font-medium"
				>
					<Pause class="w-5 h-5" />
					暂停
				</button>
			{/if}

			{#if $player.isPlaying}
				<button
					onclick={stopPlayback}
					class="flex items-center gap-2 px-4 py-2.5 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
				>
					<Square class="w-4 h-4" />
					停止
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			{#each [getWeatherIcon($player.weatherIntensity)] as WeatherIcon}
				<WeatherIcon class="w-5 h-5 text-surface-500" />
			{/each}
			<input
				type="range"
				min="0"
				max="100"
				step="1"
				value={$player.weatherIntensity}
				onchange={(e) => player.setWeatherIntensity(parseInt((e.target as HTMLInputElement).value))}
				class="w-32 accent-primary-500"
			/>
			<span class="text-xs text-surface-500 min-w-[60px]">{getWeatherLabel($player.weatherIntensity)} {$player.weatherIntensity}%</span>
		</div>
	</div>

	{#if $player.isPlaying && activeFlagIndex !== null}
		<div class="mt-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg flex items-center gap-3">
			<span class="px-2 py-0.5 bg-primary-500/20 text-primary-600-400-token text-xs font-semibold rounded">
				当前旗位
			</span>
			<span class="text-sm font-medium text-surface-900-100-token">
				旗组 #{$player.currentGroupIndex + 1} - 第 {$player.currentFlagIndex + 1} 面
				{#if currentFlag}
					({currentFlag.flag.code} - {currentFlag.flag.name})
				{/if}
			</span>
			{#if flagStates[activeFlagIndex] === 'holding'}
				<span class="ml-auto text-xs text-success-600 font-medium">
					停留中 {holdRemainingTime.toFixed(1)}s
				</span>
			{:else if flagStates[activeFlagIndex] === 'raising'}
				<span class="ml-auto text-xs text-warning-600 font-medium">
					升旗中...
				</span>
			{:else if flagStates[activeFlagIndex] === 'lowering'}
				<span class="ml-auto text-xs text-error-600 font-medium">
					降旗中...
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.flag-raise {
		animation: player-raise 0.8s ease-out forwards;
	}

	.flag-hold {
		animation: none;
	}

	.flag-lower {
		animation: player-lower 0.6s ease-in forwards;
	}

	.flag-done {
		opacity: 0.35;
		transform: translateY(20px);
	}

	.flag-idle {
		opacity: 0.15;
	}

	@keyframes player-raise {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes player-lower {
		from {
			transform: translateY(0);
			opacity: 1;
		}
		to {
			transform: translateY(20px);
			opacity: 0.35;
		}
	}
</style>
