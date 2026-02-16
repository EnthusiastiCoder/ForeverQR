<script lang="ts">
  import Field from '../Field.svelte';
  import { out } from '../engine.svelte';
  import { studio } from '../studio.svelte';
</script>

<Field
  label="URL"
  type="url"
  inputmode="url"
  autocomplete="url"
  placeholder="https://your-site.com/menu"
  hint="Paste or type a link. https:// is added for you."
  error={out.error}
  autofocus
  bind:value={studio.fields.url.url}
/>
