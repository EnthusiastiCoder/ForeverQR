<script lang="ts">
  // The content error for forms whose error is not tied to one field.
  import { out } from '../engine.svelte';
</script>

<p class="mt-3 min-h-5 text-sm font-medium text-bad" aria-live="polite">
  {#if out.error}{out.error}{/if}
</p>
