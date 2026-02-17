<script lang="ts">
  import Field from '../Field.svelte';
  import FormError from './FormError.svelte';
  import { studio } from '../studio.svelte';

  const f = $derived(studio.fields.wifi);
  let show = $state(false);
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <Field label="Network name (SSID)" autocomplete="off" placeholder="Cafe Guest" bind:value={f.ssid} />
  <Field
    label="Encryption"
    kind="select"
    options={[
      { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
      { value: 'WEP', label: 'WEP (old)' },
      { value: 'nopass', label: 'None (open network)' },
    ]}
    bind:value={f.encryption}
  />
  {#if f.encryption !== 'nopass'}
    <div class="relative sm:col-span-2">
      <Field label="Password" type={show ? 'text' : 'password'} autocomplete="off" bind:value={f.password} />
      <button
        type="button"
        class="absolute top-8 right-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:text-ink"
        aria-pressed={show}
        onclick={() => (show = !show)}>{show ? 'Hide' : 'Show'}</button
      >
    </div>
  {/if}
  <Field label="Hidden network" kind="checkbox" bind:value={f.hidden} class="sm:col-span-2" />
</div>
<p class="mt-3 text-xs text-muted">The password stays on this device: the code is made in your browser.</p>
<FormError />
