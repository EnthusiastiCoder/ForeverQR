<script lang="ts">
  import Field from '../Field.svelte';
  import FormError from './FormError.svelte';
  import { studio } from '../studio.svelte';

  const f = $derived(studio.fields.vcard);
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <Field label="First name" autocomplete="given-name" bind:value={f.first} />
  <Field label="Last name" autocomplete="family-name" bind:value={f.last} />
  <Field label="Organisation" autocomplete="organization" bind:value={f.org} />
  <Field label="Job title" autocomplete="organization-title" bind:value={f.title} />
  <Field label="Mobile phone" type="tel" inputmode="tel" autocomplete="tel" bind:value={f.phoneCell} />
  <Field label="Work phone" type="tel" inputmode="tel" bind:value={f.phoneWork} />
  <Field label="Email" type="email" inputmode="email" autocomplete="email" bind:value={f.email} />
  <Field label="URL" type="url" inputmode="url" autocomplete="url" bind:value={f.url} />
</div>
<details class="mt-4 rounded-xl border border-line">
  <summary class="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-surface-2">
    Address and note
  </summary>
  <div class="grid gap-4 p-4 pt-1 sm:grid-cols-2">
    <Field label="Street" autocomplete="street-address" class="sm:col-span-2" bind:value={f.street} />
    <Field label="City" autocomplete="address-level2" bind:value={f.city} />
    <Field label="Region" autocomplete="address-level1" bind:value={f.region} />
    <Field label="Postcode" autocomplete="postal-code" bind:value={f.zip} />
    <Field label="Country" autocomplete="country-name" bind:value={f.country} />
    <Field label="Note" kind="textarea" rows={2} class="sm:col-span-2" bind:value={f.note} />
  </div>
</details>
<FormError />
