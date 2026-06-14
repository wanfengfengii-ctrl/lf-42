<script lang="ts">
	import { SignalComposer, SignalPlayer } from '$lib';
</script>

<div class="space-y-6">
	<div class="bg-surface-100-800-token rounded-xl p-6 shadow-lg">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold text-surface-900-100-token mb-2">信号编排</h2>
				<p class="text-surface-600-400-token">创建和管理信号旗组序列，天气干扰可在播放器区域调节</p>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-5 gap-6">
		<div class="lg:col-span-3">
			<SignalComposer />
		</div>
		<div class="lg:col-span-2">
			<SignalPlayer flagSize={100} />
		</div>
	</div>
</div>
