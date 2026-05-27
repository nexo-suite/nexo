<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let {
		startKg,
		nowKg,
		targetKg,
		onSetTarget
	}: {
		startKg: number | null;
		nowKg: number | null;
		targetKg: number | null;
		onSetTarget?: () => void;
	} = $props();

	const tickPct = $derived.by(() => {
		if (startKg == null || nowKg == null || targetKg == null) return null;
		const span = targetKg - startKg;
		if (Math.abs(span) < 0.05) return 100;
		const pct = ((nowKg - startKg) / span) * 100;
		return Math.max(0, Math.min(100, pct));
	});
</script>

<div class="rail" class:no-target={targetKg == null}>
	<div class="track" aria-hidden="true">
		{#if tickPct != null}
			<div class="track-fill" style="width: {tickPct}%"></div>
			<div class="tick" style="left: {tickPct}%"></div>
		{/if}
	</div>

	<div class="legend">
		<div class="leg start">
			<span class="lab">{m.weight_rail_start()}</span>
			<span class="num tnum">{startKg != null ? startKg.toFixed(1) : '—'}</span>
		</div>

		<div class="leg now">
			<span class="lab">{m.weight_rail_now()}</span>
			<span class="num tnum now-num">{nowKg != null ? nowKg.toFixed(1) : '—'}</span>
		</div>

		<div class="leg target">
			<span class="lab">{m.weight_rail_target()}</span>
			{#if targetKg != null}
				<span class="num tnum">{targetKg.toFixed(1)}</span>
			{:else if onSetTarget}
				<button class="set-cta" type="button" onclick={onSetTarget}>
					{m.weight_target_set_cta()}
				</button>
			{:else}
				<span class="num muted">—</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.rail {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.track {
		position: relative;
		height: 1px;
		background: var(--color-border-subtle);
		margin: 0 6px;
	}

	.track-fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 1px;
		background: linear-gradient(
			to right,
			var(--color-ember-soft) 0%,
			var(--color-ember) 100%
		);
		transition: width 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.tick {
		position: absolute;
		top: -4px;
		width: 9px;
		height: 9px;
		margin-left: -4.5px;
		border-radius: 999px;
		background: var(--color-bg-0);
		border: 1.4px solid var(--color-ember);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-ember) 14%, transparent);
		transition: left 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.legend {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 4px;
	}

	.leg {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-top: 2px;
	}

	.leg.now {
		text-align: center;
	}

	.leg.target {
		text-align: right;
	}

	.lab {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings: 'opsz' 36, 'SOFT' 80, 'wght' 460;
		font-size: 19px;
		line-height: 1;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
	}

	.now-num {
		color: var(--color-ember-deep);
		font-variation-settings: 'opsz' 36, 'SOFT' 80, 'wght' 510;
	}

	.num.muted {
		color: var(--color-text-faint);
		opacity: 0.5;
	}

	.set-cta {
		all: unset;
		cursor: pointer;
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings: 'opsz' 18, 'SOFT' 100, 'wght' 420, 'ital' 1;
		font-size: 13px;
		color: var(--color-ember-deep);
		text-decoration: underline;
		text-decoration-thickness: 0.5px;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in oklab, var(--color-ember) 40%, transparent);
	}
</style>
