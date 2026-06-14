<script lang="ts">
	import { CollaborativeResultPanel, FlagGroupEditor, SignalGroupList } from '$lib';
	import type {
		Flag,
		CollaborativeScenarioInfo,
		CollaborativeRoleType,
		SignalGroup
	} from '$lib/types';
	import {
		collaborativeScenarios,
		collaborativeRoles,
		collaborativeRoleLabels,
		getCollaborativeScenariosByCategory
	} from '$lib/data/collaborativeScenarios';
	import { collaborativeTask, collaborativeStatistics } from '$lib/stores/collaborativeStore';
	import {
		evaluateCollaborativeTask,
		buildUserScenarioGroups,
		createCollaborativeResult
	} from '$lib/utils/collaborativeEvaluation';
	import { getFlagByCode } from '$lib/data/flags';
	import { createFlagGroupEditor } from '$lib/composables/useFlagGroupEditor.svelte';
	import {
		Users, Ship, Navigation, Anchor, Radio, Plus, Trash2, ArrowUp, ArrowDown,
		Clock, AlertTriangle, CheckCircle, GripVertical, ChevronRight, Target, Trophy,
		BarChart3, Layers, Send, RotateCcw, Info, Star, AlertOctagon, UserPlus, CheckCheck
	} from 'lucide-svelte';
	import type { ScenarioCategory } from '$lib/types';
	import { scenarioCategoryLabels } from '$lib/data/scenarios';

	type TaskStage = 'select' | 'roleSetup' | 'playing' | 'result';

	let stage = $state<TaskStage>('select');
	let selectedCategory = $state<ScenarioCategory | 'all'>('all');
	let currentScenario = $state<CollaborativeScenarioInfo | null>(null);
	let remainingTime = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let isTimeout = $state(false);

	let playerConfigs = $state<Array<{ name: string; roleType: CollaborativeRoleType }>>([]);
	let currentPlayerIndex = $state(0);

	let playerSignalGroups = $state<Record<string, SignalGroup[]>>({});

	const editor = createFlagGroupEditor();

	const categoryOptions: Array<{ value: ScenarioCategory | 'all'; label: string; icon: typeof Ship }> = [
		{ value: 'all', label: '全部场景', icon: Layers },
		{ value: 'collision', label: '避碰', icon: AlertTriangle },
		{ value: 'distress', label: '遇险', icon: AlertOctagon },
		{ value: 'pilotage', label: '引航', icon: Anchor },
		{ value: 'quarantine', label: '检疫', icon: Info },
		{ value: 'dangerous-cargo', label: '装卸危险品', icon: Star },
		{ value: 'towing', label: '拖带作业', icon: Ship }
	];

	const roleIconMap: Record<CollaborativeRoleType, typeof Ship> = {
		'own-ship': Ship,
		'target-ship': Navigation,
		'pilot-vessel': Anchor,
		'port-control': Radio
	};

	let filteredScenarios = $derived(getCollaborativeScenariosByCategory(selectedCategory));
	let currentPlayer = $derived(playerConfigs[currentPlayerIndex]);
	let currentRoleTask = $derived(currentPlayer && currentScenario ? currentScenario.roleTasks[currentPlayer.roleType] : null);
	let currentPlayerRoleIcon = $derived(currentPlayer ? roleIconMap[currentPlayer.roleType] : Ship);
	let currentPlayerGroups = $derived(currentPlayer ? playerSignalGroups[currentPlayer.name] || [] : []);
	let allPlayersSubmitted = $derived(
		playerConfigs.every(pc => {
			const groups = playerSignalGroups[pc.name] || [];
			return groups.length > 0;
		})
	);

	function goToRoleSetup(scenario: CollaborativeScenarioInfo) {
		currentScenario = scenario;
		playerConfigs = scenario.availableRoles.map(rt => ({
			name: `玩家${collaborativeRoleLabels[rt]}`,
			roleType: rt
		}));
		playerSignalGroups = {};
		stage = 'roleSetup';
	}

	function startScenario() {
		if (!currentScenario) return;
		const validConfigs = playerConfigs.filter(pc => pc.name.trim().length > 0);
		if (validConfigs.length < currentScenario.minPlayers) {
			editor.showError(`至少需要 ${currentScenario.minPlayers} 名玩家`);
			return;
		}

		playerConfigs = validConfigs;
		validConfigs.forEach(pc => {
			if (!playerSignalGroups[pc.name]) playerSignalGroups[pc.name] = [];
		});
		currentPlayerIndex = 0;
		remainingTime = currentScenario.timeLimit;
		isTimeout = false;
		collaborativeTask.startSession(currentScenario, validConfigs);
		stage = 'playing';
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
		isTimeout = true;
		submitAllAnswers();
	}

	function switchPlayer(index: number) {
		currentPlayerIndex = index;
		editor.currentFlags = [];
	}

	function addToPlayerGroups() {
		if (!currentPlayer) return;
		const existingGroups = playerSignalGroups[currentPlayer.name] || [];
		const group = editor.buildSignalGroup(existingGroups.length);
		if (!group) return;

		playerSignalGroups[currentPlayer.name] = [...existingGroups, group];
		editor.showSuccess('信号组已添加！');
		editor.resetAfterAdd();
	}

	function removePlayerGroup(playerName: string, groupId: string) {
		playerSignalGroups[playerName] = (playerSignalGroups[playerName] || []).filter(g => g.id !== groupId).map((g, i) => ({ ...g, order: i }));
	}

	function movePlayerGroup(playerName: string, fromIndex: number, toIndex: number) {
		const groups = playerSignalGroups[playerName] || [];
		if (toIndex < 0 || toIndex >= groups.length) return;
		const newGroups = [...groups];
		const [removed] = newGroups.splice(fromIndex, 1);
		newGroups.splice(toIndex, 0, removed);
		playerSignalGroups[playerName] = newGroups.map((g, i) => ({ ...g, order: i }));
	}

	function updateGroupDuration(playerName: string, groupId: string, duration: number) {
		playerSignalGroups[playerName] = (playerSignalGroups[playerName] || []).map(g => {
			if (g.id !== groupId) return g;
			return { ...g, duration: Math.max(1, duration) };
		});
	}

	function submitAllAnswers() {
		if (!currentScenario) return;
		pauseTimer();

		const startTime = Date.now() - (currentScenario.timeLimit - remainingTime) * 1000;
		const submissions = playerConfigs.map(pc => ({
			playerId: pc.name,
			playerName: pc.name,
			roleType: pc.roleType,
			groups: buildUserScenarioGroups(playerSignalGroups[pc.name] || []),
			submittedAt: Date.now()
		}));

		const reactionTime = isTimeout ? currentScenario.timeLimit : currentScenario.timeLimit - remainingTime;
		const evaluation = evaluateCollaborativeTask(currentScenario, submissions, startTime, currentScenario.timeLimit);
		const result = createCollaborativeResult(currentScenario, evaluation, reactionTime, isTimeout);
		collaborativeTask.setResult(result);
		stage = 'result';
	}

	function backToSelect() {
		stage = 'select';
		currentScenario = null;
		playerConfigs = [];
		playerSignalGroups = {};
		editor.currentFlags = [];
		currentPlayerIndex = 0;
		collaborativeTask.clear();
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

	function getRoleColorClass(rt: CollaborativeRoleType): string {
		switch (rt) {
			case 'own-ship': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
			case 'target-ship': return 'bg-amber-500/20 text-amber-600 border-amber-500/30';
			case 'pilot-vessel': return 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30';
			case 'port-control': return 'bg-violet-500/20 text-violet-600 border-violet-500/30';
		}
	}

	function getRoleBgClass(rt: CollaborativeRoleType): string {
		switch (rt) {
			case 'own-ship': return 'bg-blue-500';
			case 'target-ship': return 'bg-amber-500';
			case 'pilot-vessel': return 'bg-emerald-500';
			case 'port-control': return 'bg-violet-500';
		}
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
				<Users class="w-8 h-8 text-primary-500" />
				<div>
					<h2 class="text-2xl font-bold text-surface-900-100-token">多人协同旗语演练</h2>
					<p class="text-surface-600-400-token mt-1">2-4人分工协作，在真实海事场景中模拟旗语通信</p>
				</div>
			</div>

			<div class="mb-6">
				<h3 class="block text-sm font-medium text-surface-700-300-token mb-3">选择场景类别</h3>
				<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
					{#each categoryOptions as opt}
						{@const Icon = opt.icon}
						<button
							onclick={() => (selectedCategory = opt.value)}
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

			{#if $collaborativeStatistics.totalSessions > 0}
				<div class="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
					<div class="flex items-center gap-2 mb-3">
						<BarChart3 class="w-4 h-4 text-primary-500" />
						<h4 class="font-semibold text-primary-600-400-token text-sm">团队历史协作能力</h4>
					</div>
					<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
						<div class="text-center">
							<div class="text-2xl font-bold text-surface-900-100-token">{$collaborativeStatistics.totalSessions}</div>
							<div class="text-xs text-surface-500">已完成协同</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-primary-500">{$collaborativeStatistics.averageScore}%</div>
							<div class="text-xs text-surface-500">平均得分</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-blue-500">{$collaborativeStatistics.averageConsistency}</div>
							<div class="text-xs text-surface-500">信号一致</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-amber-500">{$collaborativeStatistics.averageTiming}</div>
							<div class="text-xs text-surface-500">时序协调</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-emerald-500">{$collaborativeStatistics.averageCompleteness}</div>
							<div class="text-xs text-surface-500">响应完整</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-violet-500">{$collaborativeStatistics.averageCollaboration}</div>
							<div class="text-xs text-surface-500">协作度</div>
						</div>
					</div>
				</div>
			{/if}

			<div>
				<h3 class="block text-sm font-medium text-surface-700-300-token mb-3">
					选择协同演练场景
					<span class="text-xs text-surface-500 ml-2">({filteredScenarios.length} 个可用场景)</span>
				</h3>
				<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each filteredScenarios as scenario (scenario.id)}
						<div
							class="p-5 bg-surface-50-900-token rounded-xl border border-surface-200-700-token hover:border-primary-400 hover:shadow-lg transition-all cursor-pointer group"
							onclick={() => goToRoleSetup(scenario)}
						>
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
										{scenario.categoryLabel}
									</span>
									<span class="px-2 py-1 text-xs font-semibold rounded {getDifficultyClass(scenario.difficulty)}">
										{getDifficultyLabel(scenario.difficulty)}
									</span>
									<span class="px-2 py-1 text-xs font-semibold rounded bg-surface-200-700-token text-surface-600-400-token">
										{scenario.minPlayers}-{scenario.maxPlayers}人
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
							<div class="flex items-center gap-2 mb-3">
								{#each scenario.availableRoles as rt}
									{@const RoleIcon = roleIconMap[rt]}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded {getRoleColorClass(rt)}">
										<RoleIcon class="w-3 h-3" />
										{collaborativeRoleLabels[rt]}
									</span>
								{/each}
							</div>
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-1 text-xs text-surface-500">
									<Clock class="w-3.5 h-3.5" />
									{scenario.timeLimit}秒限时
								</span>
								<span class="flex items-center gap-1 text-xs text-surface-500">
									<Target class="w-3.5 h-3.5" />
									{scenario.collaborationRules.length}条协同规则
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

	{:else if stage === 'roleSetup' && currentScenario}
		<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-3">
					<Users class="w-7 h-7 text-primary-500" />
					<div>
						<h2 class="text-xl font-bold text-surface-900-100-token">{currentScenario.title}</h2>
						<p class="text-sm text-surface-600-400-token">设置玩家信息与角色分工</p>
					</div>
				</div>
				<button
					onclick={backToSelect}
					class="flex items-center gap-2 px-4 py-2 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
				>
					<RotateCcw class="w-4 h-4" />
					返回
				</button>
			</div>

			<div class="mb-6 p-4 bg-primary-500/5 rounded-lg border border-primary-500/20">
				<div class="flex items-start gap-3">
					<Info class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
					<div class="flex-1">
						<h4 class="font-semibold text-surface-900-100-token mb-1">场景背景</h4>
						<p class="text-sm text-surface-600-400-token leading-relaxed">{currentScenario.context}</p>
					</div>
				</div>
			</div>

			<div class="mb-6">
				<h3 class="block text-sm font-bold text-surface-700-300-token mb-4">玩家与角色配置（{currentScenario.minPlayers}-{currentScenario.maxPlayers}人）</h3>
				<div class="space-y-3">
					{#each playerConfigs as pc, i}
						{@const RoleIcon = roleIconMap[pc.roleType]}
						<div class="flex items-center gap-4 p-4 bg-surface-50-900-token rounded-xl border border-surface-200-700-token">
							<div class="flex items-center justify-center w-10 h-10 rounded-full {getRoleBgClass(pc.roleType)} text-white font-bold">
								{i + 1}
							</div>
							<div class="flex-1">
								<label class="block text-xs text-surface-500 mb-1">玩家名称</label>
								<input
									type="text"
									class="w-full px-3 py-2 bg-surface-100-800-token border border-surface-200-700-token rounded-lg text-surface-900-100-token focus:outline-none focus:border-primary-500"
									bind:value={pc.name}
									placeholder="请输入玩家名称"
								/>
							</div>
							<div class="w-40">
								<label class="block text-xs text-surface-500 mb-1">扮演角色</label>
								<div class="flex items-center gap-2 px-3 py-2 border rounded-lg {getRoleColorClass(pc.roleType)}">
									<RoleIcon class="w-4 h-4" />
									<span class="font-semibold text-sm">{collaborativeRoleLabels[pc.roleType]}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="mb-6">
				<h3 class="block text-sm font-bold text-surface-700-300-token mb-3">协同规则</h3>
				<div class="p-4 bg-warning-500/10 border border-warning-500/30 rounded-lg">
					<ul class="space-y-2">
						{#each currentScenario.collaborationRules as rule, i}
							<li class="flex items-start gap-2 text-sm text-surface-700-300-token">
								<span class="font-bold text-warning-500">{i + 1}.</span>
								<span>{rule}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>

			{#if editor.errorMessage}
				<div class="flex items-center gap-2 p-4 bg-error-500/20 border border-error-500/50 rounded-lg text-error-500 mb-6">
					<AlertTriangle class="w-5 h-5" />
					<span>{editor.errorMessage}</span>
				</div>
			{/if}

			<div class="flex justify-end">
				<button
					onclick={startScenario}
					class="flex items-center gap-3 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white text-lg font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
				>
					<UserPlus class="w-5 h-5" />
					开始协同演练
				</button>
			</div>
		</div>

	{:else if stage === 'playing' && currentScenario && currentPlayer && currentRoleTask}
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

			<div class="mb-6">
				<div class="flex items-center gap-2 mb-3">
					<Users class="w-4 h-4 text-surface-500" />
					<span class="text-sm font-medium text-surface-600-400-token">切换玩家角色：</span>
				</div>
				<div class="flex gap-2 flex-wrap">
					{#each playerConfigs as pc, i}
						{@const RoleIcon = roleIconMap[pc.roleType]}
						{@const hasGroups = (playerSignalGroups[pc.name] || []).length > 0}
						<button
							onclick={() => switchPlayer(i)}
							class="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all {i === currentPlayerIndex
								? `${getRoleBgClass(pc.roleType)} text-white border-transparent shadow-lg scale-105`
								: `${getRoleColorClass(pc.roleType)} hover:scale-[1.02]`}"
						>
							<RoleIcon class="w-4 h-4" />
							<span class="font-medium text-sm">{pc.name}</span>
							<span class="text-xs opacity-80">({collaborativeRoleLabels[pc.roleType]})</span>
							{#if hasGroups}
								<CheckCircle class="w-3.5 h-3.5" />
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="mb-6 p-5 rounded-xl border" style="border-color: color-mix(in srgb, {collaborativeRoles[currentPlayer.roleType].color} 30%, transparent); background: color-mix(in srgb, {collaborativeRoles[currentPlayer.roleType].color} 10%, transparent);">
				<div class="flex items-start gap-3 mb-4">
					<div class="p-2 rounded-lg" style="background: {collaborativeRoles[currentPlayer.roleType].color}20;">
						<currentPlayerRoleIcon class="w-6 h-6" style="color: {collaborativeRoles[currentPlayer.roleType].color};" />
					</div>
					<div class="flex-1">
						<h3 class="font-bold text-surface-900-100-token mb-1">
							{currentRoleTask.title}
							<span class="text-sm font-normal text-surface-500 ml-2">— 玩家：{currentPlayer.name}</span>
						</h3>
						<p class="text-sm text-surface-600-400-token leading-relaxed">{currentRoleTask.description}</p>
					</div>
				</div>
				<div class="grid md:grid-cols-2 gap-4">
					<div class="border-t border-surface-200-700-token pt-4">
						<h4 class="text-sm font-bold text-surface-700-300-token mb-2 flex items-center gap-2">
							<Info class="w-4 h-4 text-primary-500" />
							可见信息
						</h4>
						<ul class="space-y-1">
							{#each currentRoleTask.visibleInfo as info, i}
								<li class="flex items-start gap-2 text-sm text-surface-600-400-token">
									<span class="font-bold text-primary-500">{i + 1}.</span>
									<span>{info}</span>
								</li>
							{/each}
						</ul>
					</div>
					<div class="border-t border-surface-200-700-token pt-4">
						<h4 class="text-sm font-bold text-warning-600 mb-2 flex items-center gap-2">
							<Target class="w-4 h-4" />
							你需要发送的信号
						</h4>
						<ul class="space-y-1">
							{#each currentRoleTask.requiredGroups as rg, i}
								<li class="flex items-start gap-2 text-sm">
									<span class={`font-bold ${rg.critical ? 'text-error-500' : 'text-surface-500'}`}>{i + 1}.</span>
									<span>
										<span class="font-mono font-bold text-surface-900-100-token">{rg.codes.join(' · ')}</span>
										<span class="text-surface-500 ml-2">- {rg.meaning}</span>
										{#if rg.critical}
											<span class="ml-2 px-1.5 py-0.5 bg-error-500/20 text-error-500 text-xs font-semibold rounded">关键</span>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>

			<div class="mb-6">
				<FlagGroupEditor
					{editor}
					title="编排当前旗组（{currentPlayer.name}）"
					addButtonText="添加到发送序列"
					onAdd={addToPlayerGroups}
					showGroupDuration={true}
					useClampedDuration={true}
				/>
			</div>

			<SignalGroupList
				groups={currentPlayerGroups}
				title="{currentPlayer.name} 的信号发送序列"
				countLabel="个旗组"
				onRemoveGroup={(id) => removePlayerGroup(currentPlayer.name, id)}
				onMoveGroup={(from, to) => movePlayerGroup(currentPlayer.name, from, to)}
				onUpdateGroupDuration={(groupId, duration) => updateGroupDuration(currentPlayer.name, groupId, duration)}
			/>

			<div class="mt-6 flex items-center justify-between">
				<button
					onclick={backToSelect}
					class="flex items-center gap-2 px-5 py-3 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
				>
					<RotateCcw class="w-4 h-4" />
					放弃演练
				</button>
				<button
					onclick={submitAllAnswers}
					disabled={!allPlayersSubmitted}
					class="flex items-center gap-3 px-8 py-3 bg-success-500 hover:bg-success-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-bold text-lg shadow-lg"
				>
					<Send class="w-5 h-5" />
					{allPlayersSubmitted ? '提交所有答案并评分' : '请所有玩家完成旗组编排'}
				</button>
			</div>
		</div>

	{:else if stage === 'result'}
		<CollaborativeResultPanel onRestart={startNewTask} onBackToSelect={backToSelect} />
	{/if}
</div>
