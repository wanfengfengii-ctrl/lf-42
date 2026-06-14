<script lang="ts">
	import type { Flag, WeatherCondition } from '$lib/types';

	let {
		flag,
		size = 80,
		animated = false,
		weather = 'calm'
	}: {
		flag: Flag;
		size?: number;
		animated?: boolean;
		weather?: WeatherCondition;
	} = $props();

	const aspectRatio = 1.5;
	const width = $derived(size);
	const height = $derived(size / aspectRatio);
	const waveAmplitude = $derived(weather === 'storm' ? 6 : weather === 'moderate' ? 2 : 0);
	const waveFrequency = $derived(weather === 'storm' ? 0.4 : weather === 'moderate' ? 0.2 : 0);
	const blurAmount = $derived(weather === 'storm' ? 1 : weather === 'fog' ? 3 : 0);
	const flagOpacity = $derived(weather === 'fog' ? 0.5 : weather === 'storm' ? 0.85 : 1);
	const swingAmount = $derived(weather === 'storm' ? 12 : weather === 'moderate' ? 4 : 0);
	const swingPositive = $derived(`${swingAmount}deg`);
	const swingNegative = $derived(`${-swingAmount}deg`);
	const filterStyle = $derived(blurAmount > 0 ? `blur(${blurAmount}px)` : 'none');
	const hasFogOverlay = $derived(weather === 'fog' || weather === 'storm');
	const hasRain = $derived(weather === 'storm');
	const cloudDensity = $derived(weather === 'fog' ? 0.6 : weather === 'storm' ? 0.3 : 0);

	const patternId = $derived(`pattern-${flag.id}`);
	const waveFilterId = $derived(`wave-${flag.id}`);
	const fogId = $derived(`fog-${flag.id}`);

	const colors = $derived(flag.colors.length > 0 ? flag.colors : ['#FFFFFF']);
	const bgColor = $derived(colors[0]);
	const crossColor = $derived(colors[1] || colors[0]);
	const cantonColor = $derived(colors[0]);
	const flyColor = $derived(colors[1] || colors[0]);
	const thirdColor = $derived(colors[2] || colors[1] || colors[0]);
	const checkerColor1 = $derived(colors[0]);
	const checkerColor2 = $derived(colors[1] || colors[0]);

	const stripeHeight = $derived(100 / colors.length);
	const stripeWidth = $derived(100 / colors.length);
	const crossWidth = 25;
	const cantonWidth = 50;
	const cantonHeight = 50;
	const squareSize = 25;

	const saltirePoints = $derived(
		`0,${33.33 - crossWidth / 2} ${50 - (crossWidth / 2) * 1.5},0 ${50 + (crossWidth / 2) * 1.5},0 100,${33.33 - crossWidth / 2} 100,${33.33 + crossWidth / 2} ${50 + (crossWidth / 2) * 1.5},66.67 ${50 - (crossWidth / 2) * 1.5},66.67 0,${33.33 + crossWidth / 2}`
	);

	const diagonalStripeWidth = $derived(142 / (colors.length * 2));
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 150 100"
	width={width}
	height={height}
	aria-label={flag.name}
	style:opacity={flagOpacity}
	style:filter={filterStyle}
	style:--swing-positive={swingPositive}
	style:--swing-negative={swingNegative}
	class:flag-animated={animated && (weather === 'moderate' || weather === 'storm')}
	class:flag-storm={animated && weather === 'storm'}
	class:flag-fog={weather === 'fog'}
>
	<defs>
		<filter id={waveFilterId} x="-10%" y="-10%" width="120%" height="120%">
			<feTurbulence
				type="fractalNoise"
				baseFrequency={waveFrequency}
				numOctaves="3"
				result="turbulence"
			>
				{#if animated && waveFrequency > 0}
					<animate
						attributeName="baseFrequency"
						values={`${waveFrequency};${waveFrequency * 1.5};${waveFrequency}`}
						dur="2s"
						repeatCount="indefinite"
					/>
				{/if}
			</feTurbulence>
			<feDisplacementMap
				in="SourceGraphic"
				in2="turbulence"
				scale={waveAmplitude}
				xChannelSelector="R"
				yChannelSelector="G"
			/>
		</filter>

		<filter id="flag-shadow" x="-20%" y="-20%" width="140%" height="140%">
			<feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3" />
		</filter>

		<linearGradient id="flag-fabric" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="rgba(255,255,255,0.1)" />
			<stop offset="50%" stop-color="rgba(255,255,255,0)" />
			<stop offset="100%" stop-color="rgba(0,0,0,0.08)" />
		</linearGradient>

		{#if hasFogOverlay}
			<filter id={fogId} x="-50%" y="-50%" width="200%" height="200%">
				<feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" result="fogNoise">
					<animate
						attributeName="baseFrequency"
						values="0.015;0.02;0.015"
						dur="8s"
						repeatCount="indefinite"
					/>
				</feTurbulence>
				<feColorMatrix
					in="fogNoise"
					type="matrix"
					values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0"
					result="fogWhite"
				/>
				<feComposite in="fogWhite" in2="SourceGraphic" operator="in" result="fogOnFlag" />
			</filter>
		{/if}

		{#if flag.pattern === 'diagonal' && colors.length > 1}
			{#each colors as color, i}
				{#if i > 0}
					<pattern
						id={`${patternId}-diag-${i}`}
						patternUnits="userSpaceOnUse"
						width="142"
						height="142"
						patternTransform="rotate(45)"
					>
						<rect width="142" height="142" fill="transparent" />
						<rect
							x={i * 2 * diagonalStripeWidth}
							width={diagonalStripeWidth}
							height="142"
							fill={colors[i % colors.length]}
						/>
					</pattern>
				{/if}
			{/each}
		{/if}

		{#if flag.pattern === 'saltire' && colors.length >= 2}
			<pattern
				id={`${patternId}-saltire`}
				patternUnits="userSpaceOnUse"
				width="100"
				height="66.67"
				viewBox="0 0 100 66.67"
			>
				<rect width="100" height="66.67" fill="transparent" />
				<polygon points={saltirePoints} fill={crossColor} />
			</pattern>
		{/if}
	</defs>

	<g filter={animated && waveAmplitude > 0 ? `url(#${waveFilterId})` : 'url(#flag-shadow)'}>
		<g class="flag-body">
			{#if flag.pattern === 'solid'}
				<rect width="100%" height="100%" fill={bgColor} />
			{/if}

			{#if flag.pattern === 'horizontal'}
				{#each colors as color, i}
					<rect
						y={i * stripeHeight + '%'}
						width="100%"
						height={stripeHeight + '%'}
						fill={color}
					/>
				{/each}
			{/if}

			{#if flag.pattern === 'vertical'}
				{#each colors as color, i}
					<rect
						x={i * stripeWidth + '%'}
						width={stripeWidth + '%'}
						height="100%"
						fill={color}
					/>
				{/each}
			{/if}

			{#if flag.pattern === 'diagonal'}
				<rect width="100%" height="100%" fill={bgColor} />
				{#if colors.length > 1}
					{#each colors as color, i}
						{#if i > 0}
							<rect width="100%" height="100%" fill={`url(#${patternId}-diag-${i})`} />
						{/if}
					{/each}
				{/if}
			{/if}

			{#if flag.pattern === 'cross'}
				<rect width="100%" height="100%" fill={bgColor} />
				<rect
					x={(100 - crossWidth) / 2 + '%'}
					y="0"
					width={crossWidth + '%'}
					height="100%"
					fill={crossColor}
				/>
				<rect
					x="0"
					y={(100 - crossWidth) / 2 + '%'}
					width="100%"
					height={crossWidth + '%'}
					fill={crossColor}
				/>
			{/if}

			{#if flag.pattern === 'saltire'}
				<rect width="100%" height="100%" fill={bgColor} />
				{#if colors.length >= 2}
					<rect width="100%" height="100%" fill={`url(#${patternId}-saltire)`} />
				{/if}
			{/if}

			{#if flag.pattern === 'canton'}
				{#if colors.length >= 3}
					{#each { length: 7 } as _, i}
						<rect
							y={i * (100 / 7) + '%'}
							width="100%"
							height={(100 / 7) + '%'}
							fill={i % 2 === 0 ? flyColor : thirdColor}
						/>
					{/each}
				{:else}
					<rect width="100%" height="100%" fill={flyColor} />
				{/if}
				<rect
					width={cantonWidth + '%'}
					height={cantonHeight + '%'}
					fill={cantonColor}
				/>
			{/if}

			{#if flag.pattern === 'checker'}
				<rect width="100%" height="100%" fill={checkerColor1} />
				{#each { length: 4 } as _, row}
					{#each { length: 6 } as _, col}
						{#if (row + col) % 2 === 1}
							<rect
								x={col * squareSize + '%'}
								y={row * squareSize + '%'}
								width={squareSize + '%'}
								height={squareSize + '%'}
								fill={checkerColor2}
							/>
						{/if}
					{/each}
				{/each}
			{/if}
		</g>

		<rect width="100%" height="100%" fill="url(#flag-fabric)" pointer-events="none" />

		<path
			d="M0,0 Q5,5 0,10 M0,20 Q5,25 0,30 M0,40 Q5,45 0,50 M0,60 Q5,65 0,70 M0,80 Q5,85 0,90 M0,100"
			stroke="rgba(0,0,0,0.15)"
			stroke-width="0.5"
			fill="none"
		/>
	</g>

	{#if hasFogOverlay && animated}
		<g class="fog-overlay" opacity={cloudDensity}>
			<rect width="100%" height="100%" fill={`url(#${fogId})`} />
		</g>
	{/if}

	{#if hasRain && animated}
		<g class="rain-container">
			{#each Array.from({ length: 12 }) as _, i}
				<line
					x1={10 + (i * 12) % 140}
					y1="-5"
					x2={5 + (i * 12) % 140}
					y2="8"
					stroke="rgba(200, 220, 255, 0.6)"
					stroke-width="1"
					class="rain-drop"
					style:animation-delay={`${i * 0.15}s`}
				/>
			{/each}
		</g>
	{/if}

	<rect x="0" y="0" width="1.5" height="100%" fill="#8B7355" rx="0.5" />
	<rect x="0" y="-2" width="1.5" height="4" fill="#654321" rx="0.5" />
</svg>

<style>
	.flag-animated {
		animation: flag-swing 3s ease-in-out infinite;
		transform-origin: left center;
	}

	.flag-storm {
		animation-duration: 1s;
		animation-timing-function: ease-in-out;
	}

	@keyframes flag-swing {
		0%,
		100% {
			transform: rotate(0deg) skewY(0deg);
		}
		25% {
			transform: rotate(var(--swing-positive, 2deg)) skewY(1deg);
		}
		50% {
			transform: rotate(0deg) skewY(0deg);
		}
		75% {
			transform: rotate(var(--swing-negative, -2deg)) skewY(-1deg);
		}
	}

	.fog-overlay {
		animation: fog-drift 6s ease-in-out infinite;
		mix-blend-mode: screen;
	}

	@keyframes fog-drift {
		0%,
		100% {
			transform: translateX(0);
			opacity: 0.6;
		}
		50% {
			transform: translateX(5px);
			opacity: 0.8;
		}
	}

	.rain-drop {
		animation: rain-fall 0.6s linear infinite;
	}

	@keyframes rain-fall {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		10% {
			opacity: 0.6;
		}
		90% {
			opacity: 0.6;
		}
		100% {
			transform: translateY(105px);
			opacity: 0;
		}
	}

	.flag-fog {
		transition: opacity 0.5s ease, filter 0.5s ease;
	}

	svg {
		display: block;
	}
</style>
