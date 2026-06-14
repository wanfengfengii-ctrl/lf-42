<script lang="ts">
	import { FlagImage, FlagLibrary } from '$lib';
	import type { SignalFlag } from '$lib/types';
	import type { ValidationResult } from '$lib/types';
	import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle, GripVertical, Clock, CheckCircle } from 'lucide-svelte';

	interface EditorHandle {
		currentFlags: SignalFlag[];
		showLibrary: boolean;
		errorMessage: string | null;
		successMessage: string | null;
		currentGroupDuration: number;
		orderValidation: ValidationResult | null;
		addFlag: (flag: import('$lib/types').Flag) => void;
		removeFlag: (index: number) => void;
		moveFlag: (from: number, to: number) => void;
		updateFlagDuration: (index: number, duration: number) => void;
		updateFlagDurationClamped: (index: number, duration: number) => void;
		clearCurrent: () => void;
		toggleLibrary: () => void;
	}

	let {
		editor,
		title = '编排旗组',
		addButtonText = '添加到信号序列',
		onAdd,
		showGroupDuration = true,
		useClampedDuration = false,
	}: {
		editor: EditorHandle;
		title?: string;
		addButtonText?: string;
		onAdd: () => void;
		showGroupDuration?: boolean;
		useClampedDuration?: boolean;
	} = $props();
</script>

<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
	{#if editor.errorMessage}
		<div class="flex items-center gap-2 p-4 bg-error-500/20 border border-error-500/50 rounded-lg text-error-500 mb-6">
			<AlertTriangle class="w-5 h-5" />
			<span>{editor.errorMessage}</span>
		</div>
	{/if}
	{#if editor.successMessage}
		<div class="flex items-center gap-2 p-4 bg-success-500/20 border border-success-500/50 rounded-lg text-success-500 mb-6">
			<CheckCircle class="w-5 h-5" />
			<span>{editor.successMessage}</span>
		</div>
	{/if}

	<div class="flex items-center justify-between mb-4">
		<h3 class="text-xl font-bold text-surface-900-100-token">{title}</h3>
		<button
			onclick={() => editor.toggleLibrary()}
			class="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
		>
			<Plus class="w-4 h-4" />
			从旗帜库选择
		</button>
	</div>

	{#if editor.showLibrary}
		<div class="mb-6">
			<FlagLibrary onSelect={(flag) => editor.addFlag(flag)} />
		</div>
	{/if}

	<div class="mb-6">
		<div class="flex items-center justify-between mb-3">
			<span class="text-sm font-medium text-surface-600-400-token">当前编辑旗组</span>
			{#if editor.orderValidation && !editor.orderValidation.valid}
				<span class="text-xs text-error-500 flex items-center gap-1">
					<AlertTriangle class="w-3 h-3" />
					{editor.orderValidation.message}
				</span>
			{/if}
		</div>

		{#if editor.currentFlags.length === 0}
			<div class="border-2 border-dashed border-surface-300-600-token rounded-xl p-8 text-center text-surface-500">
				点击上方按钮从旗帜库选择旗帜
			</div>
		{:else}
			<div class="space-y-3">
				{#each editor.currentFlags as sf, index (sf.flag.id + index)}
					<div class="flex items-center gap-4 p-3 bg-surface-50-900-token rounded-lg border border-surface-200-700-token {editor.orderValidation && !editor.orderValidation.valid ? 'border-error-500/50 bg-error-500/10' : ''}">
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
						{#if useClampedDuration}
							<div class="flex items-center gap-2 px-2 py-1 bg-surface-100-800-token rounded-lg">
								<Clock class="w-3.5 h-3.5 text-primary-500" />
								<input
									type="number"
									class="w-14 text-center text-sm font-bold bg-transparent border-none outline-none text-surface-900-100-token [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
									value={sf.duration}
									onchange={(e) => editor.updateFlagDurationClamped(index, Number((e.target as HTMLInputElement).value))}
									min={1}
									max={20}
								/>
								<span class="text-xs text-surface-500">秒</span>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<label for={`duration-${index}`} class="text-sm text-surface-600-400-token">停留(秒):</label>
								<input
									id={`duration-${index}`}
									type="number"
									min="0.5"
									max="30"
									step="0.5"
									value={sf.duration}
									onchange={(e) => editor.updateFlagDuration(index, parseFloat((e.target as HTMLInputElement).value))}
									class="w-20 px-2 py-1 rounded border border-surface-300-600-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
						{/if}
						<div class="flex flex-col gap-1">
							<button
								onclick={() => editor.moveFlag(index, index - 1)}
								disabled={index === 0}
								class="p-1 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
								title="上移"
							>
								<ArrowUp class="w-4 h-4" />
							</button>
							<button
								onclick={() => editor.moveFlag(index, index + 1)}
								disabled={index === editor.currentFlags.length - 1}
								class="p-1 rounded hover:bg-surface-200-700-token disabled:opacity-30 disabled:cursor-not-allowed"
								title="下移"
							>
								<ArrowDown class="w-4 h-4" />
							</button>
						</div>
						<button
							onclick={() => editor.removeFlag(index)}
							class="p-2 rounded hover:bg-error-500/20 text-error-500 transition-colors"
							title="删除"
						>
							<Trash2 class="w-4 h-4" />
						</button>
					</div>
				{/each}
			</div>

			{#if showGroupDuration}
				<div class="mt-4 p-4 bg-primary-500/5 rounded-lg border border-primary-500/20">
					<div class="flex items-center justify-between mb-2">
						<label class="text-sm font-semibold text-surface-700-300-token flex items-center gap-2">
							<Clock class="w-4 h-4 text-primary-500" />
							该旗组整体停留时间{useClampedDuration ? '' : '（建议关键信号停留更久）'}
						</label>
					</div>
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2 flex-1">
							<input
								type="range"
								class="flex-1 h-2 bg-surface-200-700-token rounded-lg appearance-none cursor-pointer accent-primary-500"
								bind:value={editor.currentGroupDuration}
								min={1}
								max={15}
							/>
							<span class="text-2xl font-bold text-primary-500 min-w-[60px] text-center">{editor.currentGroupDuration}<span class="text-xs text-surface-500 font-normal ml-1">秒</span></span>
						</div>
						<div class="flex gap-2">
							<button
								onclick={() => editor.currentGroupDuration = 3}
								class="px-3 py-1 text-xs rounded-lg {editor.currentGroupDuration === 3 ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
							>3秒普通</button>
							<button
								onclick={() => editor.currentGroupDuration = 5}
								class="px-3 py-1 text-xs rounded-lg {editor.currentGroupDuration === 5 ? 'bg-warning-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
							>5秒重要</button>
							<button
								onclick={() => editor.currentGroupDuration = 8}
								class="px-3 py-1 text-xs rounded-lg {editor.currentGroupDuration === 8 ? 'bg-error-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
							>8秒紧急</button>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	{#if editor.currentFlags.length > 0}
		<div class="flex justify-end gap-3">
			<button
				onclick={() => editor.clearCurrent()}
				class="px-4 py-2 bg-surface-200-700-token hover:bg-surface-300-600-token rounded-lg transition-colors"
			>
				清空
			</button>
			<button
				onclick={onAdd}
				disabled={editor.orderValidation ? !editor.orderValidation.valid : false}
				class="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
			>
				<Plus class="w-4 h-4" />
				{addButtonText}
			</button>
		</div>
	{/if}
</div>
