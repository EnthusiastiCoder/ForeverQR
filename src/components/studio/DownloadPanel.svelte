<script lang="ts">
  // Section 3: export buttons and their options.
  import { copyPng, downloadPdf, downloadPng, downloadSvg } from './download';
  import { current, out } from './engine.svelte';
  import { studio, type PdfPage } from './studio.svelte';

  let busy = $state<'' | 'svg' | 'png' | 'pdf' | 'copy'>('');
  let note = $state('');

  async function run(kind: 'svg' | 'png' | 'pdf' | 'copy') {
    busy = kind;
    note = '';
    try {
      const r = await current();
      if (!r) return;
      const exp = $state.snapshot(studio.exp);
      if (kind === 'svg') downloadSvg(r, exp);
      else if (kind === 'png') await downloadPng(r, exp);
      else if (kind === 'pdf') await downloadPdf(r, exp);
      else note = (await copyPng(r, exp)) ? 'Copied. Paste it anywhere.' : 'Your browser blocked copying images. Download the PNG instead.';
    } catch (err) {
      note = `Export failed: ${(err as Error)?.message ?? 'unknown error'}`;
    } finally {
      busy = '';
    }
  }

  const disabled = $derived(!out.ready);
  const PAGES: { value: PdfPage; label: string }[] = [
    { value: 'A4', label: 'A4 (210 × 297 mm)' },
    { value: 'Letter', label: 'US Letter (8.5 × 11 in)' },
    { value: 'fit', label: 'Fit to code' },
  ];
  const icon = 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14';
</script>

<div class="grid gap-4">
  <div class="grid grid-cols-3 gap-2">
    {#each [['svg', 'SVG', 'Sharp at any size'], ['png', 'PNG', 'For screens, docs'], ['pdf', 'PDF', 'Ready to print']] as [k, name, sub] (k)}
      <button
        type="button"
        class="fq-btn flex-col gap-0.5 px-2 py-3 {k === 'png' ? 'fq-btn-primary' : 'fq-btn-ghost'}"
        disabled={disabled || busy === k}
        aria-busy={busy === k}
        onclick={() => run(k as 'svg' | 'png' | 'pdf')}
      >
        <span class="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={icon} /></svg>
          <span><span class="sr-only">Download </span>{name}</span>
        </span>
        <span class="text-[0.6875rem] font-medium opacity-80" aria-hidden="true">{sub}</span>
      </button>
    {/each}
  </div>

  <div class="grid grid-cols-2 gap-3">
    <div>
      <label for="fq-png-size" class="fq-label">PNG size</label>
      <div class="relative">
        <input
          id="fq-png-size"
          type="number"
          min="256"
          max="4096"
          step="1"
          inputmode="numeric"
          class="fq-input pr-10"
          bind:value={studio.exp.pngSize}
        />
        <span class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted" aria-hidden="true">px</span>
      </div>
    </div>
    <div>
      <label for="fq-pdf-page" class="fq-label">PDF page</label>
      <select id="fq-pdf-page" class="fq-input fq-select" bind:value={studio.exp.pdfPage}>
        {#each PAGES as p (p.value)}
          <option value={p.value}>{p.label}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="fq-pdf-mm" class="fq-label">PDF width (mm)</label>
      <input id="fq-pdf-mm" type="number" min="10" max="500" step="1" inputmode="numeric" class="fq-input" bind:value={studio.exp.pdfMm} />
    </div>
    <div class="flex items-end pb-2.5">
      <div class="flex items-center gap-2.5">
        <input id="fq-transparent" type="checkbox" class="size-4.5 accent-brand" bind:checked={studio.exp.transparent} />
        <label for="fq-transparent" class="text-sm font-medium text-ink">Transparent background</label>
      </div>
    </div>
  </div>

  <div class="flex items-center gap-3">
    <button type="button" class="fq-btn fq-btn-ghost py-2 text-sm" disabled={disabled || busy === 'copy'} onclick={() => run('copy')}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
        ><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg
      >
      Copy PNG
    </button>
    <p class="text-xs text-muted" aria-live="polite">{note}</p>
  </div>
</div>
