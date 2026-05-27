<script lang="ts">
	import type { WeightPoint } from '$lib/utils/weightStats';
	import { m } from '$lib/paraglide/messages.js';

	let {
		weights,
		editingDate = $bindable<string | null>(null)
	}: {
		weights: WeightPoint[];
		editingDate?: string | null;
	} = $props();

	const todayIso = new Date().toISOString().slice(0, 10);

	// Newest first, with delta-from-previous-chronological computed
	const rows = $derived.by(() => {
		const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
		const result: { date: string; kg: number; delta: number | null; index: number }[] = [];
		for (let i = 0; i < sorted.length; i++) {
			const cur = sorted[i];
			const prev = i > 0 ? sorted[i - 1] : null;
			const delta = prev ? cur.kg - prev.kg : null;
			result.push({ date: cur.date, kg: cur.kg, delta, index: i + 1 });
		}
		return result.reverse();
	});

	function formatDate(iso: string): { weekday: string; daymon: string } {
		const d = new Date(`${iso}T00:00:00Z`);
		const weekday = new Intl.DateTimeFormat('en', {
			weekday: 'short',
			timeZone: 'UTC'
		}).format(d);
		const daymon = new Intl.DateTimeFormat('en', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}).format(d);
		return { weekday, daymon };
	}

	function isToday(iso: string): boolean {
		return iso === todayIso;
	}

	function tap(date: string) {
		editingDate = date;
	}
</script>

<section class="journal">
	{#if rows.length === 0}
		<p class="empty serif-italic">{m.weight_no_logs()}</p>
	{:else}
		<ol class="rows" role="list">
			{#each rows as r (r.date)}
				{@const f = formatDate(r.date)}
				<li>
					<button
						class="row"
						type="button"
						class:today={isToday(r.date)}
						class:open={editingDate === r.date}
						onclick={() => tap(r.date)}
					>
						<span class="r-idx eyebrow-num">№ {String(r.index).padStart(2, '0')}</span>
						<span class="r-date">
							<span class="r-weekday eyebrow-num">{f.weekday}</span>
							<span class="r-daymon serif-display">{f.daymon}</span>
							{#if isToday(r.date)}
								<span class="r-tag serif-italic">{m.weight_journal_today_tag()}</span>
							{/if}
						</span>
						<span class="r-leader" aria-hidden="true"></span>
						<span class="r-num tnum">{r.kg.toFixed(1)}</span>
						<span class="r-delta tnum" class:down={r.delta != null && r.delta < -0.05} class:up={r.delta != null && r.delta > 0.05}>
							{#if r.delta == null}
								<span class="r-delta-dash" aria-hidden="true">—</span>
							{:else if r.delta < -0.05}
								<span class="r-delta-arrow" aria-hidden="true">▼</span>
								<span>{Math.abs(r.delta).toFixed(1)}</span>
							{:else if r.delta > 0.05}
								<span class="r-delta-arrow" aria-hidden="true">▲</span>
								<span>{r.delta.toFixed(1)}</span>
							{:else}
								<span class="r-delta-dash" aria-hidden="true">·</span>
							{/if}
						</span>
					</button>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.journal {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.empty {
		font-size: 14px;
		color: var(--color-text-faint);
		padding: 24px 4px;
		margin: 0;
	}

	.rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.row {
		all: unset;
		cursor: pointer;
		display: grid;
		grid-template-columns: auto auto 1fr auto auto;
		align-items: baseline;
		gap: 10px;
		padding: 14px 4px;
		border-bottom: 1px solid var(--color-border-subtle);
		transition: background 200ms;
	}

	.row:hover {
		background: color-mix(in oklab, var(--color-ember) 3%, transparent);
	}

	.row.open {
		background: var(--ember-tint-bg);
	}

	.row.today {
		/* Subtle left edge accent only — no background blast */
		box-shadow: inset 2px 0 0 var(--color-ember);
		padding-left: 10px;
	}

	.r-idx {
		color: var(--color-text-faint);
		opacity: 0.7;
		min-width: 4ch;
	}

	.r-date {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
	}

	.r-weekday {
		color: var(--color-text-faint);
		font-size: 9.5px;
	}

	.r-daymon {
		font-size: 17px;
		color: var(--color-text-muted);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 440,
			'ital' 0;
		letter-spacing: -0.01em;
	}

	.row.today .r-daymon {
		color: var(--color-text-primary);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 460,
			'ital' 0;
	}

	.r-tag {
		font-size: 11px;
		color: var(--color-ember-deep);
		font-variation-settings:
			'opsz' 18,
			'SOFT' 100,
			'wght' 420,
			'ital' 1;
	}

	.r-leader {
		align-self: center;
		min-width: 12px;
		height: 1px;
		background-image: radial-gradient(
			circle,
			var(--color-text-faint) 0.55px,
			transparent 0.55px
		);
		background-size: 4px 1px;
		background-repeat: repeat-x;
		background-position: bottom center;
		opacity: 0.45;
	}

	.r-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 36,
			'SOFT' 80,
			'wght' 470;
		font-size: 22px;
		line-height: 1;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
	}

	.row.today .r-num {
		color: var(--color-ember-deep);
		font-variation-settings:
			'opsz' 36,
			'SOFT' 80,
			'wght' 510;
	}

	.r-delta {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--color-text-faint);
		min-width: 5ch;
		text-align: right;
		display: inline-flex;
		gap: 2px;
		justify-content: flex-end;
		font-feature-settings: 'tnum' 1;
	}

	.r-delta.down {
		color: var(--color-ontarget);
	}

	.r-delta.up {
		color: var(--color-overtarget);
	}

	.r-delta-arrow {
		font-size: 8px;
		opacity: 0.85;
		align-self: center;
	}

	.r-delta-dash {
		opacity: 0.4;
	}
</style>
