<script lang="ts">
  import Field from '../Field.svelte';
  import FormError from './FormError.svelte';
  import { studio } from '../studio.svelte';

  const f = $derived(studio.fields.geo);
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <Field label="Latitude" inputmode="decimal" placeholder="48.8584" hint="-90 to 90" bind:value={f.lat} />
  <Field label="Longitude" inputmode="decimal" placeholder="2.2945" hint="-180 to 180" bind:value={f.lng} />
</div>
<p class="mt-3 text-xs text-muted">Tip: in most map apps, long-press a spot to copy its coordinates.</p>
<FormError />
