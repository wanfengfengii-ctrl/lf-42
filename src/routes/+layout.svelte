<script lang="ts">
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { Flag, Dumbbell, BookOpen } from 'lucide-svelte';

	let { children } = $props();

	const navItems = [
		{ path: '/', label: '编排', icon: Flag },
		{ path: '/train', label: '训练', icon: Dumbbell },
		{ path: '/review', label: '复盘', icon: BookOpen }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div data-theme="modern" class="min-h-screen bg-surface-50-950-token text-surface-900-100-token">
	<header class="sticky top-0 z-50 bg-surface-100-800-token border-b border-surface-200-700-token shadow-md">
		<div class="container mx-auto px-4">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-3">
					<Flag class="w-8 h-8 text-primary-500" />
					<h1 class="text-xl font-bold text-surface-900-100-token">信号旗训练系统</h1>
				</div>
				
				<nav class="flex gap-1">
					{#each navItems as item}
						{@const NavIcon = item.icon}
						{@const isActive = $page.url.pathname === item.path}
						<a
							href={item.path}
							class="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200"
							class:bg-primary-500={isActive}
							class:text-white={isActive}
							class:bg-transparent={!isActive}
							class:text-surface-600-400-token={!isActive}
							class:hover:bg-surface-200-700-token={!isActive}
						>
							<NavIcon class="w-5 h-5" />
							<span>{item.label}</span>
						</a>
					{/each}
				</nav>
			</div>
		</div>
	</header>

	<main class="container mx-auto px-4 py-8">
		{@render children()}
	</main>
</div>
