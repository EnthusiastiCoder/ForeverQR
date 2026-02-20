<script lang="ts">
  // Logo upload (click or drag and drop), size and padding. Adding a logo at low error
  // correction raises it to H and says so in a persistent notice.
  import { LOGO_MAX, LOGO_MIN } from '../../lib/qr/options';
  import { studio, ui } from './studio.svelte';

  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  const MAX_FILE = 5 * 1024 * 1024;

  let dragging = $state(false);
  let error = $state('');
  let input: HTMLInputElement | undefined = $state();

  const logo = $derived(studio.style.logo);

  function read(file: File | undefined) {
    error = '';
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      error = 'Use a PNG, JPEG, WebP or SVG image.';
      return;
    }
    if (file.size > MAX_FILE) {
      error = 'That image is over 5 MB. Try a smaller file.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const href = String(reader.result ?? '');
      if (!href.startsWith('data:image/')) {
        error = 'That file could not be read as an image.';
        return;
      }
      studio.style.logo = { href, size: studio.style.logo?.size ?? 0.2, padding: studio.style.logo?.padding ?? 1 };
      if (studio.ecc === 'L' || studio.ecc === 'M') {
        studio.ecc = 'H';
        ui.eccRaised = true;
      }
    };
    reader.onerror = () => (error = 'That file could not be read.');
    reader.readAsDataURL(file);
  }

  function remove() {
    studio.style.logo = null;
    ui.eccRaised = false;
    if (input) input.value = '';
  }
</script>

<div class="grid gap-4">
  <div
    role="presentation"
    class="relative flex items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors
      {dragging ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface-2/50 hover:border-brand'}"
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={(e) => {
      e.preventDefault();
      dragging = false;
      read(e.dataTransfer?.files?.[0]);
    }}
  >
    <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
      {#if logo}
        <img src={logo.href} alt="" class="max-h-full max-w-full object-contain" />
      {:else}
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#4f5a53" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          ><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" /></svg
        >
      {/if}
    </div>
    <div class="min-w-0 flex-1 text-sm">
      <p class="font-semibold text-ink">{logo ? 'Logo added' : 'Drop a logo here, or click to choose'}</p>
      <p class="text-muted">PNG, JPEG, WebP or SVG. It never leaves your device.</p>
    </div>
    <input
      bind:this={input}
      type="file"
      accept={ACCEPT.join(',')}
      aria-label="Upload logo"
      class="absolute inset-0 cursor-pointer opacity-0"
      onchange={(e) => read(e.currentTarget.files?.[0])}
    />
    {#if logo}
      <button type="button" class="fq-btn fq-btn-ghost relative z-10 px-3 py-1.5 text-sm" onclick={remove}>Remove logo</button>
    {/if}
  </div>
  {#if error}
    <p class="text-sm font-medium text-bad" role="alert">{error}</p>
  {/if}

  {#if ui.eccRaised}
    <p role="status" class="flex items-start gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm text-ink">
      <svg viewBox="0 0 20 20" width="18" height="18" class="mt-px shrink-0 text-brand" fill="currentColor" aria-hidden="true"
        ><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4h1.8v1.8H9.1V6Zm0 3.4h1.8V14H9.1V9.4Z" /></svg
      >
      <span>We raised error correction to H so the code still scans with a logo over it. You can change it under Advanced.</span>
    </p>
  {/if}

  {#if logo}
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="fq-logo-size" class="fq-label"
          >Logo size <span class="font-normal text-muted">{Math.round(logo.size * 100)}%</span></label
        >
        <input
          id="fq-logo-size"
          type="range"
          class="fq-range w-full"
          min={LOGO_MIN * 100}
          max={LOGO_MAX * 100}
          step="1"
          value={Math.round(logo.size * 100)}
          oninput={(e) => {
            if (studio.style.logo) studio.style.logo.size = Number(e.currentTarget.value) / 100;
          }}
        />
      </div>
      <div>
        <label for="fq-logo-pad" class="fq-label"
          >Logo padding <span class="font-normal text-muted">{logo.padding} modules</span></label
        >
        <input
          id="fq-logo-pad"
          type="range"
          class="fq-range w-full"
          min="0"
          max="4"
          step="1"
          value={logo.padding}
          oninput={(e) => {
            if (studio.style.logo) studio.style.logo.padding = Number(e.currentTarget.value);
          }}
        />
      </div>
    </div>
  {/if}
</div>
