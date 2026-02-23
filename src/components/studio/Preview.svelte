<script lang="ts">
  // The live preview card. On desktop it sits in the sticky right column; on phones it is a
  // fixed bottom sheet that is compact by default and expands on demand.
  import ScanBadge from './ScanBadge.svelte';
  import { out } from './engine.svelte';
  import { studio } from './studio.svelte';

  let expanded = $state(false);

  const PLACEHOLDER = $derived(out.empty ? 'Type something to make your code' : 'Fix the content to see your code');
</script>

<section
  data-testid="preview-sheet"
  aria-label="Preview"
  class="fq-sheet fq-card z-20 p-3 lg:p-5 {expanded ? 'is-open' : ''}"
>
  <div class="flex items-center gap-3 lg:block">
    <div class="fq-preview-box relative shrink-0 overflow-hidden rounded-xl border border-line lg:rounded-2xl {studio.exp.transparent ? 'fq-checker' : 'bg-white'}">
      <div
        data-testid="qr-preview"
        class="absolute inset-0 grid place-items-center p-[4%] transition-opacity [&>svg]:h-full [&>svg]:w-full {out.ready ? '' : 'opacity-20'}"
        role="img"
        aria-label={out.ready ? 'Live preview of your QR code' : 'QR code preview placeholder'}
      >
        {#if out.svg}
          {@html out.svg}
        {:else}
          <svg viewBox="0 0 29 29" aria-hidden="true"
            ><path
              fill="#111613"
              d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM22 0h7v7h-7zm1 1v5h5V1zm1 1h3v3h-3zM0 22h7v7H0zm1 1v5h5v-5zm1 1h3v3H2zM9 1h2v2H9zm4 0h3v1h-3zm-2 3h2v2h-2zm4 1h2v3h-2zM9 8h3v2H9zm5 2h2v2h-2zm4-1h3v2h-3zm4 3h2v3h-2zm3 1h3v1h-3zM9 13h2v3H9zm3 2h3v2h-3zm5-1h2v2h-2zm-9 4h2v2H8zm5 1h3v1h-3zm5 0h2v3h-2zm3 2h3v2h-3zm4-2h3v2h-3zM9 22h2v2H9zm4 1h2v3h-2zm4 2h3v2h-3zm5 2h2v2h-2zm4-3h3v2h-3z"
            /></svg
          >
        {/if}
      </div>
      {#if !out.ready}
        <p class="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 text-center text-sm font-semibold text-[#111613] lg:block">
          {PLACEHOLDER}
        </p>
      {/if}
    </div>

    <div class="min-w-0 flex-1 lg:mt-4">
      <ScanBadge />
      {#if out.ready}
        <p class="mt-2 hidden text-xs text-muted lg:block">
          Version {out.version} · {out.modules}×{out.modules} modules · error correction {studio.ecc}
        </p>
      {/if}
    </div>

    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-ink lg:hidden"
      aria-expanded={expanded}
      aria-label={expanded ? 'Shrink preview' : 'Enlarge preview'}
      onclick={() => (expanded = !expanded)}
    >
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform {expanded ? '' : 'rotate-180'}" aria-hidden="true"
        ><path d="m5 8 5 5 5-5" /></svg
      >
    </button>
  </div>
</section>
