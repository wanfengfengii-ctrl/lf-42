<script lang="ts">
	import { FlagImage, FlagLibrary } from '$lib';
	import type { SignalFlag, Flag } from '$lib/types';
	import { signalGroups } from '$lib/stores/signalStore';
	import { validateDuration, validateFlagOrder } from '$lib/utils/validation';
	import { Plus, Trash2, ArrowUp, ArrowDown, AlertCircle, Check, GripVertical } from 'lucide-svelte';
	import type { ValidationResult } from '$lib/types';

	let currentFlags = $state<SignalFlag[]>([]);
	let showLibrary = $state(false);
	let validationResult = $state<ValidationResult | null>(null);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let orderValidation = $derived(currentFlags.length > 0 ? validateFlagOrder(currentFlags) : null);

	function addFlag(flag: Flag) {
		if (currentFlags.length >= 5) {
			errorMessage = '信号组最多包含5面旗帜';
			setTimeout(() => errorMessage = null, 3000);
			return;
		}
		currentFlags.push({ flag, duration: 3 });
		showLibrary = false;
	}

	function removeFlag(index: number) {
		currentFlags.splice(index, 1);
	}

	function updateDuration(index: number, duration: number) {
		const validation = validateDuration(duration);
		if (!validation.valid) {
			errorMessage = validation.message || '无效的停留时间';
			setTimeout(() => errorMessage = null, 3000);
			return;
		}
		currentFlags[index].duration = duration;
	}

	function moveFlag(fromIndex: number, toIndex: number) {
		if (toIndex < 0 || toIndex >= currentFlags.length) return;
		const [removed] = currentFlags.splice(fromIndex, 1);
		currentFlags.splice(toIndex, 0, removed);
	}

	function clearCurrent() {
		currentFlags = [];
		validationResult = null;
	}

	function addToSignal() {
		if (currentFlags.length === 0) {
			errorMessage = '请至少选择一面旗帜';
			setTimeout(() => errorMessage = null, 3000);
			return;
		}

		const result = signalGroups.addGroup(currentFlags);
		if (!result.success) {
			validationResult = { valid: false, message: result.message };
			errorMessage = result.message || '添加失败';
			setTimeout(() => errorMessage = null, 3000);
			return;
		}

		validationResult = { valid: true };
		successMessage = '信号组添加成功！';
		setTimeout(() => {
			successMessage = null;
			validationResult = null;
		}, 2000);
		currentFlags = [];
	}

	function removeGroup(id: string) {
		signalGroups.removeGroup(id);
	}

	function moveGroup(fromIndex: number, toIndex: number) {
		signalGroups.moveGroup(fromIndex, toIndex);
	}
</script>

<div class="space-y-6">
	{#if errorMessage}
		<div class="flex items-center gap-2 p-4 bg-error-500/20 border border-error-500/50 rounded-lg text-error-500">
			<AlertCircle class="w-5 h-5" />
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="flex items-center gap-2 p-4 bg-success-500/20 border border-success-500/50 rounded-lg text-success-500">
			<Check class="w-5 h-5" />
			<span>{successMessage}</span>
		</div>
	{/if}

	<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-xl font-bold text-surface-900-100-token">编排旗组</h3>
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

		<div class="mb-6">
			<div class="flex items-center justify-between mb-3">
				<span class="text-sm font-medium text-surface-600-400-token">当前旗组</span>
				{#if orderValidation && !orderValidation.valid}
					<span class="text-xs text-error-500 flex items-center gap-1">
						<AlertCircle class="w-3 h-3" />
						{orderValidation.message}
					</span>
				{/if}
			</div>
			
			{#if currentFlags.length === 0}
				<div class="border-2 border-dashed border-surface-300-600-token rounded-xl p-8 text-center text-surface-500">
					点击上方按钮从旗帜库选择旗帜
				</div>
			{:else}
				<div class="space-y-3">
					{#each currentFlags as sf, index (sf.flag.id + index)}
						<div class="flex items-center gap-4 p-3 bg-surface-50-900-token rounded-lg border border-surface-200-700-token {orderValidation && !orderValidation.valid ? 'border-error-500/50 bg-error-500/10' : ''}">
							<div class="cursor-move text-surface-400 hover:text-surface-600">
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
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-2">
									<label for={`duration-${index}`} class="text-sm text-surface-600-400-token">停留(秒):</label>
									<input
										id={`duration-${index}`}
										type="number"
										min="0.5"
										max="30"
										step="0.5"
										value={sf.duration}
										onchange={(e) => updateDuration(index, parseFloat((e.target as HTMLInputElement).value))}
										class="w-20 px-2 py-1 rounded border border-surface-300-600-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
									/>
								</div>
								<div class="flex flex-col gap-1">
									<button
										onclick={() => moveFlag(index, index - 1)}
										disabled={index === 0}
										class="p-1 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
										title="上移"
									>
										<ArrowUp class="w-4 h-4" />
									</button>
									<button
										onclick={() => moveFlag(index, index + 1)}
										disabled={index === currentFlags.length - 1}
										class="p-1 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
										title="下移"
									>
										<ArrowDown class="w-4 h-4" />
									</button>
								</div>
								<button
									onclick={() => removeFlag(index)}
									class="p-2 rounded hover:bg-error-500/20 text-error-500 transition-colors"
									title="删除"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if currentFlags.length > 0}
			<div class="flex justify-end gap-3">
				<button
					onclick={clearCurrent}
					class="px-4 py-2 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
				>
					清空
				</button>
				<button
					onclick={addToSignal}
					disabled={orderValidation ? !orderValidation.valid : false}
					class="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
				>
					<Plus class="w-4 h-4" />
					添加到信号序列
				</button>
			</div>
		{/if}
	</div>

	<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
		<h3 class="text-xl font-bold text-surface-900-100-token mb-4">
			信号序列
			<span class="text-sm font-normal text-surface-500 ml-2">({$signalGroups.length} 个旗组)</span>
		</h3>

		{#if $signalGroups.length === 0}
			<div class="border-2 border-dashed border-surface-300-600-token rounded-xl p-8 text-center text-surface-500">
				还没有添加任何信号组
			</div>
		{:else}
			<div class="space-y-4">
				{#each $signalGroups as group, index (group.id)}
					<div class="p-4 bg-surface-50-900-token rounded-lg border border-surface-200-700-token">
						<div class="flex items-start justify-between mb-3">
							<div>
								<div class="flex items-center gap-2">
									<span class="px-2 py-1 bg-primary-100-800-token text-primary-700-300-token text-xs font-semibold rounded">
										#{index + 1}
									</span>
									<span class="font-mono text-lg font-bold text-surface-900-100-token">
										{group.flags.map(f => f.flag.code).join(' ')}
									</span>
								</div>
								<p class="text-sm text-surface-600-400-token mt-2">{group.meaning}</p>
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
									disabled={index === $signalGroups.length - 1}
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
						<div class="flex items-center gap-3 flex-wrap">
							{#each group.flags as sf, i (sf.flag.id + i)}
								<div class="flex items-center gap-2 px-2 py-1 bg-surface-100-800-token rounded">
									<FlagImage flag={sf.flag} size={30} />
									<span class="text-xs text-surface-600-400-token">{sf.duration}s</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
