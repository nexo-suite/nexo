<script lang="ts">
	import { onMount } from 'svelte';

	const KONAMI = [
		'ArrowUp',
		'ArrowUp',
		'ArrowDown',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'ArrowLeft',
		'ArrowRight',
		'b',
		'a'
	];

	let active = $state(false);

	onMount(() => {
		let seq: string[] = [];

		function onKey(e: KeyboardEvent) {
			seq.push(e.key);
			seq = seq.slice(-KONAMI.length);
			if (seq.length === KONAMI.length && seq.every((k, i) => k === KONAMI[i])) {
				trigger();
				seq = [];
			}
		}

		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function trigger() {
		active = true;
		setTimeout(() => (active = false), 3000);
	}
</script>

{#if active}
	<div class="konami-overlay" aria-hidden="true">
		{#each Array(40) as _, i (i)}
			<div
				class="confetti"
				style="--x: {Math.random() * 100}vw; --d: {0.4 +
					Math.random() * 0.6}s; --r: {Math.random() * 360}deg; --c: {[
					'#ef4444',
					'#f59e0b',
					'#3b82f6',
					'#16a34a',
					'#a855f7',
					'#ec4899'
				][i % 6]}"
			></div>
		{/each}
	</div>
{/if}

<style>
	.konami-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		pointer-events: none;
		overflow: hidden;
	}

	.confetti {
		position: absolute;
		top: -10px;
		left: var(--x);
		width: 8px;
		height: 8px;
		background: var(--c);
		border-radius: 2px;
		animation: fall 2.5s var(--d) ease-out forwards;
	}

	@keyframes fall {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(100vh) rotate(var(--r));
			opacity: 0;
		}
	}
</style>
