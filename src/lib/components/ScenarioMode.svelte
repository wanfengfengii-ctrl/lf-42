<script lang="ts">
	import { FlagImage, FlagLibrary, ScenarioResultPanel } from '$lib';
	import type { SignalFlag, Flag, ScenarioCategory } from '$lib/types';
	import { scenarioTask, scenarioStatistics, scenarioHistory } from '$lib/stores/scenarioStore';
	import { scenarios, scenarioCategoryLabels, getScenariosByCategory } from '$lib/data/scenarios';
	import { evaluateScenarioTask, buildUserScenarioGroups, createScenarioResult } from '$lib/utils/scenarioEvaluation';
	import { validateFlagOrder, generateId } from '$lib/utils/validation';
	import { getFlagByCode } from '$lib/data/flags';
	import {
		Play, Plus, Trash2, ArrowUp, ArrowDown, CheckCircle, GripVertical,
		Clock, Ship, AlertTriangle, Anchor, FileSearch, Flame, Anchor as AnchorIcon,
		ChevronRight, Target, Trophy, BarChart3, Layers, Shuffle, Send, RotateCcw,
		BookOpen, Info, Star
	} from 'lucide-svelte';

	import type { ScenarioInfo, UserScenarioGroup, SignalGroup } from '$lib/types';

	type TaskStage = 'select' | 'playing' | 'result';

	let stage = $state<TaskStage>('select');
	let selectedCategory = $state<ScenarioCategory | 'all'>('all');
	let currentScenario = $state<ScenarioInfo | null>(null);
	let remainingTime = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let isTimeout = $state(false);

	let currentEditingGroup = $state<SignalFlag[]>([]);
	let signalGroups = $state<SignalGroup[]>([]);
	let showLibrary = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let currentGroupDuration = $state<number>(3);



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

	let orderValidation = $derived(currentEditingGroup.length > 0 ? validateFlagOrder(currentEditingGroup) : null);

	function startScenario(scenario?: ScenarioInfo) {
		const s = scenario || scenarioTask.startTask(undefined, selectedCategory);
		currentScenario = s;
		signalGroups = [];
		currentEditingGroup = [];
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

	function addFlag(flag: Flag) {
		if (currentEditingGroup.length >= 5) {
			errorMessage = '信号组最多包含5面旗帜';
			setTimeout(() => errorMessage = null, 3000);
			return;
		}
		currentEditingGroup.push({ flag, duration: 3 });
		showLibrary = false;
	}

	function removeFlag(index: number) {
		currentEditingGroup.splice(index, 1);
	}

	function moveFlag(fromIndex: number, toIndex: number) {
		if (toIndex < 0 || toIndex >= currentEditingGroup.length) return;
		const [removed] = currentEditingGroup.splice(fromIndex, 1);
		currentEditingGroup.splice(toIndex, 0, removed);
	}

	function clearCurrent() {
		currentEditingGroup = [];
		currentGroupDuration = 3;
	}

	function addToSignalGroups() {
		if (currentEditingGroup.length === 0) {
			errorMessage = '请至少选择一面旗帜';
			setTimeout(() => errorMessage = null, 3000);
			return;
		}

		const orderCheck = validateFlagOrder(currentEditingGroup);
		if (!orderCheck.valid) {
			errorMessage = orderCheck.message || '信号组不合法';
			setTimeout(() => errorMessage = null, 3000);
			return;
		}

		const meaning = currentEditingGroup.map(f => f.flag.code).join('');
		const group: SignalGroup = {
			id: generateId(),
			flags: [...currentEditingGroup],
			order: signalGroups.length,
			meaning,
			duration: currentGroupDuration
		};

		signalGroups = [...signalGroups, group];
		successMessage = '信号组已添加！';
		setTimeout(() => { successMessage = null; }, 2000);
		currentEditingGroup = [];
		currentGroupDuration = 3;
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

	function updateCurrentFlagDuration(index: number, duration: number) {
		const newGroup = [...currentEditingGroup];
		newGroup[index] = { ...newGroup[index], duration: Math.max(1, duration) };
		currentEditingGroup = newGroup;
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

			{#if errorMessage}
				<div class="flex items-center gap-2 p-4 bg-error-500/20 border border-error-500/50 rounded-lg text-error-500 mb-6">
					<AlertTriangle class="w-5 h-5" />
					<span>{errorMessage}</span>
				</div>
			{/if}
			{#if successMessage}
				<div class="flex items-center gap-2 p-4 bg-success-500/20 border border-success-500/50 rounded-lg text-success-500 mb-6">
					<CheckCircle class="w-5 h-5" />
					<span>{successMessage}</span>
				</div>
			{/if}

			<div class="mb-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-xl font-bold text-surface-900-100-token">编排当前旗组</h3>
					<button
						onclick={() => showLibrary = !showLibrary}
						class="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
					>
						<Plus class="w-4 h-4" />
						从旗帜库选择
					</button>
				</div>

				{#if showLibrary}
					<div class="mb-6">
						<FlagLibrary onSelect={addFlag} />
					</div>
				{/if}

				<div class="mb-4">
					<div class="flex items-center justify-between mb-3">
						<span class="text-sm font-medium text-surface-600-400-token">当前编辑旗组</span>
						{#if orderValidation && !orderValidation.valid}
							<span class="text-xs text-error-500 flex items-center gap-1">
								<AlertTriangle class="w-3 h-3" />
								{orderValidation.message}
							</span>
						{/if}
					</div>

					{#if currentEditingGroup.length === 0}
						<div class="border-2 border-dashed border-surface-300-600-token rounded-xl p-8 text-center text-surface-500">
							点击上方按钮从旗帜库选择旗帜
						</div>
					{:else}
						<div class="space-y-3">
							{#each currentEditingGroup as sf, index (sf.flag.id + index)}
								<div class="flex items-center gap-4 p-3 bg-surface-50-900-token rounded-lg border border-surface-200-700-token">
									<div class="text-surface-400">
										<GripVertical class="w-5 h-5" />
									</div>
									<FlagImage flag={sf.flag} size={50} />
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<span class="font-semibold text-surface-900-100-token">{sf.flag.code}</span>
											<span class="text-sm text-surface-500">{sf.flag.name}</span>
										</div>
										<p class="text-xs text-surface-500 mt-1">{sf.flag.meaning}</p>
									</div>
									<div class="flex items-center gap-2 px-2 py-1 bg-surface-100-800-token rounded-lg">
										<Clock class="w-3.5 h-3.5 text-primary-500" />
										<input
											type="number"
											class="w-14 text-center text-sm font-bold bg-transparent border-none outline-none text-surface-900-100-token [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
											value={sf.duration}
											onchange={(e) => updateCurrentFlagDuration(index, Number((e.target as HTMLInputElement).value))}
											min={1}
											max={20}
										/>
										<span class="text-xs text-surface-500">秒</span>
									</div>
									<div class="flex flex-col gap-1">
										<button
											onclick={() => moveFlag(index, index - 1)}
											disabled={index === 0}
											class="p-1 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<ArrowUp class="w-4 h-4" />
										</button>
										<button
											onclick={() => moveFlag(index, index + 1)}
											disabled={index === currentEditingGroup.length - 1}
											class="p-1 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<ArrowDown class="w-4 h-4" />
										</button>
									</div>
									<button
										onclick={() => removeFlag(index)}
										class="p-2 rounded hover:bg-error-500/20 text-error-500 transition-colors"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							{/each}
						</div>

						<div class="mt-4 p-4 bg-primary-500/5 rounded-lg border border-primary-500/20">
							<div class="flex items-center justify-between mb-2">
								<label class="text-sm font-semibold text-surface-700-300-token flex items-center gap-2">
									<Clock class="w-4 h-4 text-primary-500" />
									该旗组整体停留时间（建议关键信号停留更久）
								</label>
							</div>
							<div class="flex items-center gap-4">
								<div class="flex items-center gap-2">
									<input
										type="range"
										class="flex-1 h-2 bg-surface-200-700-token rounded-lg appearance-none cursor-pointer accent-primary-500"
										bind:value={currentGroupDuration}
										min={1}
										max={15}
									/>
									<span class="text-2xl font-bold text-primary-500 min-w-[60px] text-center">{currentGroupDuration}<span class="text-xs text-surface-500 font-normal ml-1">秒</span></span>
								</div>
								<div class="flex gap-2">
									<button
										onclick={() => currentGroupDuration = 3}
										class="px-3 py-1 text-xs rounded-lg {currentGroupDuration === 3 ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
									>3秒普通</button>
									<button
										onclick={() => currentGroupDuration = 5}
										class="px-3 py-1 text-xs rounded-lg {currentGroupDuration === 5 ? 'bg-warning-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
									>5秒重要</button>
									<button
										onclick={() => currentGroupDuration = 8}
										class="px-3 py-1 text-xs rounded-lg {currentGroupDuration === 8 ? 'bg-error-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
									>8秒紧急</button>
								</div>
							</div>
						</div>
					{/if}
				</div>

				{#if currentEditingGroup.length > 0}
					<div class="flex justify-end gap-3">
						<button
							onclick={clearCurrent}
							class="px-4 py-2 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
						>
							清空
						</button>
						<button
							onclick={addToSignalGroups}
							disabled={orderValidation ? !orderValidation.valid : false}
							class="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
						>
							<Plus class="w-4 h-4" />
							添加到发送序列
						</button>
					</div>
				{/if}
			</div>

			<div class="bg-surface-50-900-token rounded-xl p-6 border border-surface-200-700-token">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-xl font-bold text-surface-900-100-token">
						信号发送序列
						<span class="text-sm font-normal text-surface-500 ml-2">({signalGroups.length} 个旗组)</span>
					</h3>
					<span class="text-xs text-surface-500">按发送顺序排列（从上到下）</span>
				</div>

				{#if signalGroups.length === 0}
					<div class="border-2 border-dashed border-surface-300-600-token rounded-xl p-8 text-center text-surface-500">
						还没有添加任何信号组。请先编排旗组并添加到序列中。
					</div>
				{:else}
					<div class="space-y-4">
						{#each signalGroups as group, index (group.id)}
							<div class="p-4 bg-surface-100-800-token rounded-lg border border-surface-200-700-token">
								<div class="flex items-start justify-between mb-3">
									<div>
										<div class="flex items-center gap-2 flex-wrap">
											<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
												发送 #{index + 1}
											</span>
											<span class="font-mono text-lg font-bold text-surface-900-100-token">
												{group.flags.map(f => f.flag.code).join(' · ')}
											</span>
											<span class="flex items-center gap-1 px-2 py-0.5 bg-warning-500/20 text-warning-700 text-xs font-semibold rounded">
												<Clock class="w-3 h-3" />
												{group.duration}秒
											</span>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<button
											onclick={() => moveGroup(index, index - 1)}
											disabled={index === 0}
											class="p-2 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<ArrowUp class="w-4 h-4" />
										</button>
										<button
											onclick={() => moveGroup(index, index + 1)}
											disabled={index === signalGroups.length - 1}
											class="p-2 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<ArrowDown class="w-4 h-4" />
										</button>
										<button
											onclick={() => removeGroup(group.id)}
											class="p-2 rounded hover:bg-error-500/20 text-error-500 transition-colors"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								</div>
								<div class="space-y-2 mb-3">
									{#each group.flags as sf, i (sf.flag.id + i)}
										<div class="flex items-center gap-3 p-2 bg-surface-50-900-token rounded">
											<FlagImage flag={sf.flag} size={28} />
											<div class="flex-1">
												<span class="text-xs font-mono font-bold text-surface-700-300-token">{sf.flag.code}</span>
												<span class="text-xs text-surface-500 ml-2">{sf.flag.name}</span>
											</div>
											<div class="flex items-center gap-1 text-xs text-surface-600-400-token">
												<Clock class="w-3 h-3 text-primary-500" />
												<input
													type="number"
													class="w-12 text-center text-xs font-bold bg-surface-100-800-token rounded px-1 py-0.5 border-none outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
													value={sf.duration}
													onchange={(e) => updateFlagDuration(group.id, i, Number((e.target as HTMLInputElement).value))}
													min={1}
													max={20}
												/>
												<span>秒</span>
											</div>
										</div>
									{/each}
								</div>
								<div class="flex items-center gap-3 p-2 bg-primary-500/5 rounded border border-primary-500/20">
									<label class="text-xs font-semibold text-primary-600 whitespace-nowrap flex items-center gap-1">
										<Clock class="w-3 h-3" />
										组停留时间：
									</label>
									<input
										type="range"
										class="flex-1 h-1.5 bg-surface-200-700-token rounded appearance-none cursor-pointer accent-primary-500"
										value={group.duration}
										oninput={(e) => updateGroupDuration(group.id, Number((e.target as HTMLInputElement).value))}
										min={1}
										max={15}
									/>
									<div class="flex items-center gap-1 min-w-[70px]">
										<input
											type="number"
											class="w-10 text-center text-sm font-bold bg-transparent border-none outline-none text-primary-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
											value={group.duration}
											onchange={(e) => updateGroupDuration(group.id, Number((e.target as HTMLInputElement).value))}
											min={1}
											max={15}
										/>
										<span class="text-xs text-surface-500">秒</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

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
