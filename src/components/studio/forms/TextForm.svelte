<script lang="ts">
  import Field from '../Field.svelte';
  import FormError from './FormError.svelte';
  import { studio } from '../studio.svelte';
</script>

<Field
  label="Text"
  kind="textarea"
  rows={5}
  placeholder="Any text, up to about 2,000 characters."
  bind:value={studio.fields.text.text}
/>
<FormError />
