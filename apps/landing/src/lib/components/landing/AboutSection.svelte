<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<section id="about" class="scroll-mt-20 py-14">
	<div class="mx-auto max-w-[1100px] px-6">
		<div class="reveal section-head mb-7">
			<div class="t-label">{m.section_about()}</div>
			<h2 class="mt-1 text-[clamp(28px,3vw,36px)] font-semibold tracking-tight">
				{m.about_heading()}
			</h2>
			<p class="text-text-muted mt-2 max-w-[520px] text-[15px] leading-relaxed">{m.about_sub()}</p>
		</div>
		<div class="reveal grid grid-cols-1 gap-4 sm:grid-cols-2" style="transition-delay: 60ms">
			<div class="card-static">
				<div class="t-label mb-2">{m.about_built_label()}</div>
				<h3 class="text-[18px] font-semibold">{m.about_built_title()}</h3>
				<p class="text-text-muted mt-1.5 text-[14px] leading-relaxed">{m.about_built_desc()}</p>
			</div>
			<div class="card-static">
				<div class="t-label mb-2">{m.about_rules_label()}</div>
				<h3 class="text-[18px] font-semibold">{m.about_rules_title()}</h3>
				<p class="text-text-muted mt-1.5 text-[14px] leading-relaxed">{m.about_rules_desc()}</p>
			</div>
			<div class="card-static">
				<div class="t-label mb-2">{m.about_who_label()}</div>
				<h3 class="text-[18px] font-semibold">{m.about_who_title()}</h3>
				<p class="text-text-muted mt-1.5 text-[14px] leading-relaxed">{m.about_who_desc()}</p>
			</div>
			<div class="card-static">
				<div class="t-label mb-2">{m.about_wont_label()}</div>
				<h3 class="text-[18px] font-semibold">{m.about_wont_title()}</h3>
				<p class="text-text-muted mt-1.5 text-[14px] leading-relaxed">{m.about_wont_desc()}</p>
			</div>
		</div>
	</div>
</section>

<style>
	.t-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.card-static {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 28px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
	}
</style>
