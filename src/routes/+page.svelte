<script lang="ts">
	import { SignalComposer, SignalPlayer } from '$lib';
	import type { WeatherCondition } from '$lib/types';
	import { player } from '$lib/stores/signalStore';
	import { Cloud, Wind, CloudRain, CloudFog } from 'lucide-svelte';

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

	function handleWeatherChange(weather: WeatherCondition) {
		player.setWeather(weather);
	}
</script>

<div class="space-y-6">
	<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold text-surface-900-100-token mb-2">信号编排</h2>
				<p class="text-surface-600-400-token">创建和管理信号旗组序列</p>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium text-surface-600-400-token">天气条件:</span>
				<div class="flex gap-1">
					{#each weatherConditions as weather}
						{@const WeatherIcon = weatherIcons[weather]}
						<button
							onclick={() => handleWeatherChange(weather)}
							class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
							class:bg-primary-500={$player.weather === weather}
							class:text-white={$player.weather === weather}
							class:bg-surface-200-700-token={$player.weather !== weather}
							class:text-surface-600-400-token={$player.weather !== weather}
							class:hover:bg-surface-300-600-token={$player.weather !== weather}
							title={weatherLabels[weather]}
						>
							<WeatherIcon class="w-4 h-4" />
							<span class="hidden sm:inline">{weatherLabels[weather]}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-5 gap-6">
		<div class="lg:col-span-3">
			<SignalComposer />
		</div>
		<div class="lg:col-span-2">
			<SignalPlayer flagSize={100} />
		</div>
	</div>
</div>
