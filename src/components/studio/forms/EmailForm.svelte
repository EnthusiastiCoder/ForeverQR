<script lang="ts">
  import Field from '../Field.svelte';
  import FormError from './FormError.svelte';
  import { studio } from '../studio.svelte';

  const f = $derived(studio.fields.email);
</script>

<div class="grid gap-4">
  <Field label="To" type="email" inputmode="email" autocomplete="email" placeholder="hello@example.com" bind:value={f.to} />
  <Field label="Subject" bind:value={f.subject} />
  <Field label="Body" kind="textarea" rows={3} bind:value={f.body} />
</div>
<FormError />
