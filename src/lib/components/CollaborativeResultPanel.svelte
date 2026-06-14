<script lang="ts">
	import { collaborativeTask, collaborativeStatistics } from '$lib/stores/collaborativeStore';
	import { collaborativeRoleLabels } from '$lib/data/collaborativeScenarios';
	import { getFlagByCode } from '$lib/data/flags';
	import type { Flag, CollaborativeRoleType } from '$lib/types';
	import {
		Trophy, Clock, Users, CheckCircle, AlertTriangle, AlertOctagon,
		ChevronRight, RotateCcw, Home, Target, BarChart3, Award,
		Shield, Zap, ThumbsUp, TrendingUp, ListChecks, Eye, Play, Pause,
		Ship, Navigation, Anchor, Radio
	} from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	let {
		onRestart,
		onBackToSelect
	}: {
		onRestart: () => void;
		onBackToSelect: () => void;
	} = $props();

	let scoreColor = $derived.by(() => {
		if (!$collaborativeTask.lastResult) return 'text-surface-500';
		const pct = $collaborativeTask.lastResult.maxScore > 0
			? ($collaborativeTask.lastResult.totalScore / $collaborativeTask.lastResult.maxScore) * 100
			: 0;
		if (pct >= 80) return 'text-success-500';
		if (pct >= 60) return 'text-warning-500';
		return 'text-error-500';
	});

	let scoreLabel = $derived.by(() => {
		if (!$collaborativeTask.lastResult) return '';
		const pct = $collaborativeTask.lastResult.maxScore > 0
			? ($collaborativeTask.lastResult.totalScore / $collaborativeTask.lastResult.maxScore) * 100
			: 0;
		if (pct >= 90) return '协同大师';
		if (pct >= 80) return '默契协作';
		if (pct >= 60) return '合格团队';
		return '需要磨合';
	});

	let timelineCanvas = $state<HTMLCanvasElement | undefined>();
	let trendCanvas = $state<HTMLCanvasElement | undefined>();
	let radarCanvas = $state<HTMLCanvasElement | undefined>();
	let timelineChart = $state<Chart | null>(null);
	let trendChart = $state<Chart | null>(null);
	let radarChart = $state<Chart | null>(null);

	let isPlayingTimeline = $state(false);
	let currentTimelineIndex = $state(0);
	let timelineInterval: ReturnType<typeof setInterval> | null = null;

	const roleIconMap: Record<CollaborativeRoleType, typeof Ship> = {
		'own-ship': Ship,
		'target-ship': Navigation,
		'pilot-vessel': Anchor,
		'port-control': Radio
	};

	function codesToFlagsView(codes: string[]) {
		return codes.map(c => getFlagByCode(c)).filter(Boolean) as Flag[];
	}

	function getRoleColor(rt: CollaborativeRoleType): string {
		switch (rt) {
			case 'own-ship': return '#3b82f6';
			case 'target-ship': return '#f59e0b';
			case 'pilot-vessel': return '#10b981';
			case 'port-control': return '#8b5cf6';
		}
	}

	function getRoleColorClass(rt: CollaborativeRoleType): string {
		switch (rt) {
			case 'own-ship': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
			case 'target-ship': return 'bg-amber-500/20 text-amber-600 border-amber-500/30';
			case 'pilot-vessel': return 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30';
			case 'port-control': return 'bg-violet-500/20 text-violet-600 border-violet-500/30';
		}
	}

	function getSeverityClass(s: 'low' | 'medium' | 'high'): string {
		switch (s) {
			case 'low': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
			case 'medium': return 'bg-warning-500/20 text-warning-600 border-warning-500/30';
			case 'high': return 'bg-error-500/20 text-error-600 border-error-500/30';
		}
	}

	function getSeverityLabel(s: 'low' | 'medium' | 'high'): string {
		switch (s) {
			case 'low': return '轻微';
			case 'medium': return '中等';
			case 'high': return '严重';
		}
	}

	function toggleTimelinePlay() {
		if (isPlayingTimeline) {
			stopTimeline();
		} else {
			startTimeline();
		}
	}

	function startTimeline() {
		if (!$collaborativeTask.lastResult) return;
		isPlayingTimeline = true;
		if (currentTimelineIndex >= $collaborativeTask.lastResult.timeline.length) {
			currentTimelineIndex = 0;
		}
		timelineInterval = setInterval(() => {
			if (!$collaborativeTask.lastResult) return;
			if (currentTimelineIndex < $collaborativeTask.lastResult.timeline.length - 1) {
				currentTimelineIndex++;
			} else {
				stopTimeline();
			}
		}, 1500);
	}

	function stopTimeline() {
		isPlayingTimeline = false;
		if (timelineInterval) {
			clearInterval(timelineInterval);
			timelineInterval = null;
		}
	}

	function resetTimeline() {
		stopTimeline();
		currentTimelineIndex = 0;
	}

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function initCharts() {
		if (!$collaborativeTask.lastResult) return;
		const result = $collaborativeTask.lastResult;

		if (timelineCanvas) {
			const ctx = timelineCanvas.getContext('2d');
			if (ctx) {
				const uniqueRoles = [...new Set(result.timeline.map(t => t.roleType))];
				const datasets = uniqueRoles.map(rt => ({
					label: collaborativeRoleLabels[rt],
					data: result.timeline
						.filter(t => t.roleType === rt)
						.map(t => ({
							x: t.time,
							y: uniqueRoles.indexOf(rt) + 1,
							meaning: t.meaning,
							codes: t.groupCodes.join(' · '),
							correct: t.isCorrect
						})),
					backgroundColor: result.timeline
						.filter(t => t.roleType === rt)
						.map(t => t.isCorrect ? getRoleColor(rt) : '#ef4444'),
					borderColor: getRoleColor(rt),
					borderWidth: 2,
					pointRadius: 10,
					pointHoverRadius: 14,
					showLine: true,
					tension: 0.1
				}));

				timelineChart = new Chart(ctx, {
					type: 'scatter',
					data: { datasets },
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { position: 'top' },
							tooltip: {
								callbacks: {
									label: (ctx: any) => {
										const d = ctx.raw;
										return [`${d.codes}`, `${d.meaning}`, d.correct ? '✓ 正确' : '✗ 需改进'];
									}
								}
							}
						},
						scales: {
							x: {
								title: { display: true, text: '时间（秒）' },
								min: 0
							},
							y: {
								title: { display: true, text: '角色' },
								ticks: {
									callback: (v: any) => {
										const idx = Number(v) - 1;
										return uniqueRoles[idx] ? collaborativeRoleLabels[uniqueRoles[idx]] : '';
									},
									stepSize: 1
								},
								min: 0.5,
								max: uniqueRoles.length + 0.5
							}
						}
					}
				});
			}
		}

		if (trendCanvas && $collaborativeStatistics.history.length > 0) {
			const ctx = trendCanvas.getContext('2d');
			if (ctx) {
				const history = $collaborativeStatistics.history;
				trendChart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: history.map(h => `第${h.sessionNum}次`),
						datasets: [
							{
								label: '总得分',
								data: history.map(h => h.score),
								borderColor: '#3b82f6',
								backgroundColor: 'rgba(59, 130, 246, 0.1)',
								fill: true,
								tension: 0.3
							},
							{
								label: '协作度',
								data: history.map(h => h.collaboration),
								borderColor: '#8b5cf6',
								backgroundColor: 'rgba(139, 92, 246, 0.1)',
								fill: true,
								tension: 0.3
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: { legend: { position: 'top' } },
						scales: {
							y: {
								min: 0,
								max: 100,
								title: { display: true, text: '得分 (%)' }
							}
						}
					}
				});
			}
		}

		if (radarCanvas) {
			const ctx = radarCanvas.getContext('2d');
			if (ctx) {
				const sb = result.scoreBreakdown;
				const maxScore = 25;
				radarChart = new Chart(ctx, {
					type: 'radar',
					data: {
						labels: ['信号一致性', '时序协调性', '响应完整性', '协作效率', '响应速度'],
						datasets: [{
							label: '本次得分',
							data: [
								(sb.consistency / maxScore) * 100,
								(sb.timing / maxScore) * 100,
								(sb.completeness / maxScore) * 100,
								(sb.collaboration / 15) * 100,
								(sb.speed / 10) * 100
							],
							borderColor: '#3b82f6',
							backgroundColor: 'rgba(59, 130, 246, 0.2)',
							pointBackgroundColor: '#3b82f6'
						}]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							r: {
								min: 0,
								max: 100,
								ticks: { stepSize: 20 }
							}
						}
					}
				});
			}
		}
	}

	function destroyCharts() {
		timelineChart?.destroy();
		trendChart?.destroy();
		radarChart?.destroy();
		timelineChart = null;
		trendChart = null;
		radarChart = null;
	}

	onMount(() => {
		setTimeout(initCharts, 100);
	});

	onDestroy(() => {
		destroyCharts();
		stopTimeline();
	});
</script>

{#if $collaborativeTask.lastResult}
	{@const result = $collaborativeTask.lastResult}
	{@const scorePercent = result.maxScore > 0 ? Math.round((result.totalScore / result.maxScore) * 100) : 0}

	<div class="space-y-6">
		<div class="bg-gradient-to-br from-primary-500/20 via-surface-100-800-token to-primary-500/10 rounded-xl p-8 shadow-lg border border-primary-500/20">
			<div class="flex flex-col lg:flex-row items-center justify-between gap-6">
				<div class="flex items-center gap-6">
					<div class="relative">
						<div class="w-32 h-32 rounded-full flex items-center justify-center" style="background: conic-gradient(from 0deg, {scoreColor} {scorePercent}%, rgba(148,163,184,0.2) 0%);">
							<div class="w-24 h-24 rounded-full bg-surface-100-800-token flex flex-col items-center justify-center">
								<span class="text-4xl font-bold {scoreColor}">{scorePercent}</span>
								<span class="text-xs text-surface-500">分</span>
							</div>
						</div>
					</div>
					<div>
						<div class="flex items-center gap-3 mb-2">
							<Trophy class="w-8 h-8 text-warning-500" />
							<h2 class="text-3xl font-bold text-surface-900-100-token">{result.scenarioTitle}</h2>
						</div>
						<p class="text-xl font-semibold {scoreColor} mb-2">{scoreLabel}</p>
						<div class="flex items-center gap-4 text-sm text-surface-600-400-token">
							<span class="flex items-center gap-1">
								<Clock class="w-4 h-4" />
								用时 {Math.round(result.reactionTime)}秒 / {result.timeLimit}秒
							</span>
							<span class="flex items-center gap-1">
								<Users class="w-4 h-4" />
								{result.roleScores.length} 人协作
							</span>
							{#if result.isTimeout}
								<span class="px-2 py-0.5 bg-error-500/20 text-error-500 rounded text-xs font-semibold">超时</span>
							{/if}
						</div>
					</div>
				</div>
				<div class="flex gap-3">
					<button
						onclick={onBackToSelect}
						class="flex items-center gap-2 px-5 py-3 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors font-medium"
					>
						<Home class="w-5 h-5" />
						返回选择
					</button>
					<button
						onclick={onRestart}
						class="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-bold shadow-lg"
					>
						<RotateCcw class="w-5 h-5" />
						再来一次
					</button>
				</div>
			</div>
		</div>

		<div class="grid lg:grid-cols-2 gap-6">
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<div class="flex items-center gap-3 mb-4">
					<BarChart3 class="w-6 h-6 text-primary-500" />
					<h3 class="text-xl font-bold text-surface-900-100-token">团队综合能力雷达</h3>
				</div>
				<div class="h-72">
					<canvas bind:this={radarCanvas}></canvas>
				</div>
				<div class="grid grid-cols-5 gap-2 mt-4">
					<div class="text-center p-2 rounded-lg bg-blue-500/10">
						<div class="text-lg font-bold text-blue-500">{result.scoreBreakdown.consistency}</div>
						<div class="text-xs text-surface-500">信号一致</div>
					</div>
					<div class="text-center p-2 rounded-lg bg-amber-500/10">
						<div class="text-lg font-bold text-amber-500">{result.scoreBreakdown.timing}</div>
						<div class="text-xs text-surface-500">时序协调</div>
					</div>
					<div class="text-center p-2 rounded-lg bg-emerald-500/10">
						<div class="text-lg font-bold text-emerald-500">{result.scoreBreakdown.completeness}</div>
						<div class="text-xs text-surface-500">响应完整</div>
					</div>
					<div class="text-center p-2 rounded-lg bg-violet-500/10">
						<div class="text-lg font-bold text-violet-500">{result.scoreBreakdown.collaboration}</div>
						<div class="text-xs text-surface-500">协作效率</div>
					</div>
					<div class="text-center p-2 rounded-lg bg-rose-500/10">
						<div class="text-lg font-bold text-rose-500">{result.scoreBreakdown.speed}</div>
						<div class="text-xs text-surface-500">响应速度</div>
					</div>
				</div>
			</div>

			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<div class="flex items-center gap-3 mb-4">
					<Award class="w-6 h-6 text-primary-500" />
					<h3 class="text-xl font-bold text-surface-900-100-token">角色分工得分</h3>
				</div>
				<div class="space-y-4">
					{#each result.roleScores as rs}
						{@const rolePct = rs.maxScore > 0 ? Math.round((rs.totalScore / rs.maxScore) * 100) : 0}
						{@const RoleIcon = roleIconMap[rs.roleType]}
						<div class="p-4 rounded-xl border {getRoleColorClass(rs.roleType)}">
							<div class="flex items-center justify-between mb-3">
								<div class="flex items-center gap-3">
									<RoleIcon class="w-5 h-5" />
									<span class="font-bold text-lg">{rs.playerName}</span>
									<span class="text-sm opacity-80">({collaborativeRoleLabels[rs.roleType]})</span>
								</div>
								<span class="text-2xl font-bold">{rolePct}<span class="text-sm opacity-60">%</span></span>
							</div>
							<div class="w-full h-2 bg-surface-200-700-token rounded-full overflow-hidden mb-3">
								<div
									class="h-full rounded-full transition-all"
									style="width: {rolePct}%; background: {getRoleColor(rs.roleType)};"
								></div>
							</div>
							<div class="grid grid-cols-5 gap-2 text-center text-xs">
								<div>
									<div class="font-semibold">{rs.breakdown.legality}</div>
									<div class="text-surface-500">合法性</div>
								</div>
								<div>
									<div class="font-semibold">{rs.breakdown.timing}</div>
									<div class="text-surface-500">时序</div>
								</div>
								<div>
									<div class="font-semibold">{rs.breakdown.matching}</div>
									<div class="text-surface-500">匹配</div>
								</div>
								<div>
									<div class="font-semibold">{rs.breakdown.speed}</div>
									<div class="text-surface-500">速度</div>
								</div>
								<div>
									<div class="font-semibold">{rs.breakdown.collaboration}</div>
									<div class="text-surface-500">协作</div>
								</div>
							</div>
							{#if rs.errors.length > 0}
								<div class="mt-3 pt-3 border-t border-surface-200-700-token">
									<div class="text-xs font-semibold text-error-500 mb-2 flex items-center gap-1">
										<AlertTriangle class="w-3 h-3" />
										问题提示：
									</div>
									<ul class="space-y-1">
										{#each rs.errors.slice(0, 3) as err}
											<li class="text-xs text-surface-600-400-token flex items-start gap-1">
												<ChevronRight class="w-3 h-3 mt-0.5 flex-shrink-0" />
												<span>{err.errorMessage}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<ListChecks class="w-6 h-6 text-primary-500" />
					<h3 class="text-xl font-bold text-surface-900-100-token">团队时间线回放</h3>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={resetTimeline}
						class="p-2 rounded-lg bg-surface-200-700-token hover:bg-surface-300-600-token transition-colors"
						title="重置"
					>
						<RotateCcw class="w-4 h-4" />
					</button>
					<button
						onclick={toggleTimelinePlay}
						class="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
					>
						{#if isPlayingTimeline}
							<Pause class="w-4 h-4" />
							暂停
						{:else}
							<Play class="w-4 h-4" />
							播放
						{/if}
					</button>
				</div>
			</div>

			<div class="h-64 mb-6">
				<canvas bind:this={timelineCanvas}></canvas>
			</div>

			<div class="border border-surface-200-700-token rounded-xl overflow-hidden">
				<div class="max-h-64 overflow-y-auto">
					{#each result.timeline as ev, i}
						<div class="flex items-start gap-4 p-4 border-b border-surface-200-700-token last:border-b-0 transition-all {i <= currentTimelineIndex ? 'opacity-100' : 'opacity-40'} {i === currentTimelineIndex && isPlayingTimeline ? 'bg-primary-500/10' : ''}">
							<div class="flex flex-col items-center">
								<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style="background: {getRoleColor(ev.roleType)};">
									{i + 1}
								</div>
								<div class="w-px h-6 bg-surface-200-700-token mt-1"></div>
							</div>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<span class="px-2 py-0.5 text-xs font-semibold rounded border {getRoleColorClass(ev.roleType)}">
										{collaborativeRoleLabels[ev.roleType]}
									</span>
									<span class="text-sm font-mono font-bold text-surface-900-100-token">
										{ev.groupCodes.join(' · ')}
									</span>
									{#if ev.isCorrect}
										<span class="flex items-center gap-1 text-xs text-success-500">
											<CheckCircle class="w-3 h-3" />
											正确
										</span>
									{:else}
										<span class="flex items-center gap-1 text-xs text-error-500">
											<AlertTriangle class="w-3 h-3" />
											需改进
										</span>
									{/if}
									<span class="text-xs text-surface-500">
										<Clock class="w-3 h-3 inline mr-1" />
										{formatTime(ev.time)}
									</span>
								</div>
								<p class="text-sm text-surface-600-400-token">{ev.meaning}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		{#if result.conflicts.length > 0}
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<div class="flex items-center gap-3 mb-4">
					<AlertOctagon class="w-6 h-6 text-error-500" />
					<h3 class="text-xl font-bold text-surface-900-100-token">冲突指令定位</h3>
					<span class="px-2 py-0.5 bg-error-500/20 text-error-500 rounded text-xs font-semibold">
						{result.conflicts.length} 处问题
					</span>
				</div>
				<div class="space-y-4">
					{#each result.conflicts as conflict, idx}
						<div class="p-4 rounded-xl border border-error-500/30 bg-error-500/5">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-3">
									<span class="w-8 h-8 rounded-full bg-error-500 text-white flex items-center justify-center font-bold text-sm">
										{idx + 1}
									</span>
									<div>
										<div class="flex items-center gap-2 flex-wrap">
											{#each conflict.roles as rt}
												<span class="px-2 py-0.5 text-xs font-semibold rounded border {getRoleColorClass(rt)}">
													{collaborativeRoleLabels[rt]}
												</span>
											{/each}
											<span class="font-mono font-bold text-surface-900-100-token">
												{conflict.groupCodes.join(' · ')}
											</span>
										</div>
									</div>
								</div>
								<span class={`px-2 py-1 text-xs font-semibold rounded border ${getSeverityClass(conflict.severity)}`}>
									{getSeverityLabel(conflict.severity)}
								</span>
							</div>
							<p class="text-sm text-surface-700-300-token mb-3">{conflict.description}</p>
							<div class="flex items-start gap-2 p-3 bg-success-500/10 rounded-lg border border-success-500/20">
								<ThumbsUp class="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
								<div>
									<span class="text-sm font-semibold text-success-600">建议：</span>
									<span class="text-sm text-surface-700-300-token ml-1">{conflict.suggestion}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center gap-3 mb-4">
				<Shield class="w-6 h-6 text-success-500" />
				<h3 class="text-xl font-bold text-surface-900-100-token">最佳协同方案</h3>
			</div>
			<p class="text-sm text-surface-600-400-token mb-4 p-3 bg-primary-500/5 rounded-lg border border-primary-500/20">
				{result.bestPlan.description}
			</p>
			<div class="space-y-3">
				{#each result.bestPlan.steps as step, i}
					<div class="flex items-start gap-4 p-4 bg-surface-50-900-token rounded-xl border border-surface-200-700-token">
						<div class="w-10 h-10 rounded-full bg-success-500 text-white flex items-center justify-center font-bold flex-shrink-0">
							{i + 1}
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-1 flex-wrap">
								<span class="text-sm font-mono font-bold text-success-600">{step.time}</span>
								<span class="px-2 py-0.5 text-xs font-semibold rounded bg-primary-100-800-token text-primary-700-300-token">
									{step.role}
								</span>
							</div>
							<p class="font-semibold text-surface-900-100-token mb-1">{step.action}</p>
							<p class="text-sm text-surface-600-400-token">{step.reason}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		{#if $collaborativeStatistics.history.length > 1}
			<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
				<div class="flex items-center gap-3 mb-4">
					<TrendingUp class="w-6 h-6 text-primary-500" />
					<h3 class="text-xl font-bold text-surface-900-100-token">团队历史协作能力趋势</h3>
				</div>
				<div class="h-64">
					<canvas bind:this={trendCanvas}></canvas>
				</div>
				<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
					<div class="text-center p-3 bg-surface-50-900-token rounded-lg">
						<div class="text-2xl font-bold text-primary-500">{$collaborativeStatistics.totalSessions}</div>
						<div class="text-xs text-surface-500">协同次数</div>
					</div>
					<div class="text-center p-3 bg-surface-50-900-token rounded-lg">
						<div class="text-2xl font-bold text-blue-500">{$collaborativeStatistics.averageScore}%</div>
						<div class="text-xs text-surface-500">平均得分</div>
					</div>
					<div class="text-center p-3 bg-surface-50-900-token rounded-lg">
						<div class="text-2xl font-bold text-emerald-500">{$collaborativeStatistics.averageConsistency}</div>
						<div class="text-xs text-surface-500">平均一致性</div>
					</div>
					<div class="text-center p-3 bg-surface-50-900-token rounded-lg">
						<div class="text-2xl font-bold text-amber-500">{$collaborativeStatistics.averageTiming}</div>
						<div class="text-xs text-surface-500">平均时序</div>
					</div>
					<div class="text-center p-3 bg-surface-50-900-token rounded-lg">
						<div class="text-2xl font-bold text-violet-500">{$collaborativeStatistics.averageCollaboration}</div>
						<div class="text-xs text-surface-500">平均协作度</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
