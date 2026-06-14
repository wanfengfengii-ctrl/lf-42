<script lang="ts">
	import type { Flag, WeatherEffect } from '$lib/types';

	let {
		flag,
		size = 80,
		animated = false,
		weatherIntensity = 0
	}: {
		flag: Flag;
		size?: number;
		animated?: boolean;
		weatherIntensity?: number;
	} = $props();

	const aspectRatio = 1.5;
	const width = $derived(size);
	const height = $derived(size / aspectRatio);
	const intensity = $derived(Math.max(0, Math.min(100, weatherIntensity)));

	const weatherEffect = $derived(computeWeatherEffect(intensity));
	const waveAmplitude = $derived(weatherEffect.waveAmplitude);
	const waveFrequency = $derived(0.05 + (intensity / 100) * 0.8);
	const blurAmount = $derived(weatherEffect.blurAmount);
	const flagOpacity = $derived(Math.max(0.05, 1 - weatherEffect.visibility / 100 * 0.95));
	const swingAmount = $derived(weatherEffect.swingAmplitude);
	const swingPositive = $derived(`${swingAmount}deg`);
	const swingNegative = $derived(`${-swingAmount}deg`);
	const skewAmount = $derived(weatherEffect.swingAmplitude * 0.35);
	const skewPositive = $derived(`${skewAmount}deg`);
	const skewNegative = $derived(`${-skewAmount}deg`);
	const brightnessFilter = $derived(
		intensity > 50 
			? `brightness(${Math.max(0.4, 1 - (intensity - 50) / 50 * 0.45)})` 
			: intensity > 20
			? `brightness(${1 - (intensity - 20) / 30 * 0.15})`
			: 'none'
	);
	const contrastFilter = $derived(
		intensity > 30 
			? `contrast(${Math.max(0.5, 1 - (intensity - 30) / 70 * 0.5)})` 
			: 'none'
	);
	const saturateFilter = $derived(
		intensity > 40 
			? `saturate(${Math.max(0.3, 1 - (intensity - 40) / 60 * 0.7)})` 
			: 'none'
	);
	const filterParts = $derived([
		blurAmount > 0 ? `blur(${blurAmount.toFixed(1)}px)` : null,
		brightnessFilter !== 'none' ? brightnessFilter : null,
		contrastFilter !== 'none' ? contrastFilter : null,
		saturateFilter !== 'none' ? saturateFilter : null,
	].filter(Boolean).join(' '));
	const filterStyle = $derived(filterParts || 'none');

	const hasFog = $derived(intensity > 10);
	const fogLevel = $derived(
		intensity <= 10 ? 0 :
		intensity <= 30 ? 1 :
		intensity <= 55 ? 2 :
		intensity <= 80 ? 3 : 4
	);
	const hasRain = $derived(weatherEffect.rainIntensity > 0);
	const rainLevel = $derived(
		intensity <= 45 ? 0 :
		intensity <= 65 ? 1 :
		intensity <= 85 ? 2 : 3
	);
	const hasStorm = $derived(intensity > 85);
	const hasLightning = $derived(weatherEffect.lightningFrequency > 0);
	const hasWindDebris = $derived(weatherEffect.debrisAmount > 0);
	const cloudDensity = $derived(weatherEffect.fogOpacity);
	const fogOpacity = $derived(weatherEffect.fogOpacity);
	const rainCount = $derived(Math.round(weatherEffect.rainIntensity * 60));
	const rainAngle = $derived(Math.min(45, intensity * 0.5));
	const debrisCount = $derived(Math.round(weatherEffect.debrisAmount * 15));
	const difficultyMultiplier = $derived(weatherEffect.difficultyMultiplier);

	const hasWaveDistortion = $derived(animated && waveAmplitude > 0.5);
	const hasRandomOcclusion = $derived(intensity > 50 && animated);
	const occlusionOpacity = $derived(
		intensity <= 50 ? 0 :
		intensity <= 70 ? (intensity - 50) / 20 * 0.3 :
		0.3 + (intensity - 70) / 30 * 0.5
	);
	const swingSpeedMultiplier = $derived(
		intensity <= 30 ? 1 :
		intensity <= 60 ? 1 - (intensity - 30) / 30 * 0.3 :
		0.7 - (intensity - 60) / 40 * 0.35
	);
	const fabricStretchAmount = $derived(
		intensity <= 40 ? 0 :
		(intensity - 40) / 60 * 15
	);

	const patternId = $derived(`pattern-${flag.id}`);
	const waveFilterId = $derived(`wave-${flag.id}`);
	const fogId = $derived(`fog-${flag.id}`);
	const occlusionId = $derived(`occlusion-${flag.id}`);

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

	function computeWeatherEffect(i: number): WeatherEffect {
		const norm = i / 100;
		return {
			visibility: Math.max(5, 100 - norm * 95),
			swingAmplitude: norm > 0.1 ? (norm * 28) : 0,
			waveAmplitude: norm > 0.05 ? Math.min(18, norm * 22) : 0,
			blurAmount: i > 25 ? Math.min(12, (i - 25) / 6.25) : 0,
			fogOpacity: i <= 10 ? 0 : i <= 40 ? (i - 10) / 30 * 0.5 : 0.5 + (i - 40) / 60 * 0.45,
			rainIntensity: i <= 40 ? 0 : i <= 60 ? (i - 40) / 20 * 0.4 : i <= 80 ? 0.4 + (i - 60) / 20 * 0.35 : 0.75 + (i - 80) / 20 * 0.25,
			lightningFrequency: i < 70 ? 0 : i <= 85 ? (i - 70) / 15 * 0.5 : 0.5 + (i - 85) / 15 * 0.5,
			debrisAmount: i <= 60 ? 0 : i <= 80 ? (i - 60) / 20 * 0.5 : 0.5 + (i - 80) / 20 * 0.5,
			occlusionStrength: i <= 50 ? 0 : i <= 70 ? (i - 50) / 20 * 0.3 : 0.3 + (i - 70) / 30 * 0.5,
			difficultyMultiplier: 1 + norm * 4
		};
	}

	function getIntensityLabel(i: number): string {
		if (i === 0) return '晴';
		if (i <= 15) return '晴间多云';
		if (i <= 30) return '微风轻浪';
		if (i <= 45) return '轻雾';
		if (i <= 60) return '中雨强风';
		if (i <= 75) return '大雾';
		if (i <= 85) return '暴雨';
		if (i <= 95) return '暴风';
		return '台风';
	}
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
	style:--skew-positive={skewPositive}
	style:--skew-negative={skewNegative}
	style:--rain-angle={rainAngle + 'deg'}
	style:--swing-duration={`${(3 / Math.max(0.1, swingSpeedMultiplier)).toFixed(2)}s`}
	style:--fabric-stretch={fabricStretchAmount + '%'}
	class:flag-animated={animated && intensity > 5}
	class:flag-strong={animated && intensity > 40 && intensity <= 60}
	class:flag-storm={animated && intensity > 60 && intensity <= 85}
	class:flag-hurricane={animated && intensity > 85}
	class:flag-light-fog={fogLevel >= 1 && fogLevel <= 2 && animated}
	class:flag-heavy-fog={fogLevel === 3 && animated}
	class:flag-storm-fog={fogLevel >= 4 && animated}
>
	<defs>
		<filter id={waveFilterId} x="-50%" y="-50%" width="200%" height="200%">
			<feTurbulence
				type="fractalNoise"
				baseFrequency={waveFrequency.toFixed(3)}
				numOctaves={intensity > 70 ? 6 : intensity > 40 ? 5 : 4}
				result="turbulence"
				seed={Math.floor(intensity * 7)}
			>
				{#if animated && waveFrequency > 0}
					<animate
						attributeName="baseFrequency"
						values={`${waveFrequency.toFixed(3)};${(waveFrequency * 2.2).toFixed(3)};${(waveFrequency * 0.85).toFixed(3)};${(waveFrequency * 1.6).toFixed(3)};${waveFrequency.toFixed(3)}`}
						dur={intensity > 70 ? '0.6s' : intensity > 40 ? '1.2s' : '2.8s'}
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

		<filter id="flag-shadow" x="-30%" y="-30%" width="160%" height="160%">
			<feDropShadow 
				dx={1 + intensity / 35} 
				dy={2 + intensity / 28} 
				stdDeviation={1.5 + intensity / 45} 
				flood-opacity={Math.min(0.65, 0.2 + intensity / 180)} 
			/>
		</filter>

		<linearGradient id="flag-fabric" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="rgba(255,255,255,0.12)" />
			<stop offset="35%" stop-color="rgba(255,255,255,0.03)" />
			<stop offset="65%" stop-color="rgba(0,0,0,0.05)" />
			<stop offset="100%" stop-color="rgba(0,0,0,0.12)" />
		</linearGradient>

		<radialGradient id="flag-vignette" cx="80%" cy="20%" r="120%">
			<stop offset="0%" stop-color="rgba(255,255,255,0.08)" />
			<stop offset="100%" stop-color="rgba(0,0,0,0.18)" />
		</radialGradient>

		{#if hasFog && animated}
			<filter id={fogId} x="-200%" y="-200%" width="500%" height="500%">
				<feTurbulence 
					type="fractalNoise" 
					baseFrequency={fogLevel >= 3 ? '0.03' : fogLevel === 2 ? '0.022' : '0.015'} 
					numOctaves={fogLevel >= 3 ? 6 : 5} 
					result="fogNoise" 
					seed={13 + fogLevel * 7}
				>
					<animate
						attributeName="baseFrequency"
						values={
							fogLevel >= 4 
								? '0.03;0.045;0.025;0.038;0.032;0.03' 
								: fogLevel === 3 
								? '0.028;0.04;0.022;0.034;0.028' 
								: fogLevel === 2
								? '0.022;0.03;0.018;0.026;0.022'
								: '0.015;0.02;0.012;0.017;0.015'
						}
						dur={fogLevel >= 4 ? '2.2s' : fogLevel === 3 ? '4s' : fogLevel === 2 ? '7s' : '12s'}
						repeatCount="indefinite"
					/>
				</feTurbulence>
				<feColorMatrix
					in="fogNoise"
					type="matrix"
					values={`1 0 0 0 ${fogLevel >= 3 ? 0.75 : 0.82}  0 1 0 0 ${fogLevel >= 3 ? 0.78 : 0.85}  0 0 1 0 ${fogLevel >= 3 ? 0.82 : 0.88}  0 0 0 ${fogOpacity.toFixed(3)} 0`}
					result="fogWhite"
				/>
				<feComposite in="fogWhite" in2="SourceGraphic" operator="in" result="fogOnFlag" />
			</filter>
		{/if}

		{#if hasRandomOcclusion}
			<filter id={occlusionId} x="-100%" y="-100%" width="300%" height="300%">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.04"
					numOctaves="3"
					result="occNoise"
					seed={99}
				>
					<animate
						attributeName="baseFrequency"
						values="0.04;0.06;0.035;0.05;0.04"
						dur="1.5s"
						repeatCount="indefinite"
					/>
				</feTurbulence>
				<feColorMatrix
					in="occNoise"
					type="matrix"
					values="0 0 0 0 0.05  0 0 0 0 0.08  0 0 0 0 0.12  0 0 0 ${occlusionOpacity.toFixed(3)} 0"
					result="occDark"
				/>
				<feComposite in="occDark" in2="SourceGraphic" operator="in" />
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

	<g filter={hasWaveDistortion ? `url(#${waveFilterId})` : 'url(#flag-shadow)'}>
		<g class="flag-body" 
		   style:transform-origin="left center"
		>
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
		<rect width="100%" height="100%" fill="url(#flag-vignette)" pointer-events="none" />

		<path
			d="M0,0 Q5,5 0,10 M0,20 Q5,25 0,30 M0,40 Q5,45 0,50 M0,60 Q5,65 0,70 M0,80 Q5,85 0,90 M0,100"
			stroke="rgba(0,0,0,0.18)"
			stroke-width="0.6"
			fill="none"
		/>

		{#if fabricStretchAmount > 0}
			<path
				d="M150,0 Q145,50 150,100"
				stroke="rgba(0,0,0,0.1)"
				stroke-width="0.8"
				fill="none"
			/>
		{/if}
	</g>

	{#if hasRandomOcclusion && animated}
		<g filter={`url(#${occlusionId})`} pointer-events="none">
			<rect width="100%" height="100%" />
		</g>
	{/if}

	{#if hasFog && animated}
		{#if fogLevel === 1}
			<g class="fog-overlay fog-light" opacity={cloudDensity * 0.7}>
				<rect width="100%" height="100%" fill={`url(#${fogId})`} />
			</g>
		{:else if fogLevel === 2}
			<g class="fog-overlay fog-medium" opacity={cloudDensity}>
				<rect width="100%" height="100%" fill={`url(#${fogId})`} />
			</g>
			<rect 
				class="fog-solid-layer fog-solid-medium" 
				width="100%" 
				height="100%" 
				fill={`rgba(200, 215, 235, ${fogOpacity * 0.35})`}
				style:mix-blend-mode="screen"
				pointer-events="none"
			/>
		{:else if fogLevel === 3}
			<g class="fog-overlay fog-heavy" opacity={cloudDensity}>
				<rect width="100%" height="100%" fill={`url(#${fogId})`} />
			</g>
			<rect 
				class="fog-solid-layer fog-solid-heavy" 
				width="100%" 
				height="100%" 
				fill={`rgba(185, 200, 220, ${fogOpacity * 0.55})`}
				style:mix-blend-mode="screen"
				pointer-events="none"
			/>
		{:else if fogLevel >= 4}
			<g class="fog-overlay fog-storm" opacity={Math.min(1, cloudDensity * 1.1)}>
				<rect width="100%" height="100%" fill={`url(#${fogId})`} />
			</g>
			<rect 
				class="fog-solid-layer fog-solid-storm" 
				width="100%" 
				height="100%" 
				fill={`rgba(170, 185, 210, ${fogOpacity * 0.75})`}
				style:mix-blend-mode="screen"
				pointer-events="none"
			/>
		{/if}
	{/if}

	{#if hasRain && animated}
		<g class="rain-container" 
		   style:transform={`rotate(${rainAngle}deg)`} 
		   style:transform-origin="50% 50%"
		   pointer-events="none"
		>
			{#each Array.from({ length: rainCount }) as _, i}
				<line
					x1={(i * 149) % 160 - 5}
					y1="-15"
					x2={
						rainLevel >= 3 ? (i * 149) % 160 - 5 - 22 :
						rainLevel === 2 ? (i * 149) % 160 - 5 - 14 :
						(i * 149) % 160 - 5 - 6
					}
					y2={
						rainLevel >= 3 ? 32 :
						rainLevel === 2 ? 22 :
						14
					}
					stroke={
						rainLevel >= 3 ? 'rgba(140, 170, 220, 0.85)' :
						rainLevel === 2 ? 'rgba(155, 185, 235, 0.75)' :
						'rgba(180, 210, 255, 0.65)'
					}
					stroke-width={rainLevel >= 3 ? 1.5 : rainLevel === 2 ? 1.1 : 0.85}
					class="rain-drop"
					class:rain-level2={rainLevel === 2}
					class:rain-level3={rainLevel >= 3}
					style:animation-delay={`${(i % 12) * (rainLevel >= 3 ? 0.02 : rainLevel === 2 ? 0.04 : 0.07)}s`}
				/>
			{/each}
		</g>
	{/if}

	{#if hasWindDebris && animated}
		<g class="wind-debris" pointer-events="none">
			{#each Array.from({ length: debrisCount }) as _, i}
				<line
					x1={-20 + (i * 190) / Math.max(1, debrisCount)}
					y1={15 + (i * 73) % 80}
					x2={50 + (i * 190) / Math.max(1, debrisCount)}
					y2={18 + (i * 73) % 80 + (i % 3 === 0 ? -3 : i % 3 === 1 ? 2 : 0)}
					stroke={i % 2 === 0 ? 'rgba(180, 200, 220, 0.6)' : 'rgba(160, 180, 200, 0.45)'}
					stroke-width={0.5 + (i % 3) * 0.3}
					class="debris-line"
					class:debris-heavy={hasStorm}
					style:animation-delay={`${i * 0.1}s`}
				/>
			{/each}
		</g>
	{/if}

	{#if hasLightning && animated}
		<rect class="lightning-flash lightning-primary" width="100%" height="100%" fill="rgba(255,255,255,0.92)" opacity="0" pointer-events="none" />
		{#if intensity >= 85}
			<rect class="lightning-flash lightning-secondary" width="100%" height="100%" fill="rgba(235, 245, 255, 0.98)" opacity="0" style:animation-delay="1.2s" pointer-events="none" />
			<rect class="lightning-flash lightning-tertiary" width="100%" height="100%" fill="rgba(250, 253, 255, 0.85)" opacity="0" style:animation-delay="2.7s" pointer-events="none" />
		{/if}
		{#if hasStorm}
			<g class="lightning-bolt-container" pointer-events="none">
				<polyline
					class="lightning-bolt"
					points="110,-5 95,18 108,22 85,50 102,55 78,85 96,90 72,110"
					fill="none"
					stroke="rgba(255,255,255,0.9)"
					stroke-width="2.5"
					opacity="0"
					style:animation-delay="0.8s"
				/>
			</g>
		{/if}
	{/if}

	{#if hasStorm && animated}
		<rect 
			class="storm-dim-layer" 
			width="100%" 
			height="100%" 
			fill={`rgba(30, 40, 60, ${(intensity - 85) / 15 * 0.35})`}
			pointer-events="none"
		/>
	{/if}

	<rect x="0" y="0" width="1.8" height="100%" fill="#8B7355" rx="0.6" />
	<rect x="0" y="-3" width="1.8" height="5" fill="#5C4033" rx="0.6" />
	<circle cx="0.9" cy="-3.5" r="1.5" fill="#4A3728" />
</svg>

<style>
	.flag-animated {
		animation: flag-swing var(--swing-duration, 3s) ease-in-out infinite;
		transform-origin: left center;
	}

	.flag-strong {
		animation-duration: 1.6s;
		animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1);
	}

	.flag-storm {
		animation-duration: 0.9s;
		animation-timing-function: cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}

	.flag-hurricane {
		animation-duration: 0.48s;
		animation-timing-function: cubic-bezier(0.2, 0.05, 0.3, 0.1);
	}

	.flag-light-fog {
		animation-name: flag-swing-fog-light;
	}

	.flag-heavy-fog {
		animation-name: flag-swing-fog;
	}

	.flag-storm-fog {
		animation-name: flag-swing-storm;
	}

	@keyframes flag-swing {
		0%,
		100% {
			transform: rotate(0deg) skewY(0deg) translateY(0) scaleX(1);
		}
		15% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 0.6)) skewY(calc(var(--skew-positive, 1deg) * 0.5)) translateY(0.8px) scaleX(calc(1 + var(--fabric-stretch, 0%) * 0.003));
		}
		30% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 1.1)) skewY(var(--skew-positive, 1deg)) translateY(-1.5px) scaleX(calc(1 + var(--fabric-stretch, 0%) * 0.007));
		}
		50% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 0.2)) skewY(calc(var(--skew-positive, 1deg) * 0.3)) translateY(0.5px) scaleX(calc(1 + var(--fabric-stretch, 0%) * 0.002));
		}
		70% {
			transform: rotate(calc(var(--swing-negative, -2deg) * 0.9)) skewY(calc(var(--skew-negative, -1deg) * 0.6)) translateY(1.2px) scaleX(calc(1 + var(--fabric-stretch, 0%) * 0.005));
		}
		85% {
			transform: rotate(calc(var(--swing-negative, -2deg) * 1.15)) skewY(var(--skew-negative, -1deg)) translateY(-1px) scaleX(calc(1 + var(--fabric-stretch, 0%) * 0.006));
		}
	}

	@keyframes flag-swing-fog-light {
		0%,
		100% {
			transform: rotate(0deg) skewY(0deg) translateY(0) translateX(0);
			filter: blur(0.4px);
		}
		25% {
			transform: rotate(var(--swing-positive, 2deg)) skewY(var(--skew-positive, 1deg)) translateY(-1.5px) translateX(1px);
			filter: blur(0.8px);
		}
		50% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 0.3)) skewY(calc(var(--skew-positive, 1deg) * 0.4)) translateY(0.8px) translateX(0);
			filter: blur(0.5px);
		}
		75% {
			transform: rotate(var(--swing-negative, -2deg)) skewY(var(--skew-negative, -1deg)) translateY(-0.8px) translateX(-1px);
			filter: blur(1px);
		}
	}

	@keyframes flag-swing-fog {
		0%,
		100% {
			transform: rotate(0deg) skewY(0deg) translateY(0) translateX(0);
			filter: blur(0.8px);
		}
		25% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 1.1)) skewY(calc(var(--skew-positive, 1deg) * 1.1)) translateY(-2.5px) translateX(1.5px);
			filter: blur(1.8px);
		}
		50% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 0.35)) skewY(calc(var(--skew-positive, 1deg) * 0.4)) translateY(1px) translateX(0.5px);
			filter: blur(1.2px);
		}
		75% {
			transform: rotate(calc(var(--swing-negative, -2deg) * 1.15)) skewY(calc(var(--skew-negative, -1deg) * 1.1)) translateY(-1.5px) translateX(-1.5px);
			filter: blur(2px);
		}
	}

	@keyframes flag-swing-storm {
		0%,
		100% {
			transform: rotate(0deg) skewY(0deg) translateY(0) translateX(0);
		}
		12% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 1.35)) skewY(calc(var(--skew-positive, 1deg) * 1.4)) translateY(-3.5px) translateX(2px);
		}
		28% {
			transform: rotate(calc(var(--swing-positive, 2deg) * 0.55)) skewY(calc(var(--skew-positive, 1deg) * 0.8)) translateY(2px) translateX(0.8px);
		}
		44% {
			transform: rotate(calc(var(--swing-negative, -2deg) * 0.4)) skewY(calc(var(--skew-negative, -1deg) * 0.6)) translateY(-1.8px) translateX(-0.8px);
		}
		60% {
			transform: rotate(calc(var(--swing-negative, -2deg) * 1.5)) skewY(calc(var(--skew-negative, -1deg) * 1.5)) translateY(2.5px) translateX(-2px);
		}
		80% {
			transform: rotate(calc(var(--swing-negative, -2deg) * 0.7)) skewY(calc(var(--skew-negative, -1deg) * 0.9)) translateY(-1px) translateX(-1.2px);
		}
	}

	.fog-overlay {
		animation: fog-drift 8s ease-in-out infinite;
		mix-blend-mode: screen;
		pointer-events: none;
	}

	.fog-medium {
		animation-duration: 5.5s;
		animation-name: fog-drift-medium;
	}

	.fog-heavy {
		animation-duration: 3.5s;
		animation-name: fog-drift-heavy;
	}

	.fog-storm {
		animation-duration: 2s;
		animation-name: fog-drift-storm;
	}

	@keyframes fog-drift {
		0%,
		100% {
			transform: translateX(0) translateY(0);
		}
		50% {
			transform: translateX(8px) translateY(3px);
		}
	}

	@keyframes fog-drift-medium {
		0%,
		100% {
			transform: translateX(0) translateY(0) scale(1);
		}
		33% {
			transform: translateX(12px) translateY(4px) scale(1.04);
		}
		66% {
			transform: translateX(-7px) translateY(-3px) scale(0.97);
		}
	}

	@keyframes fog-drift-heavy {
		0%,
		100% {
			transform: translateX(0) translateY(0) scale(1);
		}
		25% {
			transform: translateX(15px) translateY(6px) scale(1.06);
		}
		50% {
			transform: translateX(-10px) translateY(-4px) scale(0.95);
		}
		75% {
			transform: translateX(8px) translateY(-8px) scale(1.03);
		}
	}

	@keyframes fog-drift-storm {
		0%,
		100% {
			transform: translateX(0) translateY(0) scale(1);
			opacity: 1;
		}
		20% {
			transform: translateX(20px) translateY(8px) scale(1.1);
			opacity: 0.8;
		}
		45% {
			transform: translateX(-15px) translateY(-6px) scale(0.92);
			opacity: 1.1;
		}
		70% {
			transform: translateX(12px) translateY(-10px) scale(1.07);
			opacity: 0.88;
		}
	}

	.fog-solid-layer {
		animation: fog-pulse 5s ease-in-out infinite;
		pointer-events: none;
	}

	.fog-solid-medium {
		animation-duration: 6s;
	}

	.fog-solid-heavy {
		animation-duration: 3.5s;
	}

	.fog-solid-storm {
		animation-duration: 2s;
	}

	@keyframes fog-pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.65;
		}
	}

	.rain-drop {
		animation: rain-fall 0.55s linear infinite;
	}

	.rain-level2 {
		animation-duration: 0.38s;
		animation-name: rain-fall-level2;
	}

	.rain-level3 {
		animation-duration: 0.23s;
		animation-name: rain-fall-level3;
	}

	@keyframes rain-fall {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		8% {
			opacity: 0.55;
		}
		92% {
			opacity: 0.55;
		}
		100% {
			transform: translateY(125px);
			opacity: 0;
		}
	}

	@keyframes rain-fall-level2 {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		6% {
			opacity: 0.75;
		}
		94% {
			opacity: 0.72;
		}
		100% {
			transform: translateY(140px);
			opacity: 0;
		}
	}

	@keyframes rain-fall-level3 {
		0% {
			transform: translateY(0) translateX(0);
			opacity: 0;
		}
		4% {
			opacity: 0.9;
		}
		45% {
			transform: translateY(70px) translateX(-12px);
		}
		96% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(150px) translateX(-28px);
			opacity: 0;
		}
	}

	.debris-line {
		animation: debris-blow 1.3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	.debris-heavy {
		animation-duration: 0.7s;
		animation-name: debris-blow-heavy;
	}

	@keyframes debris-blow {
		0% {
			transform: translateX(0) translateY(0);
			opacity: 0;
		}
		18% {
			opacity: 0.55;
		}
		82% {
			opacity: 0.45;
		}
		100% {
			transform: translateX(210px) translateY(-30px);
			opacity: 0;
		}
	}

	@keyframes debris-blow-heavy {
		0% {
			transform: translateX(0) translateY(0) scaleX(1);
			opacity: 0;
		}
		12% {
			opacity: 0.7;
		}
		50% {
			transform: translateX(120px) translateY(-18px) scaleX(1.3);
		}
		88% {
			opacity: 0.6;
		}
		100% {
			transform: translateX(260px) translateY(-45px) scaleX(1.5);
			opacity: 0;
		}
	}

	.lightning-flash {
		animation: lightning-1 5s ease-in-out infinite;
		mix-blend-mode: screen;
		pointer-events: none;
	}

	.lightning-secondary {
		animation-name: lightning-2;
		animation-duration: 4.2s;
	}

	.lightning-tertiary {
		animation-name: lightning-3;
		animation-duration: 6s;
	}

	@keyframes lightning-1 {
		0%, 89%, 90.5%, 92%, 93%, 95%, 96%, 100% {
			opacity: 0;
		}
		89.5%, 94% {
			opacity: 0.95;
		}
		92.5% {
			opacity: 0.65;
		}
	}

	@keyframes lightning-2 {
		0%, 87%, 88%, 89.5%, 91%, 92.5%, 93.5%, 100% {
			opacity: 0;
		}
		87.5%, 91.5% {
			opacity: 0.92;
		}
		90% {
			opacity: 0.7;
		}
	}

	@keyframes lightning-3 {
		0%, 75%, 75.8%, 77%, 78.5%, 100% {
			opacity: 0;
		}
		75.3%, 77.8% {
			opacity: 0.98;
		}
		76.2% {
			opacity: 0.6;
		}
	}

	.lightning-bolt {
		animation: bolt-flash 5s ease-in-out infinite;
		filter: drop-shadow(0 0 6px rgba(200, 220, 255, 0.9));
	}

	@keyframes bolt-flash {
		0%, 88%, 90%, 91.5%, 93%, 100% {
			opacity: 0;
		}
		88.5%, 92% {
			opacity: 1;
		}
		89.5% {
			opacity: 0.4;
		}
	}

	.storm-dim-layer {
		animation: storm-pulse 2.5s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes storm-pulse {
		0%, 100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}

	svg {
		display: block;
		overflow: visible;
	}
</style>
