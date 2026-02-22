<script lang="ts">
  // Quiet-zone margin and error correction, in plain language.
  import type { Ecc } from '../../lib/qr/encode';
  import { MARGIN_MAX } from '../../lib/qr/options';
  import { studio, ui } from './studio.svelte';

  const ECC: { value: Ecc; label: string }[] = [
    { value: 'L', label: 'Low (7%): smallest code' },
    { value: 'M', label: 'Medium (15%): good default' },
    { value: 'Q', label: 'High (25%): for logos' },
    { value: 'H', label: 'Highest (30%): big logos, rough prints' },
  ];
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <div>
    <label for="fq-ecc" class="fq-label">Error correction</label>
    <select
      id="fq-ecc"
      class="fq-input fq-select"
      aria-describedby="fq-ecc-hint"
      value={studio.ecc}
      onchange={(e) => {
        studio.ecc = e.currentTarget.value as Ecc;
        ui.eccRaised = false;
      }}
    >
      {#each ECC as o (o.value)}
        <option value={o.value}>{o.label}</option>
      {/each}
    </select>
    <p id="fq-ecc-hint" class="mt-1.5 text-xs text-muted">How much of the code can be damaged or covered and still scan.</p>
  </div>
  <div>
    <label for="fq-margin" class="fq-label"
      >Margin <span class="font-normal text-muted">{studio.style.margin} modules</span></label
    >
    <input id="fq-margin" type="range" class="fq-range w-full" min="0" max={MARGIN_MAX} step="1" bind:value={studio.style.margin} />
    <p class="mt-1.5 text-xs text-muted">The empty border scanners need. 4 is the standard.</p>
  </div>
</div>
