<script lang="ts">
  // Frame style, call-to-action text and colours.
  import { CTA_MAX, FRAME_STYLES, type FrameStyle } from '../../lib/qr/options';
  import ColorInput from './ColorInput.svelte';
  import { studio } from './studio.svelte';

  const NAMES: Record<FrameStyle, string> = {
    none: 'No frame',
    'banner-bottom': 'Banner below',
    'banner-top': 'Banner above',
    card: 'Card',
    bubble: 'Speech bubble',
  };
  const frame = $derived(studio.style.frame);
</script>

<div class="grid gap-4">
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <label for="fq-frame" class="fq-label">Frame</label>
      <select id="fq-frame" class="fq-input fq-select" bind:value={frame.style}>
        {#each FRAME_STYLES as f (f)}
          <option value={f}>{NAMES[f]}</option>
        {/each}
      </select>
    </div>
    {#if frame.style !== 'none'}
      <div>
        <label for="fq-cta" class="fq-label">Frame text</label>
        <input
          id="fq-cta"
          type="text"
          class="fq-input"
          maxlength={CTA_MAX}
          placeholder="Scan me"
          aria-describedby="fq-cta-hint"
          bind:value={frame.text}
        />
        <p id="fq-cta-hint" class="mt-1.5 text-xs text-muted">{frame.text.length}/{CTA_MAX} characters</p>
      </div>
    {/if}
  </div>
  {#if frame.style !== 'none'}
    <div class="grid gap-4 sm:grid-cols-2">
      <ColorInput label="Frame colour" value={frame.color} onchange={(c) => (studio.style.frame.color = c)} />
      <ColorInput label="Text colour" value={frame.textColor} onchange={(c) => (studio.style.frame.textColor = c)} />
    </div>
  {/if}
</div>
