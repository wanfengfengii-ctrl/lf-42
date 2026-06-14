<script lang="ts">
	import { CollaborativeMode } from '$lib';
	import { Users } from 'lucide-svelte';
</script>

<div class="space-y-6">
	<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
		<div class="flex items-center gap-3 mb-2">
			<Users class="w-8 h-8 text-primary-500" />
			<div>
				<h2 class="text-2xl font-bold text-surface-900-100-token">多人协同旗语演练</h2>
				<p class="text-surface-600-400-token mt-1">2-4人分工协作，模拟真实海事场景中的旗语通信与协同决策</p>
			</div>
		</div>
	</div>

	<CollaborativeMode />
</div>
