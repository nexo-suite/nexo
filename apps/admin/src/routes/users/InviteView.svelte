<script lang="ts">
	import { enhance } from '$app/forms';
	import { userMessage } from '@nexo/errors';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		inviteEmail: string;
		inviteSent: boolean;
		form: { error?: string } | null | undefined;
		onclose: () => void;
	}

	let {
		inviteEmail = $bindable(''),
		inviteSent = $bindable(false),
		form,
		onclose
	}: Props = $props();

	const inviteEmailValid = $derived(/.+@.+\..+/.test(inviteEmail));
</script>

{#if inviteSent}
	<div class="screen fade-in">
		<div class="invite-success-card">
			<div class="success-icon">
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
					><path d="M3 8l3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" /></svg
				>
			</div>
			<div class="success-title">{m.invite_success_title({ email: inviteEmail })}</div>
			<div class="success-sub">
				{m.invite_success_sub()}
			</div>
			<button
				type="button"
				class="btn btn-primary btn-block"
				style="margin-top:20px"
				onclick={onclose}
			>
				{m.common_done()}
			</button>
			<button
				type="button"
				class="btn btn-ghost btn-block"
				style="margin-top:6px"
				onclick={() => {
					inviteSent = false;
					inviteEmail = '';
				}}
			>
				{m.invite_another()}
			</button>
		</div>
	</div>
{:else}
	<div class="screen fade-in">
		<button type="button" class="back-nav" onclick={onclose}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
				><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" /></svg
			>
			{m.users_back()}
		</button>
		<div>
			<div class="label-eyebrow">{m.invite_eyebrow()}</div>
			<h1 class="screen-title">{m.invite_screen_title()}</h1>
			<div class="screen-sub">{m.invite_screen_sub()}</div>
		</div>

		<form
			method="POST"
			action="?/addEmail"
			class="invite-form"
			use:enhance={() =>
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') inviteSent = true;
				}}
		>
			<div class="form-field">
				<label class="label-eyebrow field-label" for="invite-email">{m.invite_email_label()}</label>
				<input
					id="invite-email"
					name="email"
					type="email"
					inputmode="email"
					autocapitalize="off"
					autocorrect="off"
					class="input"
					placeholder={m.invite_email_placeholder()}
					bind:value={inviteEmail}
				/>
			</div>

			{#if form?.error}
				<div class="form-error">{userMessage(form.error)}</div>
			{/if}

			<button
				type="submit"
				class="btn btn-primary btn-block"
				disabled={!inviteEmailValid}
				style="opacity:{inviteEmailValid ? 1 : 0.5}"
			>
				{m.invite_send()}
			</button>
		</form>

		<div class="invite-note">
			{m.invite_note()}
		</div>
	</div>
{/if}

<style>
	.back-nav {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 15px;
		font-weight: 500;
		color: var(--accent-ink);
		background: transparent;
		border: 0;
		cursor: pointer;
		padding: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.back-nav svg {
		width: 20px;
		height: 20px;
	}

	.invite-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 14px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		display: block;
	}

	.invite-form .input {
		padding-left: 14px;
	}

	.form-error {
		color: var(--err-ink);
		font-size: 13px;
		font-weight: 500;
	}

	.invite-note {
		color: var(--color-text-subtle);
		font-size: 12px;
		line-height: 1.5;
		padding: 0 4px;
	}

	.invite-success-card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 32px;
		text-align: center;
	}

	.success-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--ok-bg);
		color: var(--ok-ink);
		display: grid;
		place-items: center;
		margin: 0 auto 12px;
	}

	.success-icon svg {
		width: 28px;
		height: 28px;
	}

	.success-title {
		font-size: 18px;
		font-weight: 600;
	}

	.success-sub {
		color: var(--color-text-muted);
		font-size: 14px;
		margin-top: 6px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 18px;
		font-size: 15px;
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out);
		background: transparent;
		color: var(--color-text-primary);
	}

	.btn-primary {
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
	}

	.btn-ghost {
		background: var(--color-bg-2);
	}

	.btn-block {
		width: 100%;
	}
</style>
