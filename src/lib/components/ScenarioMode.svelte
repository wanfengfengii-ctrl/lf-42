<script lang="ts">
	import { ScenarioResultPanel, FlagGroupEditor, SignalGroupList } from '$lib';
	import type { Flag, ScenarioCategory, SignalGroup } from '$lib/types';
	import { scenarioTask, scenarioStatistics, scenarioHistory } from '$lib/stores/scenarioStore';
	import { scenarios, scenarioCategoryLabels, getScenariosByCategory } from '$lib/data/scenarios';
	import { evaluateScenarioTask, buildUserScenarioGroups, createScenarioResult } from '$lib/utils/scenarioEvaluation';
	import { getFlagByCode } from '$lib/data/flags';
	import { createFlagGroupEditor } from '$lib/composables/useFlagGroupEditor.svelte';
	import {
		Play, Plus, Trash2, ArrowUp, ArrowDown, CheckCircle, GripVertical,
		Clock, Ship, AlertTriangle, Anchor, FileSearch, Flame, Anchor as AnchorIcon,
		ChevronRight, Target, Trophy, BarChart3, Layers, Shuffle, Send, RotateCcw,
		BookOpen, Info, Star
	} from 'lucide-svelte';

	import type { ScenarioInfo } from '$lib/types';

	type TaskStage = 'select' | 'playing' | 'result';

	let stage = $state<TaskStage>('select');
	let selectedCategory = $state<ScenarioCategory | 'all'>('all');
	let currentScenario = $state<ScenarioInfo | null>(null);
	let remainingTime = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let isTimeout = $state(false);

	let signalGroups = $state<SignalGroup[]>([]);

	const editor = createFlagGroupEditor();

	const categoryOptions: Array<{ value: ScenarioCategory | 'all'; label: string; icon: typeof Ship }> = [
		{ value: 'all', label: '全部场景', icon: Shuffle },
		{ value: 'collision', label: '避碰', icon: AlertTriangle },
		{ value: 'distress', label: '遇险', icon: Flame },
		{ value: 'pilotage', label: '引航', icon: Anchor },
		{ value: 'quarantine', label: '检疫', icon: FileSearch },
		{ value: 'dangerous-cargo', label: '装卸危险品', icon: AnchorIcon },
		{ value: 'towing', label: '拖带作业', icon: Ship }
	];

	let filteredScenarios = $derived(getScenariosByCategory(selectedCategory));

	function startScenario(scenario?: ScenarioInfo) {
		const s = scenario || scenarioTask.startTask(undefined, selectedCategory);
		currentScenario = s;
		signalGroups = [];
		editor.currentFlags = [];
		remainingTime = s.timeLimit;
		isTimeout = false;
		stage = 'playing';
		startTimer();
		scenarioHistory.startSession(selectedCategory);
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
		isTimeout = true;
		submitAnswer();
	}

	function addToSignalGroups() {
		const group = editor.buildSignalGroup(signalGroups.length);
		if (!group) return;

		signalGroups = [...signalGroups, group];
		editor.showSuccess('信号组已添加！');
		editor.resetAfterAdd();
	}

	function updateFlagDuration(groupId: string, flagIndex: number, duration: number) {
		signalGroups = signalGroups.map(g => {
			if (g.id !== groupId) return g;
			const newFlags = [...g.flags];
			newFlags[flagIndex] = { ...newFlags[flagIndex], duration: Math.max(1, duration) };
			return { ...g, flags: newFlags };
		});
	}

	function updateGroupDuration(groupId: string, duration: number) {
		signalGroups = signalGroups.map(g => {
			if (g.id !== groupId) return g;
			return { ...g, duration: Math.max(1, duration) };
		});
	}

	function removeGroup(id: string) {
		signalGroups = signalGroups.filter(g => g.id !== id).map((g, i) => ({ ...g, order: i }));
	}

	function moveGroup(fromIndex: number, toIndex: number) {
		if (toIndex < 0 || toIndex >= signalGroups.length) return;
		const newGroups = [...signalGroups];
		const [removed] = newGroups.splice(fromIndex, 1);
		newGroups.splice(toIndex, 0, removed);
		signalGroups = newGroups.map((g, i) => ({ ...g, order: i }));
	}

	function submitAnswer() {
		if (!currentScenario) return;
		pauseTimer();

		const reactionTime = isTimeout ? currentScenario.timeLimit : currentScenario.timeLimit - remainingTime;
		const userGroups = buildUserScenarioGroups(signalGroups);
		const evaluation = evaluateScenarioTask(currentScenario, userGroups, reactionTime, currentScenario.timeLimit);
		const result = createScenarioResult(currentScenario, userGroups, evaluation, reactionTime, isTimeout);
		scenarioTask.submitResult(result);
		scenarioHistory.endSession();
		stage = 'result';
	}

	function backToSelect() {
		stage = 'select';
		scenarioTask.clear();
		pauseTimer();
	}

	function startNewTask() {
		backToSelect();
	}

	function getTimeColor(): string {
		if (!currentScenario) return 'text-success-500';
		if (remainingTime > currentScenario.timeLimit * 0.5) return 'text-success-500';
		if (remainingTime > currentScenario.timeLimit * 0.25) return 'text-warning-500';
		return 'text-error-500';
	}

	function getDifficultyLabel(d: 'easy' | 'medium' | 'hard'): string {
		return d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难';
	}

	function getDifficultyClass(d: 'easy' | 'medium' | 'hard'): string {
		if (d === 'easy') return 'bg-success-500/20 text-success-600';
		if (d === 'medium') return 'bg-warning-500/20 text-warning-600';
		return 'bg-error-500/20 text-error-600';
	}

	function codesToFlagsView(codes: string[]) {
		return codes.map(c => getFlagByCode(c)).filter(Boolean) as Flag[];
	}

	$effect(() => {
		return () => {
			if (timerInterval) clearInterval(timerInterval);
		};
	});
</script>

<div class="space-y-6">
	{#if stage === 'select'}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center gap-3 mb-6">
				<Target class="w-8 h-8 text-primary-500" />
				<div>
					<h2 class="text-2xl font-bold text-surface-900-100-token">海上情景任务模式</h2>
					<p class="text-surface-600-400-token mt-1">在真实航海场景中编排旗组信号，提升实战应用能力</p>
				</div>
			</div>

			<div class="mb-6">
				<h3 class="block text-sm font-medium text-surface-700-300-token mb-3">选择场景类别</h3>
				<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
					{#each categoryOptions as opt}
						{@const Icon = opt.icon}
						<button
							onclick={() => selectedCategory = opt.value}
							class="flex flex-col items-center gap-2 p-3 rounded-xl transition-all {selectedCategory === opt.value
								? 'bg-primary-500 text-white shadow-lg scale-105'
								: 'bg-surface-50-900-token hover:bg-surface-200-700-token text-surface-700-300-token'}"
						>
							<Icon class="w-5 h-5" />
							<span class="text-xs font-medium">{opt.label}</span>
						</button>
					{/each}
				</div>
			</div>

			{#if $scenarioStatistics.totalTasks > 0}
				<div class="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
					<div class="flex items-center gap-2 mb-3">
						<BarChart3 class="w-4 h-4 text-primary-500" />
						<h4 class="font-semibold text-primary-600-400-token text-sm">你的历史能力概览</h4>
					</div>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div class="text-center">
							<div class="text-2xl font-bold text-surface-900-100-token">{$scenarioStatistics.totalTasks}</div>
							<div class="text-xs text-surface-500">已完成任务</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-primary-500">{$scenarioStatistics.averageScore}%</div>
							<div class="text-xs text-surface-500">平均得分</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-success-500">
								{$scenarioStatistics.strongestCategory ? scenarioCategoryLabels[$scenarioStatistics.strongestCategory] : '-'}
							</div>
							<div class="text-xs text-surface-500">最强项</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-warning-500">
								{$scenarioStatistics.weakestCategory ? scenarioCategoryLabels[$scenarioStatistics.weakestCategory] : '-'}
							</div>
							<div class="text-xs text-surface-500">待提升</div>
						</div>
					</div>
				</div>
			{/if}

			<div>
				<h3 class="block text-sm font-medium text-surface-700-300-token mb-3">
					选择具体任务场景
					<span class="text-xs text-surface-500 ml-2">({filteredScenarios.length} 个可用场景)</span>
				</h3>
				<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each filteredScenarios as scenario (scenario.id)}
						<div
							class="p-5 bg-surface-50-900-token rounded-xl border border-surface-200-700-token hover:border-primary-400 hover:shadow-lg transition-all cursor-pointer group"
							onclick={() => startScenario(scenario)}
						>
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-2">
									<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
										{scenario.categoryLabel}
									</span>
									<span class="px-2 py-1 text-xs font-semibold rounded {getDifficultyClass(scenario.difficulty)}">
										{getDifficultyLabel(scenario.difficulty)}
									</span>
								</div>
								<ChevronRight class="w-5 h-5 text-surface-400 group-hover:text-primary-500 transition-colors" />
							</div>
							<h3 class="text-lg font-bold text-surface-900-100-token mb-2 group-hover:text-primary-500 transition-colors">
								{scenario.title}
							</h3>
							<p class="text-sm text-surface-600-400-token mb-3 line-clamp-2">
								{scenario.description}
							</p>
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-1 text-xs text-surface-500">
									<Clock class="w-3.5 h-3.5" />
									{scenario.timeLimit}秒限时
								</span>
								<span class="flex items-center gap-1 text-xs text-surface-500">
									<Layers class="w-3.5 h-3.5" />
									{scenario.standardGroups.length}个信号组
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="mt-6 flex justify-center">
				<button
					onclick={() => startScenario()}
					class="flex items-center gap-3 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white text-lg font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
				>
					<Shuffle class="w-6 h-6" />
					随机抽取一个场景
				</button>
			</div>
		</div>

	{:else if stage === 'playing' && currentScenario}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-6 flex-wrap gap-4">
				<div class="flex items-center gap-3 flex-wrap">
					<span class="px-3 py-1 bg-primary-100-800-token text-primary-700-300-token font-semibold rounded-full text-sm">
						{currentScenario.categoryLabel}
					</span>
					<span class="px-3 py-1 font-semibold rounded-full text-sm {getDifficultyClass(currentScenario.difficulty)}">
						{getDifficultyLabel(currentScenario.difficulty)}
					</span>
					<span class="text-surface-600-400-token font-medium">{currentScenario.title}</span>
				</div>
				<div class="flex items-center gap-2">
					<Clock class="w-5 h-5 {getTimeColor()}" />
					<span class="text-2xl font-mono font-bold {getTimeColor()}">
						{remainingTime.toFixed(1)}s
					</span>
				</div>
			</div>

			<div class="mb-6 p-5 bg-gradient-to-br from-primary-500/10 to-surface-50-900-token rounded-xl border border-primary-500/20">
				<div class="flex items-start gap-3 mb-4">
					<Info class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
					<div class="flex-1">
						<h3 class="font-bold text-surface-900-100-token mb-2">任务背景</h3>
						<p class="text-sm text-surface-600-400-token leading-relaxed">
							{currentScenario.context}
						</p>
					</div>
				</div>
				<div class="border-t border-primary-500/20 pt-4">
					<h4 class="text-sm font-bold text-primary-600-400-token mb-2 flex items-center gap-2">
						<Target class="w-4 h-4" />
						任务要求
					</h4>
					<p class="text-sm text-surface-700-300-token leading-relaxed">
						{currentScenario.description}
					</p>
				</div>
				<div class="mt-4 border-t border-surface-200-700-token pt-4">
					<h4 class="text-xs font-bold text-surface-500 uppercase tracking-wide mb-2 flex items-center gap-2">
						<Star class="w-3.5 h-3.5" />
						关键提示
					</h4>
					<ul class="text-xs text-surface-600-400-token space-y-1">
						{#each currentScenario.keyPoints as kp, i}
							<li class="flex items-start gap-2">
								<span class="text-primary-500 font-bold">{i + 1}.</span>
								<span>{kp}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>

			<div class="mb-6">
				<FlagGroupEditor
					{editor}
					title="编排当前旗组"
					addButtonText="添加到发送序列"
					onAdd={addToSignalGroups}
					showGroupDuration={true}
					useClampedDuration={true}
				/>
			</div>

			<SignalGroupList
				groups={signalGroups}
				title="信号发送序列"
				countLabel="个旗组"
				onRemoveGroup={removeGroup}
				onMoveGroup={moveGroup}
				onUpdateGroupDuration={updateGroupDuration}
				onUpdateFlagDuration={updateFlagDuration}
				showFlagDurationEdit={true}
			/>

			<div class="mt-6 flex items-center justify-between">
				<button
					onclick={backToSelect}
					class="flex items-center gap-2 px-5 py-3 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
				>
					<RotateCcw class="w-4 h-4" />
					放弃任务
				</button>
				<button
					onclick={submitAnswer}
					class="flex items-center gap-3 px-8 py-3 bg-success-500 hover:bg-success-600 text-white rounded-lg transition-colors font-bold text-lg shadow-lg"
				>
					<Send class="w-5 h-5" />
					提交答案并评分
				</button>
			</div>
		</div>

	{:else if stage === 'result'}
		<ScenarioResultPanel onRestart={startNewTask} onBackToSelect={backToSelect} />
	{/if}
</div>
