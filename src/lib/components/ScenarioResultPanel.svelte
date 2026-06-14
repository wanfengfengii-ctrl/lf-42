<script lang="ts">
	import { FlagImage } from '$lib';
	import { scenarioTask, scenarioStatistics } from '$lib/stores/scenarioStore';
	import { getScenarioById, scenarioCategoryLabels } from '$lib/data/scenarios';
	import { getFlagByCode } from '$lib/data/flags';
	import { Chart, registerables } from 'chart.js';
	import { onMount, onDestroy } from 'svelte';
	import {
		CheckCircle, XCircle, AlertTriangle, Award, BarChart3,
		TrendingUp, Target, RotateCcw, Home, Flag as FlagIcon, Clock,
		BookOpen, Layers, Sparkles, ChevronRight
	} from 'lucide-svelte';
	import type { ScenarioResult, ScenarioErrorDetail, ScenarioCategory, ScenarioInfo, Flag as FlagType } from '$lib/types';

	Chart.register(...registerables);

	let { onRestart, onBackToSelect }: {
		onRestart: () => void;
		onBackToSelect: () => void;
	} = $props();

	let radarChartCanvas = $state<HTMLCanvasElement | undefined>();
	let trendChartCanvas = $state<HTMLCanvasElement | undefined>();
	let radarChart: Chart | null = null;
	let trendChart: Chart | null = null;
	let activeTab = $state<'result' | 'standard' | 'analysis'>('result');

	let scorePercent = $derived.by(() => {
		const r = $scenarioTask.lastResult;
		if (!r) return 0;
		return r.maxScore > 0 ? Math.round((r.totalScore / r.maxScore) * 100) : 0;
	});

	let scoreGrade = $derived.by(() => {
		const p = scorePercent;
		if (p >= 90) return { label: '优秀', color: 'text-success-500', bg: 'bg-success-500/20' };
		if (p >= 75) return { label: '良好', color: 'text-primary-500', bg: 'bg-primary-500/20' };
		if (p >= 60) return { label: '及格', color: 'text-warning-500', bg: 'bg-warning-500/20' };
		return { label: '待提升', color: 'text-error-500', bg: 'bg-error-500/20' };
	});

	let currentScenarioInfo = $derived.by((): ScenarioInfo | null => {
		const r = $scenarioTask.lastResult;
		if (!r) return null;
		return getScenarioById(r.scenarioId) || null;
	});

	function getErrorIcon(e: ScenarioErrorDetail) {
		switch (e.errorType) {
			case 'missing-critical': return AlertTriangle;
			case 'wrong-flags': return XCircle;
			case 'wrong-order': return XCircle;
			case 'invalid-group': return AlertTriangle;
			case 'unnecessary-group': return AlertTriangle;
			default: return AlertTriangle;
		}
	}

	function getErrorColorClass(e: ScenarioErrorDetail) {
		switch (e.errorType) {
			case 'missing-critical': return 'border-error-500 bg-error-500/10';
			case 'wrong-flags': return 'border-error-500 bg-error-500/10';
			case 'wrong-order': return 'border-warning-500 bg-warning-500/10';
			case 'invalid-group': return 'border-warning-500 bg-warning-500/10';
			case 'unnecessary-group': return 'border-surface-400 bg-surface-200-700-token';
			default: return 'border-surface-400 bg-surface-200-700-token';
		}
	}

	function getErrorLabel(e: ScenarioErrorDetail) {
		switch (e.errorType) {
			case 'missing-critical': return '缺少关键信号';
			case 'wrong-flags': return '旗帜错误';
			case 'wrong-order': return '顺序错误';
			case 'invalid-group': return '旗组不合法';
			case 'unnecessary-group': return '多余信号';
			default: return '错误';
		}
	}

	function codesToFlags(codes: string[]): FlagType[] {
		return codes.map(c => getFlagByCode(c)).filter(Boolean) as unknown as FlagType[];
	}

	function createCharts() {
		if (radarChartCanvas) {
			const ctx = radarChartCanvas.getContext('2d');
			if (ctx) {
				const r = $scenarioTask.lastResult;
				if (r) {
					const legalityPct = (r.scoreBreakdown.legality / 25) * 100;
					const timingPct = (r.scoreBreakdown.timing / 20) * 100;
					const matchingPct = (r.scoreBreakdown.matching / 40) * 100;
					const speedPct = (r.scoreBreakdown.speed / 15) * 100;

					radarChart = new Chart(ctx, {
						type: 'radar',
						data: {
							labels: ['旗组合法性', '发送时序', '场景匹配', '响应速度'],
							datasets: [{
								label: '本次得分',
								data: [legalityPct, timingPct, matchingPct, speedPct],
								backgroundColor: 'rgba(59, 130, 246, 0.2)',
								borderColor: 'rgba(59, 130, 246, 1)',
								borderWidth: 2,
								pointBackgroundColor: 'rgba(59, 130, 246, 1)',
								pointBorderColor: '#fff',
								pointHoverBackgroundColor: '#fff',
								pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
							}]
						},
						options: {
							responsive: true,
							scales: {
								r: {
									beginAtZero: true,
									max: 100,
									ticks: { stepSize: 25 },
									pointLabels: { font: { size: 12 } }
								}
							},
							plugins: {
								legend: { display: false }
							}
						}
					});
				}
			}
		}

		if (trendChartCanvas && $scenarioStatistics.history.length > 0) {
			const ctx = trendChartCanvas.getContext('2d');
			if (ctx) {
				const history = $scenarioStatistics.history.slice(-20);
				trendChart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: history.map((_: unknown, i: number) => `#${i + 1}`),
						datasets: [{
							label: '得分率 (%)',
							data: history.map((h: { score: number }) => h.score),
							borderColor: 'rgba(59, 130, 246, 1)',
							backgroundColor: 'rgba(59, 130, 246, 0.1)',
							fill: true,
							tension: 0.3,
							pointRadius: 4,
							pointHoverRadius: 6
						}]
					},
					options: {
						responsive: true,
						scales: {
							y: {
								beginAtZero: true,
								max: 100,
								ticks: { stepSize: 20 }
							}
						},
						plugins: {
							legend: { display: false }
						}
					}
				});
			}
		}
	}

	function destroyCharts() {
		if (radarChart) { radarChart.destroy(); radarChart = null; }
		if (trendChart) { trendChart.destroy(); trendChart = null; }
	}

	onMount(() => {
		createCharts();
	});

	onDestroy(() => {
		destroyCharts();
	});

	$effect(() => {
		if ($scenarioTask.lastResult) {
			destroyCharts();
			setTimeout(createCharts, 50);
		}
	});
</script>

{#if $scenarioTask.lastResult && currentScenarioInfo}
	<div class="space-y-6">
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-6 flex-wrap gap-4">
				<div class="flex items-center gap-3">
					<Award class="w-8 h-8 text-primary-500" />
					<div>
						<h2 class="text-2xl font-bold text-surface-900-100-token">任务完成！</h2>
						<p class="text-surface-600-400-token">
							{$scenarioTask.lastResult.scenarioCategory ? scenarioCategoryLabels[$scenarioTask.lastResult.scenarioCategory as ScenarioCategory] : ''} · {currentScenarioInfo?.title}
						</p>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						onclick={onBackToSelect}
						class="flex items-center gap-2 px-4 py-2 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
					>
						<Home class="w-4 h-4" />
						返回选择
					</button>
					<button
						onclick={onRestart}
						class="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
					>
						<RotateCcw class="w-4 h-4" />
						再做一题
					</button>
				</div>
			</div>

			<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
				<div class="col-span-2 lg:col-span-1 p-4 bg-gradient-to-br from-primary-500/20 to-surface-50-900-token rounded-xl border border-primary-500/30 text-center">
					<div class="text-4xl font-bold text-primary-500 mb-1">{scorePercent}%</div>
					<div class="text-xs text-surface-500">综合得分</div>
				</div>
				<div class="col-span-2 lg:col-span-1 p-4 rounded-xl border text-center {scoreGrade.bg}">
					<div class="text-2xl font-bold {scoreGrade.color} mb-1">{scoreGrade.label}</div>
					<div class="text-xs text-surface-500">评级</div>
				</div>
				<div class="p-4 bg-success-500/10 rounded-xl border border-success-500/30 text-center">
					<div class="text-2xl font-bold text-success-600 mb-1">{$scenarioTask.lastResult.scoreBreakdown.legality}/25</div>
					<div class="text-xs text-surface-500">合法性</div>
				</div>
				<div class="p-4 bg-warning-500/10 rounded-xl border border-warning-500/30 text-center">
					<div class="text-2xl font-bold text-warning-600 mb-1">{$scenarioTask.lastResult.scoreBreakdown.timing}/20</div>
					<div class="text-xs text-surface-500">时序</div>
				</div>
				<div class="p-4 bg-primary-500/10 rounded-xl border border-primary-500/30 text-center">
					<div class="text-2xl font-bold text-primary-600 mb-1">{$scenarioTask.lastResult.scoreBreakdown.matching}/40</div>
					<div class="text-xs text-surface-500">匹配度</div>
				</div>
			</div>

			<div class="flex gap-2 mb-6 border-b border-surface-200-700-token">
				<button
					onclick={() => activeTab = 'result'}
					class="px-5 py-3 text-sm font-medium transition-all border-b-2 {activeTab === 'result'
						? 'border-primary-500 text-primary-500'
						: 'border-transparent text-surface-500 hover:text-surface-700-300-token'}"
				>
					<span class="flex items-center gap-2">
						<BarChart3 class="w-4 h-4" />
						结果详情
					</span>
				</button>
				<button
					onclick={() => activeTab = 'standard'}
					class="px-5 py-3 text-sm font-medium transition-all border-b-2 {activeTab === 'standard'
						? 'border-primary-500 text-primary-500'
						: 'border-transparent text-surface-500 hover:text-surface-700-300-token'}"
				>
					<span class="flex items-center gap-2">
						<BookOpen class="w-4 h-4" />
						标准答案
					</span>
				</button>
				<button
					onclick={() => activeTab = 'analysis'}
					class="px-5 py-3 text-sm font-medium transition-all border-b-2 {activeTab === 'analysis'
						? 'border-primary-500 text-primary-500'
						: 'border-transparent text-surface-500 hover:text-surface-700-300-token'}"
				>
					<span class="flex items-center gap-2">
						<TrendingUp class="w-4 h-4" />
						能力分析
					</span>
				</button>
			</div>

			{#if activeTab === 'result'}
				<div class="space-y-6">
					<div class="grid lg:grid-cols-2 gap-6">
						<div>
							<h3 class="text-lg font-bold text-surface-900-100-token mb-4 flex items-center gap-2">
								<Target class="w-5 h-5 text-primary-500" />
								你的答案
								<span class="text-sm font-normal text-surface-500 ml-2">
									({$scenarioTask.lastResult.userGroups.length} 个旗组)
								</span>
							</h3>

							{#if $scenarioTask.lastResult.userGroups.length === 0}
								<div class="p-6 bg-error-500/10 border border-error-500/30 rounded-xl text-center">
									<XCircle class="w-10 h-10 text-error-500 mx-auto mb-2" />
									<p class="text-error-600 font-medium">未提交任何信号组</p>
								</div>
							{:else}
								<div class="space-y-3">
									{#each $scenarioTask.lastResult.userGroups as ug, idx (ug.id)}
										<div class="p-4 bg-surface-50-900-token rounded-lg border border-surface-200-700-token">
											<div class="flex items-center justify-between mb-2">
												<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
													#{idx + 1}
												</span>
												<span class="font-mono text-sm font-bold text-surface-900-100-token">
													{ug.codes.join(' · ')}
												</span>
											</div>
											<div class="flex items-center gap-2 flex-wrap">
												{#each codesToFlags(ug.codes) as flag, fi (flag.id + '-' + fi)}
													<FlagImage flag={flag} size={36} />
												{/each}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div>
							<h3 class="text-lg font-bold text-surface-900-100-token mb-4 flex items-center gap-2">
								<AlertTriangle class="w-5 h-5 text-warning-500" />
								错误定位
								<span class="text-sm font-normal text-surface-500 ml-2">
									({$scenarioTask.lastResult.errors.length} 个问题)
								</span>
							</h3>

							{#if $scenarioTask.lastResult.errors.length === 0}
								<div class="p-6 bg-success-500/10 border border-success-500/30 rounded-xl text-center">
									<CheckCircle class="w-10 h-10 text-success-500 mx-auto mb-2" />
									<p class="text-success-600 font-medium">太棒了！没有发现错误</p>
								</div>
							{:else}
								<div class="space-y-3">
									{#each $scenarioTask.lastResult.errors as err, idx (idx)}
										{@const ErrorIcon = getErrorIcon(err)}
										<div class="p-4 rounded-lg border-l-4 {getErrorColorClass(err)}">
											<div class="flex items-start gap-3">
												<ErrorIcon class="w-5 h-5 flex-shrink-0 mt-0.5 text-current" />
												<div class="flex-1">
													<div class="flex items-center gap-2 mb-1">
														<span class="text-xs font-bold uppercase tracking-wide text-current">
															{getErrorLabel(err)}
														</span>
														{#if err.groupOrder > 0}
															<span class="text-xs text-surface-500">位置：第 {err.groupOrder} 组</span>
														{/if}
													</div>
													<p class="text-sm text-surface-700-300-token">{err.errorMessage}</p>
													{#if err.correctCodes && err.correctCodes.length > 0}
														<div class="mt-2 p-2 bg-success-500/10 rounded border border-success-500/30">
															<span class="text-xs font-semibold text-success-600">正确信号：</span>
															<div class="flex items-center gap-2 mt-1 flex-wrap">
																{#each codesToFlags(err.correctCodes) as cf, ci (cf.id + '-' + ci)}
																	<div class="flex items-center gap-1">
																		<FlagImage flag={cf} size={24} />
																		<span class="font-mono text-xs font-bold">{cf.code}</span>
																	</div>
																{/each}
															</div>
															{#if err.correctMeaning}
																<p class="text-xs text-surface-600-400-token mt-1">{err.correctMeaning}</p>
															{/if}
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							{#if $scenarioTask.lastResult.alternativeSuggestions && $scenarioTask.lastResult.alternativeSuggestions.length > 0}
								<div class="mt-6">
									<h4 class="text-sm font-bold text-surface-900-100-token mb-3 flex items-center gap-2">
										<Sparkles class="w-4 h-4 text-primary-500" />
										可接受的替代方案
									</h4>
									<div class="space-y-2">
										{#each $scenarioTask.lastResult.alternativeSuggestions as alt, ai (alt.id)}
											<div class="p-3 bg-primary-500/10 rounded-lg border border-primary-500/30">
												<div class="flex items-center justify-between mb-2">
													<span class="text-xs font-semibold text-primary-600">
														第 {alt.order} 组的替代方案
													</span>
													<span class="text-xs px-2 py-0.5 rounded {
														alt.equivalenceLevel === 'equivalent'
															? 'bg-success-500/30 text-success-700'
															: alt.equivalenceLevel === 'acceptable'
															? 'bg-primary-500/30 text-primary-700'
															: 'bg-warning-500/30 text-warning-700'
													}">
														{alt.equivalenceLevel === 'equivalent' ? '等效' : alt.equivalenceLevel === 'acceptable' ? '可接受' : '部分等效'}
													</span>
												</div>
												<p class="text-xs text-surface-600-400-token mb-2">{alt.meaning}</p>
												<div class="flex flex-wrap gap-2">
													{#each alt.codes as codeset, ci (ci)}
														<div class="flex items-center gap-1 px-2 py-1 bg-surface-50-900-token rounded border border-surface-200-700-token">
															{#each codesToFlags(codeset) as cf, cfi (cf.id + '-' + cfi)}
																<FlagImage flag={cf} size={20} />
															{/each}
															<span class="font-mono text-xs">{codeset.join('')}</span>
														</div>
													{/each}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>

			{:else if activeTab === 'standard'}
				<div class="space-y-6">
					<div>
						<h3 class="text-lg font-bold text-surface-900-100-token mb-4 flex items-center gap-2">
							<FlagIcon class="w-5 h-5 text-primary-500" />
							标准答案信号序列
						</h3>
						<div class="space-y-4">
							{#each currentScenarioInfo?.standardGroups || [] as sg, idx (sg.id)}
								<div class="p-4 bg-surface-50-900-token rounded-xl border border-surface-200-700-token">
									<div class="flex items-start justify-between mb-3">
										<div class="flex items-center gap-2">
											<span class="px-3 py-1 bg-primary-500 text-white text-sm font-bold rounded-full">
												{idx + 1}
											</span>
											{#if sg.critical}
												<span class="px-2 py-0.5 bg-error-500/20 text-error-600 text-xs font-bold rounded">
													关键信号
												</span>
											{/if}
										</div>
										<span class="font-mono text-xl font-bold text-surface-900-100-token">
											{sg.codes.join(' · ')}
										</span>
									</div>
									<div class="flex items-center gap-3 mb-3 flex-wrap">
										{#each codesToFlags(sg.codes) as flag, fi (flag.id + '-' + fi)}
											<div class="flex flex-col items-center gap-1">
												<FlagImage flag={flag} size={56} />
												<span class="font-mono text-xs text-surface-500">{flag.code}</span>
											</div>
										{/each}
									</div>
									<div class="p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
										<p class="text-sm font-medium text-primary-700-300-token mb-1">信号含义</p>
										<p class="text-sm text-surface-700-300-token">{sg.meaning}</p>
									</div>
									<div class="mt-2 p-3 bg-surface-100-800-token rounded-lg">
										<p class="text-xs font-semibold text-surface-500 mb-1 flex items-center gap-1">
											<Target class="w-3 h-3" />
											发送目的
										</p>
										<p class="text-sm text-surface-700-300-token">{sg.purpose}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<div class="p-5 bg-gradient-to-br from-primary-500/10 to-surface-50-900-token rounded-xl border border-primary-500/30">
						<h4 class="text-lg font-bold text-surface-900-100-token mb-3 flex items-center gap-2">
							<BookOpen class="w-5 h-5 text-primary-500" />
							关键要点总结
						</h4>
						<ul class="space-y-2">
							{#each currentScenarioInfo?.keyPoints || [] as kp, i}
								<li class="flex items-start gap-3">
									<span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-sm font-bold flex items-center justify-center">
										{i + 1}
									</span>
									<p class="text-sm text-surface-700-300-token leading-relaxed pt-0.5">{kp}</p>
								</li>
							{/each}
						</ul>
					</div>
				</div>

			{:else if activeTab === 'analysis'}
				<div class="grid lg:grid-cols-2 gap-6">
					<div class="p-5 bg-surface-50-900-token rounded-xl border border-surface-200-700-token">
						<h4 class="text-lg font-bold text-surface-900-100-token mb-4 flex items-center gap-2">
							<BarChart3 class="w-5 h-5 text-primary-500" />
							本次任务能力雷达图
						</h4>
						<div class="relative w-full aspect-square max-w-sm mx-auto">
							<canvas bind:this={radarChartCanvas}></canvas>
						</div>
						<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
							<div class="flex items-center justify-between p-2 rounded bg-surface-100-800-token">
								<span class="text-surface-600-400-token">旗组合法性</span>
								<span class="font-bold">{Math.round(($scenarioTask.lastResult.scoreBreakdown.legality / 25) * 100)}%</span>
							</div>
							<div class="flex items-center justify-between p-2 rounded bg-surface-100-800-token">
								<span class="text-surface-600-400-token">发送时序</span>
								<span class="font-bold">{Math.round(($scenarioTask.lastResult.scoreBreakdown.timing / 20) * 100)}%</span>
							</div>
							<div class="flex items-center justify-between p-2 rounded bg-surface-100-800-token">
								<span class="text-surface-600-400-token">场景匹配</span>
								<span class="font-bold">{Math.round(($scenarioTask.lastResult.scoreBreakdown.matching / 40) * 100)}%</span>
							</div>
							<div class="flex items-center justify-between p-2 rounded bg-surface-100-800-token">
								<span class="text-surface-600-400-token">响应速度</span>
								<span class="font-bold">{Math.round(($scenarioTask.lastResult.scoreBreakdown.speed / 15) * 100)}%</span>
							</div>
						</div>
					</div>

					<div class="p-5 bg-surface-50-900-token rounded-xl border border-surface-200-700-token">
						<h4 class="text-lg font-bold text-surface-900-100-token mb-4 flex items-center gap-2">
							<TrendingUp class="w-5 h-5 text-primary-500" />
							历史进步趋势
						</h4>
						{#if $scenarioStatistics.history.length > 0}
							<div class="relative w-full h-64">
								<canvas bind:this={trendChartCanvas}></canvas>
							</div>
							<div class="mt-4 grid grid-cols-3 gap-3 text-center">
								<div>
									<div class="text-2xl font-bold text-surface-900-100-token">{$scenarioStatistics.totalTasks}</div>
									<div class="text-xs text-surface-500">累计任务</div>
								</div>
								<div>
									<div class="text-2xl font-bold text-primary-500">{$scenarioStatistics.averageScore}%</div>
									<div class="text-xs text-surface-500">平均得分</div>
								</div>
								<div>
									<div class="text-2xl font-bold text-success-500">
										{$scenarioStatistics.strongestCategory ? scenarioCategoryLabels[$scenarioStatistics.strongestCategory] : '-'}
									</div>
									<div class="text-xs text-surface-500">最强场景</div>
								</div>
							</div>
						{:else}
							<div class="h-64 flex items-center justify-center text-surface-500">
								暂无历史数据，完成更多任务后查看趋势
							</div>
						{/if}
					</div>

					<div class="lg:col-span-2 p-5 bg-surface-50-900-token rounded-xl border border-surface-200-700-token">
						<h4 class="text-lg font-bold text-surface-900-100-token mb-4 flex items-center gap-2">
							<Layers class="w-5 h-5 text-primary-500" />
							各场景分类能力统计
						</h4>
						<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each $scenarioStatistics.abilityRadar as radar (radar.category)}
								<div class="p-4 bg-surface-100-800-token rounded-xl border border-surface-200-700-token">
									<div class="flex items-center justify-between mb-3">
										<h5 class="font-bold text-surface-900-100-token">{radar.categoryLabel}</h5>
										<span class="text-xs text-surface-500">{radar.taskCount} 题</span>
									</div>
									<div class="space-y-2">
										<div>
											<div class="flex justify-between text-xs mb-1">
												<span class="text-surface-600-400-token">整体</span>
												<span class="font-bold text-primary-500">{radar.overall}%</span>
											</div>
											<div class="h-2 bg-surface-200-700-token rounded-full overflow-hidden">
												<div class="h-full bg-primary-500 rounded-full transition-all" style="width: {radar.overall}%"></div>
											</div>
										</div>
										<div class="grid grid-cols-2 gap-2 text-xs mt-2">
											<div class="flex justify-between">
												<span class="text-surface-500">合法性</span>
												<span class="font-bold">{radar.legality}%</span>
											</div>
											<div class="flex justify-between">
												<span class="text-surface-500">时序</span>
												<span class="font-bold">{radar.timing}%</span>
											</div>
											<div class="flex justify-between">
												<span class="text-surface-500">匹配</span>
												<span class="font-bold">{radar.matching}%</span>
											</div>
											<div class="flex justify-between">
												<span class="text-surface-500">速度</span>
												<span class="font-bold">{radar.speed}%</span>
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
