<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.page_datenschutz_title()}</title>
</svelte:head>

<main class="mx-auto max-w-[680px] px-6 py-16 pb-32">
	<a href="/" class="text-text-faint hover:text-text-subtle mb-10 inline-flex items-center gap-1.5 text-[13px] transition-colors">
		← Nexo
	</a>

	<h1 class="text-text mb-1 text-[28px] font-semibold">Datenschutzerklärung</h1>
	<p class="text-text-faint mb-10 text-[13px]">Stand: Mai 2026 · gemäß DSGVO &amp; TTDSG</p>

	<div class="space-y-10 text-[15px] leading-relaxed">

		<section>
			<h2 class="text-text mb-3 text-[17px] font-semibold">1. Verantwortlicher</h2>
			<p class="text-text-subtle">
				Kevin Rieger<br />
				<!-- TODO: add street + house number before deploying --><br />
				68199 Mannheim, Deutschland<br />
				<a href="mailto:mail@krieger2501.de" class="text-accent hover:underline">mail@krieger2501.de</a>
			</p>
		</section>

		<section>
			<h2 class="text-text mb-3 text-[17px] font-semibold">2. Was diese Seite ist</h2>
			<p class="text-text-subtle">
				Nexo ist ein privates, nicht-kommerzielles Projekt. Die Apps sind ausschließlich für
				eingeladene Personen zugänglich. Diese Startseite ist öffentlich erreichbar, enthält
				aber keinerlei Tracking, Werbung oder externe Analyse-Dienste.
			</p>
		</section>

		<section>
			<h2 class="text-text mb-3 text-[17px] font-semibold">3. Welche Daten werden verarbeitet</h2>

			<div class="space-y-6">
				<div>
					<h3 class="text-text mb-1 text-[14px] font-semibold">Server-Zugriffsprotokolle</h3>
					<p class="text-text-subtle">
						Bei jedem Seitenaufruf protokolliert der Webserver (Caddy) vorübergehend: IP-Adresse,
						Datum und Uhrzeit, aufgerufene URL sowie Browser-Kennung (User-Agent). Diese Daten
						dienen ausschließlich dem Betrieb und der Sicherheit des Servers und werden nach
						spätestens 14 Tagen automatisch gelöscht. Eine Weitergabe findet nicht statt.
					</p>
					<p class="text-text-faint mt-1 text-[13px]">
						Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb)
					</p>
				</div>

				<div>
					<h3 class="text-text mb-1 text-[14px] font-semibold">Session-Cookie (nur eingeloggte Nutzer)</h3>
					<p class="text-text-subtle">
						Nach der Anmeldung wird ein technisch notwendiges Session-Cookie gesetzt, das die
						Sitzung aufrechterhält. Es enthält keine persönlichen Daten außer einer zufälligen
						Sitzungs-ID. Dieses Cookie ist für die Funktionsfähigkeit des Dienstes zwingend
						erforderlich; eine gesonderte Einwilligung ist nicht notwendig.
					</p>
					<p class="text-text-faint mt-1 text-[13px]">
						Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TTDSG, Art. 6 Abs. 1 lit. b DSGVO
					</p>
				</div>

				<div>
					<h3 class="text-text mb-1 text-[14px] font-semibold">Kontodaten (nur eingeladene Nutzer)</h3>
					<p class="text-text-subtle">
						Bei der Registrierung werden E-Mail-Adresse und Anzeigename gespeichert. Diese Daten
						sind für die Bereitstellung des Dienstes erforderlich und werden nicht an Dritte
						weitergegeben. Eine Löschung ist jederzeit auf Anfrage möglich.
					</p>
					<p class="text-text-faint mt-1 text-[13px]">
						Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
					</p>
				</div>

				<div>
					<h3 class="text-text mb-1 text-[14px] font-semibold">OAuth-Anmeldung (Google, GitHub, Discord)</h3>
					<p class="text-text-subtle">
						Wer sich über einen externen Anbieter anmeldet, initiiert dabei eine Verbindung zu
						dessen Servern. Der jeweilige Anbieter übermittelt dabei Profildaten (E-Mail, Name)
						an Nexo. Für die Datenverarbeitung durch diese Anbieter gelten deren eigene
						Datenschutzerklärungen:
					</p>
					<ul class="text-text-faint mt-2 list-none space-y-0.5 text-[13px]">
						<li><a href="https://policies.google.com/privacy" class="text-accent hover:underline" target="_blank" rel="noopener">Google Privacy Policy</a></li>
						<li><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" class="text-accent hover:underline" target="_blank" rel="noopener">GitHub Privacy Statement</a></li>
						<li><a href="https://discord.com/privacy" class="text-accent hover:underline" target="_blank" rel="noopener">Discord Privacy Policy</a></li>
					</ul>
				</div>
			</div>
		</section>

		<section>
			<h2 class="text-text mb-3 text-[17px] font-semibold">4. Was wir nicht tun</h2>
			<p class="text-text-subtle">
				Kein Google Analytics oder vergleichbare Tracking-Dienste. Keine Werbung. Keine
				Weitergabe von Daten an Dritte zu kommerziellen Zwecken. Keine Profilbildung.
				Schriften werden lokal ausgeliefert — keine Anfragen an Google Fonts oder externe CDNs.
			</p>
		</section>

		<section>
			<h2 class="text-text mb-3 text-[17px] font-semibold">5. Deine Rechte</h2>
			<p class="text-text-subtle mb-3">
				Du hast nach DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung
				(Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20)
				und Widerspruch (Art. 21).
			</p>
			<p class="text-text-subtle">
				Anfragen bitte per E-Mail an:
				<a href="mailto:mail@krieger2501.de" class="text-accent hover:underline">mail@krieger2501.de</a>
			</p>
		</section>

		<section>
			<h2 class="text-text mb-3 text-[17px] font-semibold">6. Beschwerderecht</h2>
			<p class="text-text-subtle">
				Du hast das Recht, dich bei der zuständigen Aufsichtsbehörde zu beschweren:
			</p>
			<p class="text-text-subtle mt-2">
				Landesbeauftragter für Datenschutz und Informationsfreiheit Baden-Württemberg (LfDI BW)<br />
				Lautenschlagerstraße 20, 70173 Stuttgart<br />
				<a href="mailto:poststelle@lfdi.bwl.de" class="text-accent hover:underline">poststelle@lfdi.bwl.de</a>
			</p>
		</section>

	</div>
</main>
