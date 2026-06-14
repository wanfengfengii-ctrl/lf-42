<script lang="ts">
	import { FlagImage } from '$lib';
	import { statistics, training } from '$lib/stores/signalStore';
	import { getFlagById } from '$lib/data/flags';
	import { Chart, registerables } from 'chart.js';
	import { onMount, onDestroy } from 'svelte';
	import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Target, Award } from 'lucide-svelte';

	Chart.register(...registerables);

	let accuracyChartCanvas = $state<HTMLCanvasElement | undefined>();
	let reactionChartCanvas = $state<HTMLCanvasElement | undefined>();
	let accuracyChart: Chart | null = null;
	let reactionChart: Chart | null = null;
	let activeTab = $state<'overview' | 'details' | 'analysis'>('overview');

	let accuracyData = $derived($statistics.accuracyHistory);
	let reactionTimeData = $derived($statistics.reactionTimeHistory);
	let mostMisjudged = $derived($statistics.mostMisjudged);

	let overallAccuracy = $derived($statistics.totalQuestions > 0 
		? Math.round(($statistics.correctAnswers / $statistics.totalQuestions) * 100) 
		: 0
	);

	function createCharts() {
		if (accuracyChartCanvas && accuracyData.length > 0) {
			const ctx = accuracyChartCanvas.getContext('2d');
			if (ctx) {
				accuracyChart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: accuracyData.map(d => `第${d.session}组`),
						datasets: [{
							label: '正确率 (%)',
							data: accuracyData.map(d => d.accuracy),
							borderColor: '#10b981',
							backgroundColor: 'rgba(16, 185, 129, 0.1)',
							fill: true,
							tension: 0.4,
							pointBackgroundColor: '#10b981',
							pointBorderColor: '#fff',
							pointBorderWidth: 2,
							pointRadius: 6
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: {
								beginAtZero: true,
								max: 100,
								ticks: {
									callback: (value) => value + '%'
								}
							}
						},
						plugins: {
							legend: {
								display: false
							}
						}
					}
				});
			}
		}

		if (reactionChartCanvas && reactionTimeData.length > 0) {
			const ctx = reactionChartCanvas.getContext('2d');
			if (ctx) {
				reactionChart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: reactionTimeData.map(d => `第${d.session}组`),
						datasets: [{
							label: '平均反应时间 (秒)',
							data: reactionTimeData.map(d => d.time),
							borderColor: '#6366f1',
							backgroundColor: 'rgba(99, 102, 241, 0.1)',
							fill: true,
							tension: 0.4,
							pointBackgroundColor: '#6366f1',
							pointBorderColor: '#fff',
							pointBorderWidth: 2,
							pointRadius: 6
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: {
								beginAtZero: true,
								ticks: {
									callback: (value) => value + 's'
								}
							}
						},
						plugins: {
							legend: {
								display: false
							}
						}
					}
				});
			}
		}
	}

	function updateCharts() {
		if (accuracyChart && accuracyData.length > 0) {
			accuracyChart.data.labels = accuracyData.map(d => `第${d.session}组`);
			accuracyChart.data.datasets[0].data = accuracyData.map(d => d.accuracy);
			accuracyChart.update();
		}

		if (reactionChart && reactionTimeData.length > 0) {
			reactionChart.data.labels = reactionTimeData.map(d => `第${d.session}组`);
			reactionChart.data.datasets[0].data = reactionTimeData.map(d => d.time);
			reactionChart.update();
		}
	}

	function destroyCharts() {
		if (accuracyChart) {
			accuracyChart.destroy();
			accuracyChart = null;
		}
		if (reactionChart) {
			reactionChart.destroy();
			reactionChart = null;
		}
	}

	function getResultIcon(result: { isCorrect: boolean; isTimeout: boolean; isMisjudged: boolean }) {
		if (result.isTimeout) return { icon: AlertTriangle, class: 'text-warning-500' };
		if (result.isCorrect) return { icon: CheckCircle, class: 'text-success-500' };
		return { icon: XCircle, class: 'text-error-500' };
	}

	function getResultLabel(result: { isCorrect: boolean; isTimeout: boolean; isMisjudged: boolean }) {
		if (result.isTimeout) return '超时';
		if (result.isCorrect) return '正确';
		if (result.isMisjudged) return '误判';
		return '错误';
	}

	function getResultClass(result: { isCorrect: boolean; isTimeout: boolean; isMisjudged: boolean }) {
		if (result.isTimeout) return 'bg-warning-500/20 text-warning-600';
		if (result.isCorrect) return 'bg-success-500/20 text-success-600';
		return 'bg-error-500/20 text-error-600';
	}

	$effect(() => {
		if (accuracyData.length > 0 || reactionTimeData.length > 0) {
			updateCharts();
		}
	});

	onMount(() => {
		setTimeout(() => {
			createCharts();
		}, 100);
	});

	onDestroy(() => {
		destroyCharts();
	});
</script>

<div class="space-y-6">
	<div class="flex gap-2 mb-6">
		<button
			onclick={() => activeTab = 'overview'}
			class="px-6 py-2 rounded-lg font-medium transition-all {activeTab === 'overview' ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
		>
			<Target class="w-4 h-4 inline mr-2" />
			总览
		</button>
		<button
			onclick={() => activeTab = 'details'}
			class="px-6 py-2 rounded-lg font-medium transition-all {activeTab === 'details' ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
		>
			<Clock class="w-4 h-4 inline mr-2" />
			答题详情
		</button>
		<button
			onclick={() => activeTab = 'analysis'}
			class="px-6 py-2 rounded-lg font-medium transition-all {activeTab === 'analysis' ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
		>
			<TrendingUp class="w-4 h-4 inline mr-2" />
			趋势分析
		</button>
	</div>

	{#if activeTab === 'overview'}
		<div class="grid md:grid-cols-4 gap-4 mb-6">
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg text-center">
				<Award class="w-10 h-10 text-primary-500 mx-auto mb-3" />
				<div class="text-3xl font-bold text-surface-900-100-token">{$statistics.totalQuestions}</div>
				<div class="text-sm text-surface-500">总答题数</div>
			</div>
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg text-center">
				<CheckCircle class="w-10 h-10 text-success-500 mx-auto mb-3" />
				<div class="text-3xl font-bold text-success-500">{overallAccuracy}%</div>
				<div class="text-sm text-surface-500">正确率</div>
			</div>
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg text-center">
				<XCircle class="w-10 h-10 text-error-500 mx-auto mb-3" />
				<div class="text-3xl font-bold text-error-500">{$statistics.misjudgedAnswers}</div>
				<div class="text-sm text-surface-500">误判次数</div>
			</div>
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg text-center">
				<AlertTriangle class="w-10 h-10 text-warning-500 mx-auto mb-3" />
				<div class="text-3xl font-bold text-warning-500">{$statistics.timeoutAnswers}</div>
				<div class="text-sm text-surface-500">超时次数</div>
			</div>
		</div>

		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<h3 class="text-lg font-bold text-surface-900-100-token mb-4">成绩分布</h3>
			<div class="relative h-8">
				<div class="absolute inset-0 flex rounded-lg overflow-hidden">
					<div 
						class="bg-success-500 flex items-center justify-center text-white text-xs font-medium"
						style={`width: ${$statistics.totalQuestions > 0 ? ($statistics.correctAnswers / $statistics.totalQuestions) * 100 : 0}%`}
					>
						{#if $statistics.correctAnswers > 0}
							正确 {$statistics.correctAnswers}
						{/if}
					</div>
					<div 
						class="bg-error-500 flex items-center justify-center text-white text-xs font-medium"
						style={`width: ${$statistics.totalQuestions > 0 ? ($statistics.misjudgedAnswers / $statistics.totalQuestions) * 100 : 0}%`}
					>
						{#if $statistics.misjudgedAnswers > 0}
							误判 {$statistics.misjudgedAnswers}
						{/if}
					</div>
					<div 
						class="bg-warning-500 flex items-center justify-center text-white text-xs font-medium"
						style={`width: ${$statistics.totalQuestions > 0 ? ($statistics.timeoutAnswers / $statistics.totalQuestions) * 100 : 0}%`}
					>
						{#if $statistics.timeoutAnswers > 0}
							超时 {$statistics.timeoutAnswers}
						{/if}
					</div>
				</div>
			</div>
			<div class="flex justify-center gap-6 mt-4">
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded bg-success-500"></div>
					<span class="text-sm text-surface-600-400-token">完全正确</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded bg-error-500"></div>
					<span class="text-sm text-surface-600-400-token">误判</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded bg-warning-500"></div>
					<span class="text-sm text-surface-600-400-token">超时</span>
				</div>
			</div>
		</div>

		{#if mostMisjudged.length > 0}
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<h3 class="text-lg font-bold text-surface-900-100-token mb-4">最常误判的旗帜</h3>
				<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
					{#each mostMisjudged as item (item.flagId)}
						{@const flag = getFlagById(item.flagId)}
						{#if flag}
							<div class="flex flex-col items-center p-4 bg-surface-50-900-token rounded-lg border border-error-500/30">
								<FlagImage {flag} size={60} />
								<span class="mt-2 font-semibold text-surface-900-100-token">{flag.code}</span>
								<span class="text-xs text-surface-500">{flag.name}</span>
								<span class="mt-1 px-2 py-0.5 bg-error-500/20 text-error-500 text-xs rounded-full">
									误判 {item.count} 次
								</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	{#if activeTab === 'details'}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<h3 class="text-lg font-bold text-surface-900-100-token mb-4">答题详情</h3>
			{#if $training && $training.results.length > 0}
				<div class="space-y-3 max-h-96 overflow-y-auto pr-2">
					{#each $training.results as result, index (result.id)}
						{@const resultIcon = getResultIcon(result)}
						<div class="flex items-start gap-4 p-4 bg-surface-50-900-token rounded-lg border border-surface-200-700-token">
							<div class="flex items-center gap-2 min-w-24">
								<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
									#{index + 1}
								</span>
								{#if resultIcon.icon}
									<resultIcon.icon class={`w-5 h-5 ${resultIcon.class}`} />
								{/if}
							</div>
							<div class="flex items-center gap-2 min-w-32">
								{#each result.signal.flags as sf, i (sf.flag.id + i)}
									<FlagImage flag={sf.flag} size={30} />
								{/each}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class={`px-2 py-0.5 text-xs font-medium rounded ${getResultClass(result)}`}>
										{getResultLabel(result)}
									</span>
									<span class="text-xs text-surface-500">
										反应时间: {result.reactionTime.toFixed(2)}s
									</span>
								</div>
								<p class="text-sm text-surface-900-100-token truncate">
									正确答案: {result.correctAnswer}
								</p>
								{#if result.isMisjudged && !result.isTimeout}
									<p class="text-sm text-error-500 truncate">
										你的答案: {result.userAnswer || '（未作答）'}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-12 text-surface-500">
					暂无训练记录，请先完成训练
				</div>
			{/if}
		</div>
	{/if}

	{#if activeTab === 'analysis'}
		<div class="grid md:grid-cols-2 gap-6">
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<h3 class="text-lg font-bold text-surface-900-100-token mb-4">正确率趋势</h3>
				{#if accuracyData.length > 0}
					<div class="h-64">
						<canvas bind:this={accuracyChartCanvas}></canvas>
					</div>
				{:else}
					<div class="h-64 flex items-center justify-center text-surface-500">
						需要完成至少 10 道题目才能显示趋势图
					</div>
				{/if}
			</div>

			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<h3 class="text-lg font-bold text-surface-900-100-token mb-4">反应时间趋势</h3>
				{#if reactionTimeData.length > 0}
					<div class="h-64">
						<canvas bind:this={reactionChartCanvas}></canvas>
					</div>
				{:else}
					<div class="h-64 flex items-center justify-center text-surface-500">
						需要完成至少 10 道题目才能显示趋势图
					</div>
				{/if}
			</div>
		</div>

		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<h3 class="text-lg font-bold text-surface-900-100-token mb-4">平均反应时间</h3>
			<div class="text-center">
				<div class="text-6xl font-bold text-primary-500 mb-2">
					{$statistics.averageReactionTime.toFixed(2)}
					<span class="text-2xl text-surface-500">秒</span>
				</div>
				<div class="grid grid-cols-3 gap-4 mt-6">
					<div class="p-4 bg-success-500/10 rounded-lg">
						<div class="text-2xl font-bold text-success-500">
							{$statistics.correctAnswers > 0 ? Math.round(($statistics.correctAnswers / $statistics.totalQuestions) * 100) : 0}%
						</div>
						<div class="text-xs text-surface-500">完全正确</div>
					</div>
					<div class="p-4 bg-error-500/10 rounded-lg">
						<div class="text-2xl font-bold text-error-500">
							{$statistics.totalQuestions > 0 ? Math.round(($statistics.misjudgedAnswers / $statistics.totalQuestions) * 100) : 0}%
						</div>
						<div class="text-xs text-surface-500">误判</div>
					</div>
					<div class="p-4 bg-warning-500/10 rounded-lg">
						<div class="text-2xl font-bold text-warning-500">
							{$statistics.totalQuestions > 0 ? Math.round(($statistics.timeoutAnswers / $statistics.totalQuestions) * 100) : 0}%
						</div>
						<div class="text-xs text-surface-500">超时</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if $statistics.totalQuestions === 0}
		<div class="bg-surface-100-800-token rounded-xl p-12 shadow-lg text-center">
			<Award class="w-16 h-16 text-surface-300-600-token mx-auto mb-4" />
			<h3 class="text-xl font-bold text-surface-900-100-token mb-2">暂无训练记录</h3>
			<p class="text-surface-500">请先在训练模式中完成至少一轮训练</p>
		</div>
	{/if}
</div>
