<script lang="ts">
	import { FlagGroupEditor, SignalGroupList } from '$lib';
	import { signalGroups } from '$lib/stores/signalStore';
	import { createFlagGroupEditor } from '$lib/composables/useFlagGroupEditor.svelte';

	const editor = createFlagGroupEditor();

	function addToSignal() {
		if (editor.currentFlags.length === 0) {
			editor.showError('请至少选择一面旗帜');
			return;
		}

		const result = signalGroups.addGroup([...editor.currentFlags]);
		if (!result.success) {
			editor.showError(result.message || '添加失败');
			return;
		}

		editor.showSuccess('信号组添加成功！');
		editor.currentFlags = [];
	}

	function removeGroup(id: string) {
		signalGroups.removeGroup(id);
	}

	function moveGroup(fromIndex: number, toIndex: number) {
		signalGroups.moveGroup(fromIndex, toIndex);
	}
</script>

<div class="space-y-6">
	<FlagGroupEditor
		{editor}
		title="编排旗组"
		addButtonText="添加到信号序列"
		onAdd={addToSignal}
		showGroupDuration={false}
	/>

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
			<SignalGroupList
				groups={$signalGroups}
				title=""
				countLabel="个旗组"
				onRemoveGroup={removeGroup}
				onMoveGroup={moveGroup}
			/>
		{/if}
	</div>
</div>
