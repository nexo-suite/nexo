<script lang="ts">
	import type { EnrichedContainer } from './+page.server';
	import { ChevronDown, CircleCheck, AlertTriangle } from '@lucide/svelte';
	import { PageHeader } from '@nexo/ui';
	import { ctnState, ctnIsApp, type CtnState } from '$lib/utils/containers';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import CorrelationIdSearch from '$lib/components/CorrelationIdSearch.svelte';
	import ServiceRow from './ServiceRow.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	type Bucket = 'down' | 'degraded' | 'pending' | 'apps-ok' | 'infra';

	type Section = {
		key: Bucket;
		label: string;
		state: CtnState | 'mixed';
		containers: EnrichedContainer[];
	};

	const grouped = $derived.by(() => {
		const buckets: Record<Bucket, EnrichedContainer[]> = {
			down: [],
			degraded: [],
			pending: [],
			'apps-ok': [],
			infra: []
		};
		for (const c of data.containers) {
			const state = ctnState(c);
			const app = ctnIsApp(c);
			if (state === 'down') buckets.down.push(c);
			else if (state === 'degraded') buckets.degraded.push(c);
			else if (state === 'pending') buckets.pending.push(c);
			else if (app) buckets['apps-ok'].push(c);
			else buckets.infra.push(c);
		}
		return buckets;
	});

	const sections: Section[] = $derived(
		(
			[
				{ key: 'down', label: m.pill_down(), state: 'down' },
				{ key: 'degraded', label: m.pill_degraded(), state: 'degraded' },
				{ key: 'pending', label: m.pill_pending(), state: 'pending' },
				{ key: 'apps-ok', label: m.section_apps(), state: 'ok' },
				{ key: 'infra', label: m.section_infra(), state: 'ok' }
			] as Array<Pick<Section, 'key' | 'label' | 'state'>>
		)
			.map((s) => ({ ...s, containers: grouped[s.key] }))
			.filter((s) => s.containers.length > 0)
	);

	const downCount = $derived(grouped.down.length);
	const degradedCount = $derived(grouped.degraded.length);
	const allGood = $derived(downCount + degradedCount === 0);
	const headlineText = $derived.by(() => {
		if (allGood) return m.dashboard_all_good_headline();
		const total = downCount + degradedCount;
		return total === 1
			? m.dashboard_attention_headline_one({ count: total })
			: m.dashboard_attention_headline_other({ count: total });
	});

	// Auto-expand infra when something there is non-OK; otherwise collapsed.
	let infraOpen = $state(false);
	$effect(() => {
		const hasIssue = grouped.infra.some((c) => ctnState(c) !== 'ok');
		if (hasIssue) infraOpen = true;
	});
</script>

<div class="page">
	<PageHeader title={m.page_title_ops()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
		{#snippet actions()}<CorrelationIdSearch />{/snippet}
	</PageHeader>

	<div class="banner" class:ok={allGood} class:bad={!allGood}>
		{#if allGood}
			<CircleCheck size={20} strokeWidth={2} />
		{:else}
			<AlertTriangle size={20} strokeWidth={2} />
		{/if}
		<div class="banner-text">
			<div class="banner-headline">{headlineText}</div>
			<div class="banner-sub">
				{#if allGood}
					{m.dashboard_running_count({ count: data.containers.length })}
				{:else}
					{#if downCount > 0}{m.dashboard_down_label({ count: downCount })}{/if}{#if downCount > 0 && degradedCount > 0}
						·
					{/if}{#if degradedCount > 0}{m.dashboard_degraded_label({ count: degradedCount })}{/if}
				{/if}
			</div>
		</div>
	</div>

	{#each sections as section (section.key)}
		{@const isInfra = section.key === 'infra'}
		<div class="sec">
			{#if isInfra}
				<button
					type="button"
					class="sec-header collapsible"
					class:open={infraOpen}
					onclick={() => (infraOpen = !infraOpen)}
				>
					<span class="sec-label">{section.label}</span>
					<span class="sec-count">{section.containers.length}</span>
					<ChevronDown class="chev" size={16} strokeWidth={1.8} />
				</button>
			{:else}
				<div class="sec-header">
					<span class="sec-label">{section.label}</span>
					<span class="sec-count">{section.containers.length}</span>
				</div>
			{/if}
			{#if !isInfra || infraOpen}
				<div class="sec-list">
					{#each section.containers as c (c.Id)}
						<ServiceRow container={c} />
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.page {
		padding: 12px 16px 16px;
		max-width: 720px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.banner {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 18px 20px;
		border-radius: var(--radius-xl);
		border: 1px solid;
	}
	.banner.ok {
		color: oklch(0.62 0.18 145);
		background: color-mix(in oklab, oklch(0.62 0.18 145) 8%, var(--color-surface-1));
		border-color: color-mix(in oklab, oklch(0.62 0.18 145) 26%, var(--color-border-default));
	}
	.banner.bad {
		color: oklch(0.59 0.2 27);
		background: color-mix(in oklab, oklch(0.59 0.2 27) 10%, var(--color-surface-1));
		border-color: color-mix(in oklab, oklch(0.59 0.2 27) 32%, var(--color-border-default));
	}
	.banner-text {
		min-width: 0;
	}
	.banner-headline {
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.2;
	}
	.banner-sub {
		margin-top: 3px;
		font-size: 12.5px;
		font-family: var(--font-mono);
		opacity: 0.85;
	}

	.sec {
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.sec-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 4px 8px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		background: transparent;
		border: 0;
		text-align: left;
		width: 100%;
	}
	.sec-header.collapsible {
		cursor: pointer;
		min-height: 44px;
	}
	.sec-label {
		font-weight: 600;
		color: var(--color-text-subtle);
		letter-spacing: 0.06em;
	}
	.sec-count {
		font-weight: 500;
		color: var(--color-text-faint);
	}
	.sec-header.collapsible :global(.chev) {
		margin-left: auto;
		transition: transform var(--duration-fast) var(--ease-out);
		color: var(--color-text-faint);
	}
	.sec-header.collapsible.open :global(.chev) {
		transform: rotate(180deg);
	}
	.sec-list {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}
</style>
