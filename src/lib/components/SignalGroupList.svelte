<script lang="ts">
	import { FlagImage } from '$lib';
	import type { SignalGroup } from '$lib/types';
	import { Trash2, ArrowUp, ArrowDown, Clock } from 'lucide-svelte';

	let {
		groups,
		title = '信号序列',
		countLabel,
		onRemoveGroup,
		onMoveGroup,
		onUpdateGroupDuration,
		onUpdateFlagDuration,
		showFlagDurationEdit = false,
	}: {
		groups: SignalGroup[];
		title?: string;
		countLabel?: string;
		onRemoveGroup: (id: string) => void;
		onMoveGroup: (fromIndex: number, toIndex: number) => void;
		onUpdateGroupDuration?: (groupId: string, duration: number) => void;
		onUpdateFlagDuration?: (groupId: string, flagIndex: number, duration: number) => void;
		showFlagDurationEdit?: boolean;
	} = $props();
</script>

<div class="bg-surface-50-900-token rounded-xl p-6 border border-surface-200-700-token">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-xl font-bold text-surface-900-100-token">
			{title}
			<span class="text-sm font-normal text-surface-500 ml-2">({groups.length} {countLabel || '个旗组'})</span>
		</h3>
		<span class="text-xs text-surface-500">按发送顺序排列（从上到下）</span>
	</div>

	{#if groups.length === 0}
		<div class="border-2 border-dashed border-surface-300-600-token rounded-xl p-8 text-center text-surface-500">
			还没有添加任何信号组。请先编排旗组并添加到序列中。
		</div>
	{:else}
		<div class="space-y-4">
			{#each groups as group, index (group.id)}
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
							{#if group.meaning}
								<p class="text-sm text-surface-600-400-token mt-2">{group.meaning}</p>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<button
								onclick={() => onMoveGroup(index, index - 1)}
								disabled={index === 0}
								class="p-2 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
							>
								<ArrowUp class="w-4 h-4" />
							</button>
							<button
								onclick={() => onMoveGroup(index, index + 1)}
								disabled={index === groups.length - 1}
								class="p-2 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
							>
								<ArrowDown class="w-4 h-4" />
							</button>
							<button
								onclick={() => onRemoveGroup(group.id)}
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
								{#if showFlagDurationEdit && onUpdateFlagDuration}
									<div class="flex items-center gap-1 text-xs text-surface-600-400-token">
										<Clock class="w-3 h-3 text-primary-500" />
										<input
											type="number"
											class="w-12 text-center text-xs font-bold bg-surface-100-800-token rounded px-1 py-0.5 border-none outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
											value={sf.duration}
											onchange={(e) => onUpdateFlagDuration(group.id, i, Number((e.target as HTMLInputElement).value))}
											min={1}
											max={20}
										/>
										<span>秒</span>
									</div>
								{:else}
									<span class="text-xs text-surface-600-400-token">{sf.duration}s</span>
								{/if}
							</div>
						{/each}
					</div>
					{#if onUpdateGroupDuration}
						<div class="flex items-center gap-3 p-2 bg-primary-500/5 rounded border border-primary-500/20">
							<label class="text-xs font-semibold text-primary-600 whitespace-nowrap flex items-center gap-1">
								<Clock class="w-3 h-3" />
								组停留时间：
							</label>
							<input
								type="range"
								class="flex-1 h-1.5 bg-surface-200-700-token rounded appearance-none cursor-pointer accent-primary-500"
								value={group.duration}
								oninput={(e) => onUpdateGroupDuration(group.id, Number((e.target as HTMLInputElement).value))}
								min={1}
								max={15}
							/>
							<div class="flex items-center gap-1 min-w-[70px]">
								<input
									type="number"
									class="w-10 text-center text-sm font-bold bg-transparent border-none outline-none text-primary-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
									value={group.duration}
									onchange={(e) => onUpdateGroupDuration(group.id, Number((e.target as HTMLInputElement).value))}
									min={1}
									max={15}
								/>
								<span class="text-xs text-surface-500">秒</span>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
