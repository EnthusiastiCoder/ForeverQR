<script lang="ts">
  import Field from '../Field.svelte';
  import FormError from './FormError.svelte';
  import { studio } from '../studio.svelte';

  const f = $derived(studio.fields.sms);
</script>

<div class="grid gap-4">
  <Field label="Phone number" type="tel" inputmode="tel" autocomplete="tel" placeholder="+1 555 123 4567" bind:value={f.number} />
  <Field label="Message" kind="textarea" rows={3} placeholder="Optional pre-filled message" bind:value={f.message} />
</div>
<FormError />
