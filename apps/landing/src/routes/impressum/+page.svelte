<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.page_impressum_title()}</title>
</svelte:head>

<main class="mx-auto max-w-[680px] px-6 py-16 pb-32">
	<a href="/" class="text-text-faint hover:text-text-subtle mb-10 inline-flex items-center gap-1.5 text-[13px] transition-colors">
		← Nexo
	</a>

	<h1 class="text-text mb-1 text-[28px] font-semibold">Impressum</h1>
	<p class="text-text-faint mb-10 text-[13px]">Angaben gemäß § 5 DDG</p>

	<section class="space-y-8 text-[15px] leading-relaxed">
		<div>
			<h2 class="text-text-subtle mb-2 text-[11px] font-semibold tracking-widest uppercase">Verantwortlich</h2>
			<p class="text-text">Kevin Rieger</p>
			<!-- TODO: add street + house number before deploying -->
			<p class="text-text">68199 Mannheim</p>
			<p class="text-text">Deutschland</p>
		</div>

		<div>
			<h2 class="text-text-subtle mb-2 text-[11px] font-semibold tracking-widest uppercase">Kontakt</h2>
			<a href="mailto:mail@krieger2501.de" class="text-accent hover:underline">mail@krieger2501.de</a>
		</div>

		<div>
			<h2 class="text-text-subtle mb-2 text-[11px] font-semibold tracking-widest uppercase">Hinweis</h2>
			<p class="text-text-subtle">
				Nexo ist ein privates, nicht-kommerzielles Projekt. Kein Impressumspflichtiger Gewerbebetrieb.
				Zugang zu den Apps ist auf eingeladene Personen beschränkt.
			</p>
		</div>

		<div>
			<h2 class="text-text-subtle mb-2 text-[11px] font-semibold tracking-widest uppercase">Haftungsausschluss</h2>
			<p class="text-text-subtle">
				Für die Inhalte verlinkter externer Seiten wird keine Haftung übernommen.
				Für deren Inhalte sind ausschließlich deren Betreiber verantwortlich.
			</p>
		</div>
	</section>
</main>
