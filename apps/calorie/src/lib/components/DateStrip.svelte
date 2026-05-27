<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { onMount, tick } from 'svelte';

	let {
		selected = $bindable(new Date()),
		onSelect
	}: {
		selected?: Date;
		onSelect?: (d: Date) => void;
	} = $props();

	let viewMonth = $state(new Date(selected.getFullYear(), selected.getMonth(), 1));
	let stripEl = $state<HTMLDivElement | null>(null);

	const today = $derived(new Date());
	const isCurrentMonth = $derived(
		viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth()
	);
	const isSelectedToday = $derived(isSameDay(selected, today));
	const showTodayPill = $derived(!isSelectedToday);

	const days = $derived.by<Date[]>(() => {
		const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
		const result: Date[] = [];
		for (let d = 1; d <= end.getDate(); d++) {
			result.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
		}
		return result;
	});

	const monthLabel = $derived(
		viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	);

	function isSameDay(a: Date, b: Date) {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	function isFuture(d: Date) {
		const t = new Date(today);
		t.setHours(23, 59, 59, 999);
		return d > t;
	}

	function pick(d: Date) {
		if (isFuture(d)) return;
		selected = d;
		onSelect?.(d);
		centerSelected();
	}

	function prevMonth() {
		viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
	}

	function nextMonth() {
		if (isCurrentMonth) return;
		viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
	}

	function jumpToToday() {
		viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
		selected = new Date(today);
		onSelect?.(selected);
	}

	async function centerSelected() {
		await tick();
		if (!stripEl) return;
		const target = stripEl.querySelector<HTMLElement>('[data-selected="true"]');
		if (!target) return;
		const stripRect = stripEl.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();
		const offset =
			targetRect.left - stripRect.left - stripEl.clientWidth / 2 + targetRect.width / 2;
		stripEl.scrollTo({ left: stripEl.scrollLeft + offset, behavior: 'smooth' });
	}

	onMount(() => {
		centerSelected();
	});

	$effect(() => {
		// Re-center when the visible month changes
		void viewMonth;
		centerSelected();
	});
</script>

<div class="strip-host">
	<div class="head">
		<button class="chev" type="button" onclick={prevMonth} aria-label="Previous month">
			<ChevronLeft size={16} strokeWidth={1.7} />
		</button>
		<button class="month-btn" type="button" onclick={jumpToToday} aria-label="Jump to today">
			<span class="month-text serif-display">{monthLabel}</span>
			{#if showTodayPill}
				<span class="today-pill">Today</span>
			{/if}
		</button>
		<button
			class="chev"
			type="button"
			onclick={nextMonth}
			disabled={isCurrentMonth}
			aria-label="Next month"
		>
			<ChevronRight size={16} strokeWidth={1.7} />
		</button>
	</div>

	<div class="strip" bind:this={stripEl}>
		{#each days as d (d.toISOString())}
			{@const future = isFuture(d)}
			{@const isToday = isSameDay(d, today)}
			{@const isSelected = isSameDay(d, selected)}
			<button
				class="day"
				class:selected={isSelected}
				class:today={isToday}
				class:future
				type="button"
				disabled={future}
				data-selected={isSelected}
				onclick={() => pick(d)}
				aria-label={d.toLocaleDateString('en-US', {
					weekday: 'long',
					month: 'long',
					day: 'numeric'
				})}
				aria-current={isSelected ? 'date' : undefined}
			>
				<span class="dow">
					{d.toLocaleDateString('en-US', { weekday: 'narrow' })}
				</span>
				<span class="num tnum">{d.getDate()}</span>
				{#if isToday}
					<span class="today-mark" aria-hidden="true"></span>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.strip-host {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.chev {
		all: unset;
		cursor: pointer;
		width: 26px;
		height: 26px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		color: var(--color-text-subtle);
		transition:
			color 140ms,
			background 140ms;
	}

	.chev:not(:disabled):hover {
		color: var(--color-ember-deep);
		background: var(--ember-tint-bg);
	}

	.chev:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.month-btn {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px;
		border-radius: 8px;
	}

	.month-text {
		font-size: 14px;
		font-variation-settings: 'opsz' 24, 'SOFT' 90, 'wght' 470;
		letter-spacing: -0.005em;
		color: var(--color-text-primary);
	}

	.today-pill {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 999px;
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
	}

	.strip {
		display: flex;
		gap: 5px;
		overflow-x: auto;
		scrollbar-width: none;
		scroll-snap-type: x proximity;
		padding: 4px 8px;
		margin: 0 -8px;
		-webkit-overflow-scrolling: touch;
	}
	.strip::-webkit-scrollbar {
		display: none;
	}

	.day {
		all: unset;
		cursor: pointer;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 52px;
		border-radius: 12px;
		gap: 2px;
		position: relative;
		scroll-snap-align: center;
		transition:
			background 160ms,
			color 160ms;
	}

	.day .dow {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.day .num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variant-numeric: tabular-nums lining-nums;
		font-variation-settings: 'opsz' 36, 'SOFT' 80, 'wght' 460;
		font-size: 18px;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
	}

	.day.today .today-mark {
		position: absolute;
		bottom: 6px;
		left: 50%;
		transform: translateX(-50%);
		width: 14px;
		height: 1.5px;
		border-radius: 999px;
		background: var(--color-ember);
	}

	.day.selected {
		background: var(--color-text-primary);
	}
	.day.selected .dow {
		color: color-mix(in oklab, var(--color-bg-0) 70%, transparent);
	}
	.day.selected .num {
		color: var(--color-bg-0);
	}
	.day.selected.today .today-mark {
		background: var(--color-ember-glow);
	}

	.day.future {
		opacity: 0.32;
		cursor: not-allowed;
	}
</style>
