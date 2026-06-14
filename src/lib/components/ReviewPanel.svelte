<script lang="ts">
	import { FlagImage } from '$lib';
	import { statistics, training } from '$lib/stores/signalStore';
	import { getFlagById } from '$lib/data/flags';
	import { Chart, registerables } from 'chart.js';
	import { onMount, onDestroy } from 'svelte';
	import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Target, Award, Filter, BarChart3, Layers, Shuffle, Flag, Activity } from 'lucide-svelte';
	import type { ResultCategory } from '$lib/types';

	Chart.register(...registerables);

	let accuracyChartCanvas = $state<HTMLCanvasElement | undefined>();
	let reactionChartCanvas = $state<HTMLCanvasElement | undefined>();
	let perSessionChartCanvas = $state<HTMLCanvasElement | undefined>();
	let perQuestionChartCanvas = $state<HTMLCanvasElement | undefined>();
	let flagErrorChartCanvas = $state<HTMLCanvasElement | undefined>();
	let reactionTrendChartCanvas = $state<HTMLCanvasElement | undefined>();
	let accuracyChart: Chart | null = null;
	let reactionChart: Chart | null = null;
	let perSessionChart: Chart | null = null;
	let perQuestionChart: Chart | null = null;
	let flagErrorChart: Chart | null = null;
	let reactionTrendChart: Chart | null = null;
	let activeTab = $state<'overview' | 'details' | 'analysis'>('overview');
	let detailFilter = $state<'all' | 'correct' | 'misjudged' | 'timeout'>('all');

	let accuracyData = $derived($statistics.accuracyHistory);
	let reactionTimeData = $derived($statistics.reactionTimeHistory);
	let mostMisjudged = $derived($statistics.mostMisjudged);
	let misjudgedWithDetails = $derived($statistics.misjudgedWithDetails || []);
	let perSessionAccuracy = $derived($statistics.perSessionAccuracy || []);
	let perQuestionReactionTime = $derived($statistics.perQuestionReactionTime || []);
	let flagErrorRate = $derived($statistics.flagErrorRate || []);
	let reactionTimeTrend = $derived($statistics.reactionTimeTrend || []);

	let overallAccuracy = $derived($statistics.totalQuestions > 0
		? Math.round(($statistics.correctAnswers / $statistics.totalQuestions) * 100)
		: 0
	);

	let categoryCounts = $derived(() => {
		const results = $training?.results || [];
		return {
			correct: results.filter(r => r.isCorrect && !r.isTimeout).length,
			misjudged: results.filter(r => r.isMisjudged && !r.isTimeout).length,
			timeout: results.filter(r => r.isTimeout).length
		};
	});

	let filteredResults = $derived(() => {
		const results = $training?.results || [];
		switch (detailFilter) {
			case 'correct':
				return results.filter(r => r.isCorrect && !r.isTimeout);
			case 'misjudged':
				return results.filter(r => r.isMisjudged && !r.isTimeout);
			case 'timeout':
				return results.filter(r => r.isTimeout);
			default:
				return results;
		}
	});

	let filterCounts = $derived(() => {
		const results = $training?.results || [];
		return {
			all: results.length,
			correct: results.filter(r => r.isCorrect && !r.isTimeout).length,
			misjudged: results.filter(r => r.isMisjudged && !r.isTimeout).length,
			timeout: results.filter(r => r.isTimeout).length
		};
	});

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
							legend: { display: false }
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
							legend: { display: false }
						}
					}
				});
			}
		}

		if (perSessionChartCanvas && perSessionAccuracy.length > 0) {
			const ctx = perSessionChartCanvas.getContext('2d');
			if (ctx) {
				perSessionChart = new Chart(ctx, {
					type: 'bar',
					data: {
						labels: perSessionAccuracy.map(d => `第${d.sessionNum}场`),
						datasets: [
							{
								label: '正确',
								data: perSessionAccuracy.map(d => d.correct),
								backgroundColor: '#10b981',
								barPercentage: 0.6
							},
							{
								label: '错误',
								data: perSessionAccuracy.map(d => d.total - d.correct),
								backgroundColor: '#ef4444',
								barPercentage: 0.6
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							x: { stacked: true },
							y: { stacked: true, beginAtZero: true }
						},
						plugins: {
							legend: {
								position: 'top',
								labels: { usePointStyle: true, boxWidth: 8 }
							}
						}
					}
				});
			}
		}

		if (perQuestionChartCanvas && perQuestionReactionTime.length > 0) {
			const ctx = perQuestionChartCanvas.getContext('2d');
			if (ctx) {
				const maxPoints = Math.min(perQuestionReactionTime.length, 30);
				const displayData = perQuestionReactionTime.slice(-maxPoints);
				perQuestionChart = new Chart(ctx, {
					type: 'bar',
					data: {
						labels: displayData.map(d => `#${d.questionNum}`),
						datasets: [{
							label: '反应时间 (秒)',
							data: displayData.map(d => d.time),
							backgroundColor: displayData.map(d => {
								if (d.category === 'timeout') return 'rgba(245, 158, 11, 0.8)';
								if (d.category === 'misjudged') return 'rgba(239, 68, 68, 0.8)';
								return 'rgba(16, 185, 129, 0.8)';
							}),
							borderColor: displayData.map(d => {
								if (d.category === 'timeout') return '#f59e0b';
								if (d.category === 'misjudged') return '#ef4444';
								return '#10b981';
							}),
							borderWidth: 1,
							barPercentage: 0.7
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
							legend: { display: false },
							tooltip: {
								callbacks: {
									label: (context) => {
										const data = displayData[context.dataIndex];
										const categoryLabel = data.category === 'timeout' ? '⏰ 超时' : data.category === 'misjudged' ? '❌ 误判' : '✅ 正确';
										return [
											`反应时间: ${data.time.toFixed(2)}秒`,
											`结果: ${categoryLabel}`
										];
									}
								}
							}
						}
					}
				});
			}
		}

		if (flagErrorChartCanvas && flagErrorRate.length > 0) {
			const ctx = flagErrorChartCanvas.getContext('2d');
			if (ctx) {
				const displayFlags = flagErrorRate.slice(0, 10);
				flagErrorChart = new Chart(ctx, {
					type: 'bar',
					data: {
						labels: displayFlags.map(d => d.code),
						datasets: [{
							label: '误判率 (%)',
							data: displayFlags.map(d => Math.round(d.errorRate * 10) / 10),
							backgroundColor: displayFlags.map(d => d.errorRate > 50 ? 'rgba(239, 68, 68, 0.8)' : d.errorRate > 25 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.8)'),
							borderColor: displayFlags.map(d => d.errorRate > 50 ? '#ef4444' : d.errorRate > 25 ? '#f59e0b' : '#10b981'),
							borderWidth: 1,
							barPercentage: 0.7
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						indexAxis: 'y',
						scales: {
							x: {
								beginAtZero: true,
								max: 100,
								ticks: {
									callback: (value) => value + '%'
								}
							}
						},
						plugins: {
							legend: { display: false },
							tooltip: {
								callbacks: {
									label: (context) => {
										const d = displayFlags[context.dataIndex];
										return [
											`${d.name} (${d.code})`,
											`出现: ${d.totalAppearances}次`,
											`误判: ${d.errorCount}次`,
											`误判率: ${Math.round(d.errorRate)}%`
										];
									}
								}
							}
						}
					}
				});
			}
		}

		if (reactionTrendChartCanvas && reactionTimeTrend.length > 0) {
			const ctx = reactionTrendChartCanvas.getContext('2d');
			if (ctx) {
				const maxPoints = Math.min(reactionTimeTrend.length, 40);
				const displayData = reactionTimeTrend.slice(-maxPoints);
				reactionTrendChart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: displayData.map(d => `#${d.questionNum}`),
						datasets: [
							{
								label: '反应时间',
								data: displayData.map(d => d.time),
								borderColor: displayData.map(d => {
									if (d.category === 'timeout') return '#f59e0b';
									if (d.category === 'misjudged') return '#ef4444';
									return '#10b981';
								}),
								backgroundColor: 'transparent',
								pointBackgroundColor: displayData.map(d => {
									if (d.category === 'timeout') return '#f59e0b';
									if (d.category === 'misjudged') return '#ef4444';
									return '#10b981';
								}),
								pointRadius: 4,
								showLine: false
							},
							{
								label: '滑动平均',
								data: displayData.map(d => d.rollingAvg),
								borderColor: '#6366f1',
								backgroundColor: 'rgba(99, 102, 241, 0.1)',
								fill: true,
								tension: 0.4,
								pointRadius: 0,
								borderWidth: 2
							}
						]
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
								position: 'top',
								labels: { usePointStyle: true, boxWidth: 8 }
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

		if (perSessionChart && perSessionAccuracy.length > 0) {
			perSessionChart.data.labels = perSessionAccuracy.map(d => `第${d.sessionNum}场`);
			perSessionChart.data.datasets[0].data = perSessionAccuracy.map(d => d.correct);
			perSessionChart.data.datasets[1].data = perSessionAccuracy.map(d => d.total - d.correct);
			perSessionChart.update();
		}
	}

	function destroyCharts() {
		[accuracyChart, reactionChart, perSessionChart, perQuestionChart, flagErrorChart, reactionTrendChart].forEach(c => {
			if (c) c.destroy();
		});
		accuracyChart = null;
		reactionChart = null;
		perSessionChart = null;
		perQuestionChart = null;
		flagErrorChart = null;
		reactionTrendChart = null;
	}

	function getCategoryIcon(category: ResultCategory | undefined) {
		if (category === 'timeout') return { icon: AlertTriangle, class: 'text-warning-500' };
		if (category === 'correct') return { icon: CheckCircle, class: 'text-success-500' };
		return { icon: XCircle, class: 'text-error-500' };
	}

	function getCategoryLabel(category: ResultCategory | undefined) {
		if (category === 'timeout') return '超时';
		if (category === 'correct') return '完全正确';
		if (category === 'misjudged') return '误判';
		return '错误';
	}

	function getCategoryClass(category: ResultCategory | undefined) {
		if (category === 'timeout') return 'bg-warning-500/20 text-warning-600';
		if (category === 'correct') return 'bg-success-500/20 text-success-600';
		return 'bg-error-500/20 text-error-600';
	}

	function getCategoryCardClass(category: ResultCategory | undefined) {
		if (category === 'timeout') return 'bg-surface-50-900-token border-warning-500/40';
		if (category === 'correct') return 'bg-surface-50-900-token border-success-500/40';
		return 'bg-surface-50-900-token border-error-500/40';
	}

	function getCategoryBadgeClass(category: ResultCategory | undefined) {
		if (category === 'timeout') return 'bg-warning-500 text-white';
		if (category === 'correct') return 'bg-success-500 text-white';
		return 'bg-error-500 text-white';
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
		<div class="grid md:grid-cols-3 gap-4 mb-6">
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg text-center border-l-4 border-success-500">
				<CheckCircle class="w-10 h-10 text-success-500 mx-auto mb-3" />
				<div class="text-3xl font-bold text-success-500">{categoryCounts().correct}</div>
				<div class="text-sm text-surface-500">完全正确</div>
			</div>
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg text-center border-l-4 border-error-500">
				<XCircle class="w-10 h-10 text-error-500 mx-auto mb-3" />
				<div class="text-3xl font-bold text-error-500">{categoryCounts().misjudged}</div>
				<div class="text-sm text-surface-500">误判</div>
			</div>
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg text-center border-l-4 border-warning-500">
				<AlertTriangle class="w-10 h-10 text-warning-500 mx-auto mb-3" />
				<div class="text-3xl font-bold text-warning-500">{categoryCounts().timeout}</div>
				<div class="text-sm text-surface-500">超时</div>
			</div>
		</div>

		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<h3 class="text-lg font-bold text-surface-900-100-token mb-4">成绩分类分布</h3>
			<div class="relative h-10">
				<div class="absolute inset-0 flex rounded-lg overflow-hidden">
					<div
						class="bg-success-500 flex items-center justify-center text-white text-xs font-medium"
						style={`width: {$statistics.totalQuestions > 0 ? (categoryCounts().correct / $statistics.totalQuestions) * 100 : 0}%`}
					>
						{#if categoryCounts().correct > 0}
							正确 {categoryCounts().correct}
						{/if}
					</div>
					<div
						class="bg-error-500 flex items-center justify-center text-white text-xs font-medium"
						style={`width: {$statistics.totalQuestions > 0 ? (categoryCounts().misjudged / $statistics.totalQuestions) * 100 : 0}%`}
					>
						{#if categoryCounts().misjudged > 0}
							误判 {categoryCounts().misjudged}
						{/if}
					</div>
					<div
						class="bg-warning-500 flex items-center justify-center text-white text-xs font-medium"
						style={`width: {$statistics.totalQuestions > 0 ? (categoryCounts().timeout / $statistics.totalQuestions) * 100 : 0}%`}
					>
						{#if categoryCounts().timeout > 0}
							超时 {categoryCounts().timeout}
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

		{#if flagErrorRate.length > 0}
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<div class="flex items-center gap-2 mb-4">
					<Flag class="w-5 h-5 text-error-500" />
					<h3 class="text-lg font-bold text-surface-900-100-token">旗帜误判率排名</h3>
				</div>
				<div class="h-64">
					<canvas bind:this={flagErrorChartCanvas}></canvas>
				</div>
				<div class="mt-4 grid grid-cols-3 gap-2">
					{#each flagErrorRate.slice(0, 6) as item (item.flagId)}
						{@const flag = getFlagById(item.flagId)}
						<div class="flex items-center gap-2 p-2 bg-surface-50-900-token rounded-lg">
							{#if flag}
								<FlagImage {flag} size={32} />
							{/if}
							<div class="min-w-0">
								<div class="text-xs font-bold text-surface-900-100-token">{item.code}</div>
								<div class="text-[10px] text-surface-500">{item.errorCount}/{item.totalAppearances}次误判</div>
							</div>
							<span class="ml-auto text-xs font-bold {item.errorRate > 50 ? 'text-error-500' : item.errorRate > 25 ? 'text-warning-500' : 'text-success-500'}">
								{Math.round(item.errorRate)}%
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	{#if activeTab === 'details'}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-4 flex-wrap gap-3">
				<h3 class="text-lg font-bold text-surface-900-100-token">答题详情（按结果分类）</h3>
				<div class="flex items-center gap-2">
					<Filter class="w-4 h-4 text-surface-500" />
					<div class="flex gap-1 bg-surface-200-700-token rounded-lg p-1">
						<button
							onclick={() => detailFilter = 'all'}
							class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {detailFilter === 'all' ? 'bg-surface-50-900-token shadow text-primary-600-400-token' : 'text-surface-600-400-token hover:text-surface-800-200-token'}"
						>
							全部 ({filterCounts().all})
						</button>
						<button
							onclick={() => detailFilter = 'correct'}
							class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {detailFilter === 'correct' ? 'bg-success-500 text-white shadow' : 'text-surface-600-400-token hover:text-success-500'}"
						>
							完全正确 ({filterCounts().correct})
						</button>
						<button
							onclick={() => detailFilter = 'misjudged'}
							class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {detailFilter === 'misjudged' ? 'bg-error-500 text-white shadow' : 'text-surface-600-400-token hover:text-error-500'}"
						>
							误判 ({filterCounts().misjudged})
						</button>
						<button
							onclick={() => detailFilter = 'timeout'}
							class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all {detailFilter === 'timeout' ? 'bg-warning-500 text-white shadow' : 'text-surface-600-400-token hover:text-warning-500'}"
						>
							超时 ({filterCounts().timeout})
						</button>
					</div>
				</div>
			</div>
			{#if filteredResults().length > 0}
				<div class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
					{#each filteredResults() as result, idx (result.id)}
						{@const category = result.resultCategory || (result.isTimeout ? 'timeout' : result.isCorrect ? 'correct' : 'misjudged' as ResultCategory)}
						{@const catIcon = getCategoryIcon(category)}
						{@const originalIndex = ($training?.results || []).findIndex(r => r.id === result.id) + 1}
						<div class="flex items-start gap-4 p-4 rounded-lg border {getCategoryCardClass(category)}">
							<div class="flex flex-col items-center gap-2 min-w-[72px]">
								<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
									#{originalIndex}
								</span>
								{#if catIcon.icon}
									<catIcon.icon class="w-6 h-6 {catIcon.class}" />
								{/if}
								<span class="px-2 py-0.5 text-[10px] font-bold rounded-full {getCategoryBadgeClass(category)}">
									{getCategoryLabel(category)}
								</span>
							</div>
							<div class="flex flex-col items-center gap-2 min-w-[100px] pt-1">
								<div class="flex items-center gap-1 flex-wrap justify-center">
									{#each result.signal.flags as sf, i (sf.flag.id + i)}
										<FlagImage flag={sf.flag} size={36} />
									{/each}
								</div>
								<div class="flex items-center gap-1 text-[10px] font-mono text-surface-500">
									{result.signal.flags.map(f => f.flag.code).join(' · ')}
								</div>
							</div>
							<div class="flex-1 min-w-0 pt-1">
								<div class="flex items-center gap-3 mb-2">
									<div class="flex items-center gap-1 text-xs text-surface-500">
										<Clock class="w-3.5 h-3.5" />
										<span>反应时间: <span class="font-mono font-semibold text-surface-700-300-token">{result.reactionTime.toFixed(2)}s</span></span>
									</div>
									<div class="flex items-center gap-1 text-xs text-surface-500">
										<span>限时: <span class="font-mono font-semibold">{result.timeLimit}s</span></span>
									</div>
								</div>
								<div class="space-y-1.5">
									<div class="flex items-start gap-2">
										<span class="text-[10px] font-semibold text-success-600 uppercase tracking-wide shrink-0 mt-0.5">正确:</span>
										<p class="text-sm font-medium text-surface-900-100-token leading-relaxed">
											{result.correctAnswer}
										</p>
									</div>
									{#if category === 'misjudged'}
										<div class="flex items-start gap-2">
											<span class="text-[10px] font-semibold text-error-600 uppercase tracking-wide shrink-0 mt-0.5">你的:</span>
											<p class="text-sm font-medium text-error-600 leading-relaxed">
												{result.userAnswer || '（未作答）'}
											</p>
										</div>
										{#if result.misjudgedFlagIds && result.misjudgedFlagIds.length > 0}
											<div class="flex items-start gap-2">
												<span class="text-[10px] font-semibold text-error-500 uppercase tracking-wide shrink-0 mt-0.5">误判旗:</span>
												<div class="flex flex-wrap gap-1">
													{#each result.misjudgedFlagIds as fid (fid)}
														{@const flag = result.signal.flags.find(f => f.flag.id === fid)?.flag}
														{#if flag}
															<span class="px-1.5 py-0.5 bg-error-500/20 text-error-600 text-[10px] font-bold rounded">
																{flag.code}
															</span>
														{/if}
													{/each}
												</div>
											</div>
										{/if}
									{/if}
									{#if category === 'timeout'}
										<div class="flex items-start gap-2">
											<span class="text-[10px] font-semibold text-warning-600 uppercase tracking-wide shrink-0 mt-0.5">状态:</span>
											<p class="text-sm font-medium text-warning-600 leading-relaxed">
												未在 {result.timeLimit} 秒内作答
											</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-16 text-surface-500">
					<Layers class="w-12 h-12 mx-auto mb-3 text-surface-300-600-token" />
					{#if filterCounts().all === 0}
						<p class="mb-1">暂无训练记录</p>
						<p class="text-xs">请先在训练模式中完成至少一轮训练</p>
					{:else}
						<p class="mb-1">当前筛选条件下无记录</p>
						<p class="text-xs">请切换其他筛选条件查看</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if activeTab === 'analysis'}
		<div class="space-y-6">
			<div class="grid md:grid-cols-2 gap-6">
				<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
					<div class="flex items-center gap-2 mb-4">
						<TrendingUp class="w-5 h-5 text-success-500" />
						<h3 class="text-lg font-bold text-surface-900-100-token">正确率趋势</h3>
					</div>
					{#if accuracyData.length > 0}
						<div class="h-64">
							<canvas bind:this={accuracyChartCanvas}></canvas>
						</div>
					{:else}
						<div class="h-64 flex items-center justify-center text-surface-500">
							需要完成至少一轮训练才能显示趋势图
						</div>
					{/if}
				</div>

				<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
					<div class="flex items-center gap-2 mb-4">
						<Activity class="w-5 h-5 text-indigo-500" />
						<h3 class="text-lg font-bold text-surface-900-100-token">反应时间趋势</h3>
					</div>
					{#if reactionTimeTrend.length > 0}
						<div class="h-64">
							<canvas bind:this={reactionTrendChartCanvas}></canvas>
						</div>
						<div class="flex justify-center gap-6 mt-3 pt-3 border-t border-surface-200-700-token">
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded bg-success-500"></div>
								<span class="text-xs text-surface-600-400-token">正确</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded bg-error-500"></div>
								<span class="text-xs text-surface-600-400-token">误判</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded bg-warning-500"></div>
								<span class="text-xs text-surface-600-400-token">超时</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded bg-indigo-500"></div>
								<span class="text-xs text-surface-600-400-token">滑动平均</span>
							</div>
						</div>
					{:else}
						<div class="h-64 flex items-center justify-center text-surface-500">
							需要完成答题才能显示数据
						</div>
					{/if}
				</div>
			</div>

			<div class="grid md:grid-cols-2 gap-6">
				<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
					<div class="flex items-center gap-2 mb-4">
						<BarChart3 class="w-5 h-5 text-primary-500" />
						<h3 class="text-lg font-bold text-surface-900-100-token">每场训练正确率变化</h3>
					</div>
					{#if perSessionAccuracy.length > 0}
						<div class="h-64">
							<canvas bind:this={perSessionChartCanvas}></canvas>
						</div>
					{:else}
						<div class="h-64 flex items-center justify-center text-surface-500">
							需要完成训练才能显示数据
						</div>
					{/if}
				</div>

				<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
					<div class="flex items-center gap-2 mb-4">
						<Clock class="w-5 h-5 text-violet-500" />
						<h3 class="text-lg font-bold text-surface-900-100-token">每题反应时间（按分类着色）</h3>
						<span class="text-xs text-surface-500 ml-auto">（最近 {Math.min(perQuestionReactionTime.length, 30)} 题）</span>
					</div>
					{#if perQuestionReactionTime.length > 0}
						<div class="h-64">
							<canvas bind:this={perQuestionChartCanvas}></canvas>
						</div>
						<div class="flex justify-center gap-6 mt-3 pt-3 border-t border-surface-200-700-token">
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded bg-success-500"></div>
								<span class="text-xs text-surface-600-400-token">正确</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded bg-error-500"></div>
								<span class="text-xs text-surface-600-400-token">误判</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded bg-warning-500"></div>
								<span class="text-xs text-surface-600-400-token">超时</span>
							</div>
						</div>
					{:else}
						<div class="h-64 flex items-center justify-center text-surface-500">
							需要完成答题才能显示数据
						</div>
					{/if}
				</div>
			</div>

			<div class="grid md:grid-cols-2 gap-6">
				<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
					<div class="flex items-center gap-2 mb-4">
						<Target class="w-5 h-5 text-primary-500" />
						<h3 class="text-lg font-bold text-surface-900-100-token">核心统计指标</h3>
					</div>
					<div class="text-center mb-6 pb-6 border-b border-surface-200-700-token">
						<div class="text-6xl font-bold text-primary-500 mb-2">
							{$statistics.averageReactionTime.toFixed(2)}
							<span class="text-2xl text-surface-500">秒</span>
						</div>
						<p class="text-sm text-surface-500">平均反应时间</p>
					</div>
					<div class="grid grid-cols-3 gap-4">
						<div class="p-4 bg-success-500/10 rounded-lg text-center">
							<div class="text-2xl font-bold text-success-500 mb-1">
								{$statistics.totalQuestions > 0 ? Math.round(($statistics.correctAnswers / $statistics.totalQuestions) * 100) : 0}%
							</div>
							<div class="text-[11px] text-surface-500 font-medium">完全正确</div>
							<div class="text-xs font-semibold text-success-600 mt-1">{$statistics.correctAnswers} 题</div>
						</div>
						<div class="p-4 bg-error-500/10 rounded-lg text-center">
							<div class="text-2xl font-bold text-error-500 mb-1">
								{$statistics.totalQuestions > 0 ? Math.round(($statistics.misjudgedAnswers / $statistics.totalQuestions) * 100) : 0}%
							</div>
							<div class="text-[11px] text-surface-500 font-medium">误判</div>
							<div class="text-xs font-semibold text-error-600 mt-1">{$statistics.misjudgedAnswers} 题</div>
						</div>
						<div class="p-4 bg-warning-500/10 rounded-lg text-center">
							<div class="text-2xl font-bold text-warning-500 mb-1">
								{$statistics.totalQuestions > 0 ? Math.round(($statistics.timeoutAnswers / $statistics.totalQuestions) * 100) : 0}%
							</div>
							<div class="text-[11px] text-surface-500 font-medium">超时</div>
							<div class="text-xs font-semibold text-warning-600 mt-1">{$statistics.timeoutAnswers} 题</div>
						</div>
					</div>
				</div>

				<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
					<div class="flex items-center gap-2 mb-4">
						<Shuffle class="w-5 h-5 text-error-500" />
						<h3 class="text-lg font-bold text-surface-900-100-token">误判旗帜详细分析</h3>
					</div>
					{#if misjudgedWithDetails.length > 0}
						<div class="space-y-3 max-h-[360px] overflow-y-auto pr-2">
							{#each misjudgedWithDetails as item, idx (item.flagId)}
								{@const flag = getFlagById(item.flagId)}
								{#if flag}
									<div class="p-4 bg-surface-50-900-token rounded-lg border border-error-500/30">
										<div class="flex items-start gap-3">
											<div class="relative shrink-0">
												<div class="absolute -top-2 -left-2 w-6 h-6 bg-error-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold z-10">
													{idx + 1}
												</div>
												<FlagImage {flag} size={56} />
											</div>
											<div class="flex-1 min-w-0 pt-1">
												<div class="flex items-center gap-2 mb-1 flex-wrap">
													<span class="font-mono font-bold text-lg text-surface-900-100-token">{flag.code}</span>
													<span class="text-xs text-surface-500">{flag.name}</span>
													<span class="ml-auto px-2 py-0.5 bg-error-500/20 text-error-600 text-xs font-bold rounded-full">
														误判 {item.count} 次
													</span>
												</div>
												<p class="text-xs text-surface-600-400-token line-clamp-2 mb-2">{flag.meaning}</p>
												{#if item.confusedWithIds && item.confusedWithIds.length > 0}
													<div class="pt-2 border-t border-surface-200-700-token/50">
														<p class="text-[10px] font-semibold text-surface-500 uppercase tracking-wide mb-2">容易混淆的旗帜：</p>
														<div class="flex items-center gap-2 flex-wrap">
															{#each item.confusedWithIds as cid (cid)}
																{@const confusedFlag = getFlagById(cid)}
																{#if confusedFlag}
																	<div class="flex items-center gap-1 px-2 py-1 bg-warning-500/10 rounded-md border border-warning-500/30">
																		<FlagImage flag={confusedFlag} size={24} />
																		<span class="text-[10px] font-mono font-semibold text-warning-700-300-token">{confusedFlag.code}</span>
																	</div>
																{/if}
															{/each}
														</div>
													</div>
												{/if}
											</div>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{:else}
						<div class="h-64 flex flex-col items-center justify-center text-surface-500">
							<Shuffle class="w-10 h-10 mb-3 text-surface-300-600-token" />
							<p class="mb-1">暂无误判记录</p>
							<p class="text-xs">继续加油，保持正确！</p>
						</div>
					{/if}
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
