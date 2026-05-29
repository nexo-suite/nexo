<script lang="ts">
	import type { Entry, Moment } from '$lib/types';
	import MomentCard from './Moment.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		entries,
		moments = [],
		onEntryTap,
		onAdd
	}: {
		entries: Entry[];
		moments?: Moment[];
		onEntryTap?: (entry: Entry) => void;
		onAdd?: () => void;
	} = $props();

	type Item =
		| { kind: 'entry'; entry: Entry; ts: number }
		| { kind: 'moment'; moment: Moment; ts: number };

	// Time-of-day bands — gentle dividers when the day shifts.
	type Band = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'late';

	function bandOf(date: Date): Band {
		const h = date.getHours();
		if (h < 6) return 'dawn';
		if (h < 11) return 'morning';
		if (h < 14) return 'midday';
		if (h < 17) return 'afternoon';
		if (h < 21) return 'evening';
		return 'late';
	}

	const bandLabels: Record<Band, () => string> = {
		dawn: m.diary_band_dawn,
		morning: m.diary_band_morning,
		midday: m.diary_band_midday,
		afternoon: m.diary_band_afternoon,
		evening: m.diary_band_evening,
		late: m.diary_band_late
	};

	// Compose entries + moments, sorted strictly by time. Moments without a time
	// drift to the start of the day so they don't break the chronology illusion.
	const items = $derived.by<Item[]>(() => {
		const out: Item[] = [];
		for (const e of entries) {
			out.push({ kind: 'entry', entry: e, ts: new Date(e.loggedAt).getTime() });
		}
		for (const mo of moments) {
			out.push({
				kind: 'moment',
				moment: mo,
				ts: mo.at ? new Date(mo.at).getTime() : 0
			});
		}
		return out.sort((a, b) => a.ts - b.ts);
	});

	// Partition into bands so we can interleave soft section dividers.
	const grouped = $derived.by(() => {
		const out: Array<{ band: Band; items: Item[] }> = [];
		for (const it of items) {
			const d = new Date(it.ts || Date.now());
			const band = bandOf(d);
			const tail = out[out.length - 1];
			if (tail && tail.band === band) tail.items.push(it);
			else out.push({ band, items: [it] });
		}
		return out;
	});

	function fmtTime(iso: string) {
		return new Date(iso).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	const totalKcal = $derived(Math.round(entries.reduce((s, e) => s + e.kcal, 0)));
	const isEmpty = $derived(entries.length === 0 && moments.length === 0);
</script>

<section class="diary" aria-label={m.diary_view_label()}>
	<header class="diary-head">
		<span class="rule"></span>
		<span class="eyebrow">{m.diary_view_label()}</span>
		<span class="rule"></span>
	</header>

	{#if isEmpty}
		<div class="diary-empty">
			<div class="empty-page" aria-hidden="true">
				<span class="page-rule r1"></span>
				<span class="page-rule r2"></span>
				<span class="page-rule r3"></span>
			</div>
			<p class="empty-line serif-italic">{m.diary_empty_line()}</p>
			<button class="empty-cta" type="button" onclick={() => onAdd?.()}>
				{m.diary_empty_cta()}
			</button>
		</div>
	{:else}
		<ol class="ledger">
			{#each grouped as group, gi (gi + group.band)}
				<li class="band-row" aria-hidden="true">
					<span class="band-rule"></span>
					<span class="band-label">{bandLabels[group.band]()}</span>
					<span class="band-rule"></span>
				</li>

				{#each group.items as item, i (item.kind === 'entry' ? item.entry.id : item.moment.id + i)}
					{#if item.kind === 'entry'}
						{@const e = item.entry}
						<li class="row">
							<button
								class="row-btn"
								type="button"
								onclick={() => onEntryTap?.(e)}
								aria-label={`Edit ${e.foodName}`}
							>
								<span class="margin">
									<span class="time">{fmtTime(e.loggedAt)}</span>
								</span>
								<span class="margin-rule" aria-hidden="true">
									<span class="bullet"></span>
								</span>
								<span class="entry-body">
									<span class="entry-name">{e.foodName}</span>
									<span class="entry-meta">
										<span class="grams">{Math.round(e.grams)}g</span>
										{#if e.protein_g}
											<span class="micro p">{Math.round(e.protein_g)}P</span>
										{/if}
										{#if e.carbs_g}
											<span class="micro c">{Math.round(e.carbs_g)}C</span>
										{/if}
										{#if e.fat_g}
											<span class="micro f">{Math.round(e.fat_g)}F</span>
										{/if}
									</span>
								</span>
								<span class="kcal-col">
									<span class="kcal">{Math.round(e.kcal)}</span>
									<span class="kcal-unit">kcal</span>
								</span>
							</button>
						</li>
					{:else}
						<li class="row moment-row">
							<MomentCard moment={item.moment} />
						</li>
					{/if}
				{/each}
			{/each}

			<li class="footer-row" aria-hidden="true">
				<span class="footer-rule"></span>
				<span class="footer-label">
					<span class="footer-eyebrow">{m.diary_total_label()}</span>
					<span class="footer-num tnum">{totalKcal}</span>
					<span class="footer-unit">kcal</span>
				</span>
				<span class="footer-rule"></span>
			</li>
		</ol>
	{/if}
</section>

<style>
	.diary {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 6px 2px 12px;
		animation: diary-fade 320ms cubic-bezier(0.32, 0.72, 0, 1) both;
	}

	@keyframes diary-fade {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.diary-head {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 4px;
	}

	.diary-head .rule {
		flex: 1;
		height: 1px;
		background: var(--color-border-subtle);
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	/* ── Ledger ── */
	.ledger {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	/* The continuous spine that runs down the margin gutter, like a
	   stitching line in a bound notebook. Drawn here once, beneath the rows. */
	.ledger::before {
		content: '';
		position: absolute;
		left: calc(48px + 6px); /* aligns with .margin-rule */
		top: 18px;
		bottom: 18px;
		width: 1px;
		background: linear-gradient(
			to bottom,
			transparent,
			var(--color-border-subtle) 6%,
			var(--color-border-subtle) 94%,
			transparent
		);
		pointer-events: none;
	}

	/* ── Band divider — soft horizontal break between morning / midday / etc. ── */
	.band-row {
		display: grid;
		grid-template-columns: 48px 12px 1fr;
		align-items: center;
		gap: 8px;
		padding: 16px 4px 8px;
	}

	.band-rule {
		grid-column: 1 / span 3;
		grid-row: 1;
		height: 1px;
		background: var(--color-border-subtle);
		opacity: 0.55;
	}

	.band-label {
		grid-row: 1;
		grid-column: 3;
		justify-self: start;
		padding: 0 10px;
		background: var(--color-bg-0);
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings: 'opsz' 14, 'SOFT' 100, 'wght' 380, 'ital' 1;
		font-size: 11.5px;
		letter-spacing: 0.04em;
		color: var(--color-text-faint);
		transform: translateY(0.5px);
	}

	.band-row:first-child {
		padding-top: 4px;
	}

	.band-row:first-child .band-rule {
		display: none;
	}

	.band-row:first-child .band-label {
		justify-self: start;
		padding-left: 0;
	}

	/* ── Row ── */
	.row {
		list-style: none;
		position: relative;
	}

	.row.moment-row {
		padding: 8px 0 8px calc(48px + 22px);
	}

	.row-btn {
		all: unset;
		cursor: pointer;
		display: grid;
		grid-template-columns: 48px 12px 1fr auto;
		align-items: baseline;
		gap: 10px;
		width: 100%;
		padding: 12px 4px;
		border-radius: 8px;
		transition: background 180ms;
	}

	.row-btn:hover {
		background: color-mix(in oklab, var(--color-ember) 4%, var(--color-bg-1));
	}

	.row-btn:active {
		background: color-mix(in oklab, var(--color-ember) 7%, var(--color-bg-1));
	}

	/* Margin: time stamp, like in a journal */
	.margin {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
		min-width: 0;
	}

	.time {
		font-family: var(--font-mono);
		font-feature-settings: 'tnum' 1;
		font-size: 11.5px;
		letter-spacing: 0.06em;
		color: var(--color-text-faint);
	}

	/* Margin rule: where the spine sits, with a soft bullet on each row */
	.margin-rule {
		position: relative;
		display: grid;
		place-items: center;
		height: 100%;
		min-height: 22px;
	}

	.bullet {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--color-bg-0);
		border: 1.5px solid var(--color-ember);
		box-shadow: 0 0 0 3px var(--color-bg-0);
		position: relative;
		z-index: 1;
	}

	.row-btn:hover .bullet {
		background: var(--color-ember);
	}

	/* Entry body — display serif for the food name, mono for grams/macros */
	.entry-body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.entry-name {
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 36, 'SOFT' 80, 'wght' 460;
		font-size: 16.5px;
		line-height: 1.15;
		letter-spacing: -0.012em;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.entry-meta {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 10.5px;
		color: var(--color-text-faint);
	}

	.grams,
	.micro {
		font-family: var(--font-mono);
		font-feature-settings: 'tnum' 1;
		letter-spacing: 0.04em;
	}

	.micro {
		opacity: 0.85;
	}

	.micro.p {
		color: var(--color-protein);
	}
	.micro.c {
		color: var(--color-carbs);
	}
	.micro.f {
		color: var(--color-fat);
	}

	/* Right column: large kcal numeral with a quiet unit beneath */
	.kcal-col {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0;
	}

	.kcal {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variant-numeric: tabular-nums lining-nums;
		font-variation-settings: 'opsz' 36, 'SOFT' 70, 'wght' 470;
		font-size: 22px;
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--color-text-primary);
	}

	.kcal-unit {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		margin-top: 2px;
	}

	/* ── Footer total — closes the page like a ledger sum ── */
	.footer-row {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 14px;
		padding: 22px 4px 6px;
	}

	.footer-rule {
		height: 1px;
		background: var(--color-border-subtle);
	}

	.footer-label {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
	}

	.footer-eyebrow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.footer-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings: 'opsz' 60, 'SOFT' 80, 'wght' 460;
		font-size: 26px;
		letter-spacing: -0.025em;
		line-height: 1;
		color: var(--color-text-primary);
	}

	.footer-unit {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	/* ── Empty state — a blank page with three faint rules ── */
	.diary-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 36px 20px 28px;
		text-align: center;
	}

	.empty-page {
		position: relative;
		width: 96px;
		height: 60px;
		margin-bottom: 4px;
	}

	.page-rule {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--color-border-default);
		opacity: 0.65;
	}

	.page-rule.r1 {
		top: 12px;
	}
	.page-rule.r2 {
		top: 28px;
		right: 22px;
	}
	.page-rule.r3 {
		top: 44px;
		right: 8px;
	}

	.empty-line {
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings: 'opsz' 36, 'SOFT' 100, 'wght' 380, 'ital' 1;
		font-size: 16px;
		line-height: 1.35;
		color: var(--color-text-subtle);
		max-width: 240px;
		margin: 0;
	}

	.empty-cta {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 18px;
		border-radius: 999px;
		background: var(--ember-tint-bg);
		border: 1px solid var(--ember-line);
		color: var(--color-ember-deep);
		font-size: 12.5px;
		font-weight: 500;
		letter-spacing: 0.005em;
		transition:
			background 160ms,
			transform 120ms;
	}

	.empty-cta:active {
		transform: scale(0.97);
		background: color-mix(in oklab, var(--color-ember) 12%, var(--color-bg-0));
	}

	@media (prefers-reduced-motion: reduce) {
		.diary {
			animation: none;
		}
	}
</style>
