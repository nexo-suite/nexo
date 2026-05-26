<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let {
		consumed,
		target,
		size = 232,
		showStatus = true
	}: {
		consumed: number;
		target: number;
		size?: number;
		showStatus?: boolean;
	} = $props();

	// Geometry — the ring has breathing room outside the stroke for the
	// quarter beads (small ember dots) and the halo bloom.
	const stroke = $derived(Math.max(10, Math.round(size / 24)));
	const r = $derived((size - stroke) / 2 - 8);
	const cx = $derived(size / 2);
	const cy = $derived(size / 2);
	const circ = $derived(2 * Math.PI * r);

	const ratio = $derived(consumed / target);
	const pct = $derived(Math.min(ratio, 1));
	const overPct = $derived(Math.max(0, ratio - 1));
	const remaining = $derived(Math.round(target - consumed));
	const isOver = $derived(consumed > target);

	const dashOffset = $derived(circ * (1 - pct));

	// Over-target arc — nested *inside* the main stroke (not stacked on top).
	// Reads as a quiet annotation rather than a punishing overlay.
	const innerStroke = 3;
	const innerR = $derived(r - stroke / 2 - 2 - innerStroke / 2);
	const innerCirc = $derived(2 * Math.PI * innerR);
	const innerOffset = $derived(innerCirc * (1 - Math.min(overPct, 1)));

	// Quarter beads (0/25/50/75 — 100% is the stroke meeting itself).
	const beadR = $derived(r + stroke / 2 + 7);
	const beads = $derived([0, 0.25, 0.5, 0.75].map((q) => {
		const angle = -Math.PI / 2 + q * 2 * Math.PI;
		return {
			x: cx + Math.cos(angle) * beadR,
			y: cy + Math.sin(angle) * beadR,
			lit: ratio >= q && q > 0
		};
	}));

	const display = $derived(Math.round(consumed));
	const id = $derived(`kr-${Math.random().toString(36).slice(2, 8)}`);
</script>

<div class="kr" style="--size:{size}px">
	<svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
		<defs>
			<linearGradient id="{id}-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="var(--color-ember-soft)" />
				<stop offset="55%" stop-color="var(--color-ember)" />
				<stop offset="100%" stop-color="var(--color-ember-deep)" />
			</linearGradient>
			<radialGradient id="{id}-halo" cx="50%" cy="50%" r="50%">
				<stop offset="60%" stop-color="transparent" />
				<stop offset="80%" stop-color="color-mix(in oklab, var(--color-ember) 22%, transparent)" />
				<stop offset="100%" stop-color="transparent" />
			</radialGradient>
		</defs>

		<!-- Halo bloom — soft ember atmosphere behind the fill, replaces drop-shadow filter -->
		<circle cx={cx} cy={cy} r={r + stroke / 2 + 4} fill="url(#{id}-halo)" opacity="0.9" class="kr-halo" />

		<!-- Background track — hairline groove, not a heavy ring -->
		<circle
			cx={cx}
			cy={cy}
			r={r}
			fill="none"
			stroke="var(--color-border-default)"
			stroke-width={stroke}
			opacity="0.28"
		/>

		<!-- Filled arc — ember gradient, rounded caps, animated -->
		<circle
			class="kr-arc"
			cx={cx}
			cy={cy}
			r={r}
			fill="none"
			stroke="url(#{id}-stroke)"
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={circ}
			stroke-dashoffset={dashOffset}
			transform="rotate(-90 {cx} {cy})"
		/>

		<!-- Over-target — nested INSIDE, not on top. Terracotta hairline annotation. -->
		{#if isOver}
			<circle
				class="kr-over"
				cx={cx}
				cy={cy}
				r={innerR}
				fill="none"
				stroke="var(--color-overtarget)"
				stroke-width={innerStroke}
				stroke-linecap="round"
				stroke-dasharray={innerCirc}
				stroke-dashoffset={innerOffset}
				transform="rotate(-90 {cx} {cy})"
			/>
		{/if}

		<!-- Quarter beads — light when reached, otherwise neutral pinpricks -->
		{#each beads as bead, i (i)}
			<circle
				cx={bead.x}
				cy={bead.y}
				r="2"
				fill={bead.lit ? 'var(--color-ember)' : 'var(--color-border-default)'}
				opacity={bead.lit ? 0.9 : 0.45}
			/>
		{/each}
	</svg>

	<div class="kr-center">
		<div class="kr-num tnum">{display.toLocaleString()}</div>
		<div class="kr-target eyebrow-num">/ {target.toLocaleString()} {m.unit_kcal()}</div>
		{#if showStatus}
			<div class="kr-status" class:over={isOver}>
				{#if isOver}
					{Math.abs(remaining).toLocaleString()} {m.kcal_over()}
				{:else}
					{remaining.toLocaleString()} {m.kcal_remaining()}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.kr {
		position: relative;
		width: var(--size);
		height: var(--size);
		display: grid;
		place-items: center;
	}

	.kr-arc {
		transition: stroke-dashoffset 720ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	.kr-over {
		transition: stroke-dashoffset 720ms cubic-bezier(0.32, 0.72, 0, 1);
		transition-delay: 240ms;
	}

	.kr-halo {
		filter: blur(8px);
		opacity: 0.7;
	}

	.kr-center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		pointer-events: none;
	}

	.kr-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variant-numeric: tabular-nums lining-nums;
		font-variation-settings: 'opsz' 144, 'SOFT' 90, 'wght' 470;
		font-size: calc(var(--size) * 0.245);
		line-height: 0.94;
		letter-spacing: -0.04em;
		color: var(--color-text-primary);
	}

	.kr-target {
		margin-top: 2px;
		opacity: 0.85;
	}

	.kr-status {
		margin-top: 6px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		font-feature-settings: 'tnum' 1;
	}

	.kr-status.over {
		color: var(--color-overtarget);
	}
</style>
