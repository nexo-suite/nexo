/**
 * useNow — a tiny reactive clock for headers that show live time.
 *
 * Usage in a Svelte 5 component:
 *   const clock = useNow();           // ticks every minute
 *   const hhmm = $derived(clock.value.toLocaleTimeString(undefined, {
 *     hour: '2-digit', minute: '2-digit'
 *   }));
 */
export function useNow(intervalMs = 60_000): { readonly value: Date } {
	let now = $state(new Date());

	$effect(() => {
		const t = setInterval(() => {
			now = new Date();
		}, intervalMs);
		return () => clearInterval(t);
	});

	return {
		get value() {
			return now;
		}
	};
}
