<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { PayloadType } from '../../lib/qr/payloads';
  import { DOT_STYLES, EYE_STYLES, type DotStyle, type EyeStyle } from '../../lib/qr/options';
  import AdvancedControls from './AdvancedControls.svelte';
  import ColorControls from './ColorControls.svelte';
  import DownloadPanel from './DownloadPanel.svelte';
  import { update } from './engine.svelte';
  import FrameControls from './FrameControls.svelte';
  import LogoControl from './LogoControl.svelte';
  import PresetGallery from './PresetGallery.svelte';
  import Preview from './Preview.svelte';
  import ShapePicker from './ShapePicker.svelte';
  import { dotThumb, eyeThumb } from './thumbs';
  import { loadState, resetState, saveState, studio, ui } from './studio.svelte';
  import TypeTabs from './TypeTabs.svelte';
  import EmailForm from './forms/EmailForm.svelte';
  import EventForm from './forms/EventForm.svelte';
  import GeoForm from './forms/GeoForm.svelte';
  import SmsForm from './forms/SmsForm.svelte';
  import TextForm from './forms/TextForm.svelte';
  import UrlForm from './forms/UrlForm.svelte';
  import VcardForm from './forms/VcardForm.svelte';
  import WifiForm from './forms/WifiForm.svelte';

  const panelId = 'studio-panel';
  const idPrefix = 'studio-tab';

  // Landing pages pass the type tab to open on; it wins over the saved state.
  let { presetType }: { presetType?: PayloadType } = $props();

  onMount(() => {
    loadState();
    if (presetType) {
      ui.savedType = studio.type;
      studio.type = presetType;
    }
  });

  $effect(() => {
    const snap = $state.snapshot(studio);
    untrack(() => update(snap));
  });

  $effect(() => {
    if (!ui.loaded) return;
    $state.snapshot(studio);
    const t = setTimeout(() => saveState(), 0);
    const flush = () => saveState();
    addEventListener("pagehide", flush);
    return () => {
      clearTimeout(t);
      removeEventListener("pagehide", flush);
    };
  });

  const dotOptions = DOT_STYLES.map((v) => ({ value: v, label: v, thumb: dotThumb(v) }));
  const outerOptions = EYE_STYLES.map((v) => ({ value: v, label: v, thumb: eyeThumb('outer', v) }));
  const innerOptions = EYE_STYLES.map((v) => ({ value: v, label: v, thumb: eyeThumb('inner', v) }));
</script>

<div class="gap-8 pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-0">
  <div class="flex min-w-0 flex-col gap-6">
    <section class="fq-card flex flex-col gap-4" aria-labelledby="sec-content">
      <h2 id="sec-content" class="text-lg font-bold">1 Content</h2>
      <TypeTabs {panelId} {idPrefix} />
      <div role="tabpanel" id={panelId} aria-label="Content fields">
        {#if studio.type === 'url'}<UrlForm />
        {:else if studio.type === 'wifi'}<WifiForm />
        {:else if studio.type === 'vcard'}<VcardForm />
        {:else if studio.type === 'email'}<EmailForm />
        {:else if studio.type === 'sms'}<SmsForm />
        {:else if studio.type === 'geo'}<GeoForm />
        {:else if studio.type === 'event'}<EventForm />
        {:else}<TextForm />{/if}
      </div>
    </section>

    <section class="fq-card flex flex-col gap-5" aria-labelledby="sec-style">
      <h2 id="sec-style" class="text-lg font-bold">2 Style</h2>
      <PresetGallery />
      <ColorControls />
      <ShapePicker
        label="Dot style"
        value={studio.style.dotStyle}
        options={dotOptions}
        onchange={(v) => (studio.style.dotStyle = v as DotStyle)}
      />
      <ShapePicker
        label="Eye frame style"
        value={studio.style.eyeOuter.style}
        options={outerOptions}
        onchange={(v) => (studio.style.eyeOuter.style = v as EyeStyle)}
      />
      <ShapePicker
        label="Eye centre style"
        value={studio.style.eyeInner.style}
        options={innerOptions}
        onchange={(v) => (studio.style.eyeInner.style = v as EyeStyle)}
      />
      <LogoControl />
      <FrameControls />
      <AdvancedControls />
      <div>
        <button type="button" class="fq-btn fq-btn-ghost" onclick={() => resetState()}>Reset</button>
      </div>
    </section>
  </div>

  <aside class="contents lg:sticky lg:top-20 lg:block lg:self-start">
    <Preview />
    <section class="fq-card mt-6 flex flex-col gap-4" aria-labelledby="sec-download">
      <h2 id="sec-download" class="text-lg font-bold">3 Download</h2>
      <DownloadPanel />
    </section>
  </aside>
</div>
