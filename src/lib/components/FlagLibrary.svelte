<script lang="ts">
	import { FlagImage } from '$lib';
	import { letterFlags, numberFlags, substituteFlags } from '$lib/data/flags';
	import type { Flag } from '$lib/types';
	import { Search } from 'lucide-svelte';

	let { onSelect }: { onSelect: (flag: Flag) => void } = $props();

	let searchQuery = $state('');
	let activeTab = $state<'letters' | 'numbers' | 'substitutes'>('letters');

	let filteredLetterFlags = $derived(letterFlags.filter(f =>
		f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
		f.meaning.includes(searchQuery)
	));

	let filteredNumberFlags = $derived(numberFlags.filter(f =>
		f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
		f.meaning.includes(searchQuery)
	));

	let filteredSubstituteFlags = $derived(substituteFlags.filter(f =>
		f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
		f.meaning.includes(searchQuery)
	));

	function getActiveFlags(): Flag[] {
		switch (activeTab) {
			case 'letters': return filteredLetterFlags;
			case 'numbers': return filteredNumberFlags;
			case 'substitutes': return filteredSubstituteFlags;
			default: return [];
		}
	}
</script>

<div class="bg-surface-100-800-token rounded-xl p-4 shadow-lg">
	<div class="flex items-center gap-3 mb-4">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="搜索旗帜名称、代码或含义..."
				class="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-50-900-token border border-surface-200-700-token focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
			/>
		</div>
	</div>

	<div class="flex gap-2 mb-4">
		<button
			class="px-4 py-2 rounded-lg font-medium transition-all {activeTab === 'letters' ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
			onclick={() => activeTab = 'letters'}
		>
			字母旗
		</button>
		<button
			class="px-4 py-2 rounded-lg font-medium transition-all {activeTab === 'numbers' ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
			onclick={() => activeTab = 'numbers'}
		>
			数字旗
		</button>
		<button
			class="px-4 py-2 rounded-lg font-medium transition-all {activeTab === 'substitutes' ? 'bg-primary-500 text-white' : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
			onclick={() => activeTab = 'substitutes'}
		>
			代旗
		</button>
	</div>

	<div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-80 overflow-y-auto pr-2">
		{#each getActiveFlags() as flag (flag.id)}
			<button
				class="group flex flex-col items-center p-2 rounded-lg bg-surface-50-900-token border border-transparent hover:border-primary-400 hover:bg-surface-100-800-token transition-all duration-200 cursor-pointer"
				onclick={() => onSelect(flag)}
			>
				<FlagImage {flag} size={60} />
				<span class="mt-2 text-xs font-semibold text-surface-700-300-token group-hover:text-primary-500 transition-colors">
					{flag.code}
				</span>
				<span class="text-[10px] text-surface-500 truncate w-full text-center">
					{flag.name}
				</span>
			</button>
		{/each}
	</div>

	{#if getActiveFlags().length === 0}
		<div class="text-center py-8 text-surface-500">
			没有找到匹配的旗帜
		</div>
	{/if}
</div>
