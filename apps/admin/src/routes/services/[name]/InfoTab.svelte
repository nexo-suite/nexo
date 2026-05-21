<script lang="ts">
	import type { ContainerInspect, ContainerStats } from '$lib/server/docker';

	interface Props {
		container: ContainerInspect;
		stats: ContainerStats | null;
		formatDate: (iso: string) => string;
		restartPolicy: string;
		networks: string[];
	}

	let { container, stats, formatDate, restartPolicy, networks }: Props = $props();

	function fmtBytes(n: number | null): string {
		if (n === null || n === undefined) return '—';
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
		return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
	}

	const cpuLabel = $derived(stats?.cpuPercent != null ? `${stats.cpuPercent.toFixed(1)}%` : '—');
	const memLabel = $derived(
		stats?.memoryUsedBytes != null
			? stats.memoryLimitBytes
				? `${fmtBytes(stats.memoryUsedBytes)} / ${fmtBytes(stats.memoryLimitBytes)}`
				: fmtBytes(stats.memoryUsedBytes)
			: '—'
	);
</script>

<div class="row-stack fade-in">
	{#if container.State.Running && stats}
		<div class="kv">
			<span class="k">CPU</span>
			<span class="v mono">{cpuLabel}</span>
		</div>
		<div class="kv">
			<span class="k">Memory</span>
			<span class="v mono">{memLabel}</span>
		</div>
	{/if}
	<div class="kv stacked">
		<span class="k">Image</span>
		<span class="v mono break">{container.Config.Image}</span>
	</div>
	{#each [['Container ID', container.Id.slice(0, 12), true], ['Started', formatDate(container.State.StartedAt), false], ['Restarts', String(container.RestartCount), true], ['Restart policy', restartPolicy, true]] as [k, v, mono] (k)}
		<div class="kv">
			<span class="k">{k}</span>
			<span class="v {mono ? 'mono' : ''}">{v}</span>
		</div>
	{/each}
	<div class="kv stacked">
		<span class="k">Networks</span>
		<span class="v mono break">{networks.join(', ')}</span>
	</div>
	{#if !container.State.Running}
		<div class="kv">
			<span class="k">Stopped</span>
			<span class="v">{formatDate(container.State.FinishedAt)}</span>
		</div>
		<div class="kv">
			<span class="k">Exit code</span>
			<span class="v mono {container.State.ExitCode !== 0 ? 'warn-v' : ''}"
				>{container.State.ExitCode}</span
			>
		</div>
	{/if}
</div>

<style>
	.kv.stacked {
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}
	.kv.stacked .v {
		text-align: left;
		max-width: 100%;
		white-space: normal;
		overflow: visible;
	}
	.kv .v.break {
		word-break: break-all;
		line-height: 1.4;
	}
</style>
