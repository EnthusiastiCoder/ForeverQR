<script lang="ts">
  // "Will this QR die?": decode an uploaded, dropped, pasted or camera image entirely in the browser
  // and classify each code. Decoded text is only ever rendered as text, never as HTML.
  import { onDestroy } from 'svelte';
  import { decodeImage } from '../../lib/qr/scan/decode';
  import { classify, type Verdict } from '../../lib/checker/classify';
  import { detectType } from '../../lib/checker/parse';

  interface Found {
    text: string;
    type: string;
    verdict: Verdict;
    final: string;
  }

  let found = $state<Found[]>([]);
  let searched = $state(false);
  let busy = $state(false);
  let error = $state('');
  let dragging = $state(false);
  let cameraOn = $state(false);
  let videoEl = $state<HTMLVideoElement | null>(null);
  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let dialogEl = $state<HTMLDialogElement | null>(null);
  let pending = $state<{ url: string; host: string } | null>(null);
  let cancelBtn = $state<HTMLButtonElement | null>(null);

  const LOOK = {
    static: { icon: '✓', label: 'Cannot expire', tone: 'border-ok/40 bg-ok-soft' },
    direct: { icon: '→', label: 'Direct link', tone: 'border-ok/40 bg-ok-soft' },
    dynamic: { icon: '!', label: 'Can expire', tone: 'border-bad/40 bg-bad-soft' },
    shortener: { icon: '!', label: 'Depends on a service', tone: 'border-warn/40 bg-warn-soft' },
    dead: { icon: '✕', label: 'Likely broken', tone: 'border-bad/40 bg-bad-soft' },
    'unknown-short': { icon: '?', label: 'Unknown', tone: 'border-warn/40 bg-warn-soft' },
  } as const;

  function show(codes: { text: string }[]) {
    searched = true;
    found = codes.map((c) => ({ text: c.text, type: detectType(c.text), verdict: classify(c.text), final: '' }));
  }

  async function scanBlob(blob: Blob) {
    stopCamera();
    busy = true;
    error = '';
    try {
      show(await decodeImage(blob));
    } catch (e) {
      error = `Could not read that image: ${(e as Error).message}`;
      searched = false;
    } finally {
      busy = false;
    }
  }

  function onFile(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    if (f) void scanBlob(f);
    input.value = '';
  }

  function onDrop(ev: DragEvent) {
    ev.preventDefault();
    dragging = false;
    const f = [...(ev.dataTransfer?.files ?? [])].find((x) => x.type.startsWith('image/'));
    if (f) void scanBlob(f);
  }

  function onPaste(ev: ClipboardEvent) {
    const f = [...(ev.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
    if (!f) return;
    ev.preventDefault();
    void scanBlob(f);
  }

  function stopCamera() {
    if (timer) clearInterval(timer);
    timer = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    cameraOn = false;
  }

  async function startCamera() {
    error = '';
    searched = false;
    found = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (e) {
      const name = (e as DOMException)?.name;
      error =
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead.'
          : 'No usable camera was found. Upload a photo instead.';
      return;
    }
    cameraOn = true;
    await Promise.resolve();
    const v = videoEl;
    if (!v) return stopCamera();
    v.srcObject = stream;
    try {
      await v.play();
    } catch {
      /* autoplay quirks: frames are still read below */
    }
    const canvas = document.createElement('canvas');
    let inflight = false;
    timer = setInterval(async () => {
      if (inflight || !v.videoWidth) return;
      inflight = true;
      try {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(v, 0, 0);
        const codes = await decodeImage(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (codes.length && cameraOn) {
          show(codes);
          stopCamera();
        }
      } catch {
        /* keep trying */
      } finally {
        inflight = false;
      }
    }, 200);
  }

  function parseHttp(s: string): URL | null {
    try {
      const u = new URL(s.trim());
      return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
    } catch {
      return null;
    }
  }

  function askOpen(text: string) {
    const u = parseHttp(text);
    if (!u) return;
    pending = { url: text.trim(), host: u.host };
    dialogEl?.showModal();
    cancelBtn?.focus();
  }

  function confirmOpen() {
    if (pending) {
      // Sever the opener right away; the site-wide Referrer-Policy is no-referrer.
      const w = window.open('', '_blank');
      if (w) {
        w.opener = null;
        w.location.href = pending.url;
      }
    }
    dialogEl?.close();
  }

  const forever = (url: string) => `/?type=url&value=${encodeURIComponent(url)}`;

  $effect(() => {
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });
  onDestroy(() => {
    if (typeof window !== 'undefined') stopCamera();
  });
</script>

<svelte:window onpagehide={stopCamera} />

<div class="space-y-6">
  <div
    role="group"
    aria-label="Add a QR code image"
    class="rounded-2xl border-2 border-dashed p-6 text-center {dragging ? 'border-accent bg-surface-2' : 'border-line'}"
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
  >
    <p class="text-lg font-semibold">Drop a QR code image here</p>
    <p class="mt-1 text-sm">Or paste with Ctrl+V. Nothing is uploaded: it is decoded in your browser.</p>
    <div class="mt-4 flex flex-wrap justify-center gap-3">
      <label class="fq-btn fq-btn-primary cursor-pointer">
        Choose image
        <input type="file" accept="image/*" class="sr-only" onchange={onFile} />
      </label>
      {#if cameraOn}
        <button type="button" class="fq-btn fq-btn-ghost" onclick={stopCamera}>Stop</button>
      {:else}
        <button type="button" class="fq-btn fq-btn-ghost" onclick={startCamera}>Camera</button>
      {/if}
    </div>
    {#if cameraOn}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={videoEl} muted playsinline class="mx-auto mt-4 max-h-72 rounded-xl"></video>
      <p class="mt-2 text-sm">Hold the code steady in view.</p>
    {/if}
  </div>

  {#if busy}<p role="status">Reading the image…</p>{/if}
  {#if error}<p role="alert" class="rounded-xl border border-bad/40 bg-bad-soft p-3">{error}</p>{/if}

  {#if searched && found.length === 0}
    <div class="rounded-xl border border-line bg-surface-2 p-4">
      <p class="font-semibold">No QR code found</p>
      <ul class="mt-2 list-disc pl-5 text-sm">
        <li>Use more light and avoid glare.</li>
        <li>Crop the image so the code fills most of it.</li>
        <li>Hold the camera steady, or use a sharper photo.</li>
      </ul>
    </div>
  {/if}

  {#each found as f, i (i)}
    {@const look = LOOK[f.verdict.level]}
    {@const finalUrl = parseHttp(f.final)}
    {@const finalVerdict = finalUrl ? classify(f.final.trim(), { final: true }) : null}
    <section data-testid="verdict" data-level={f.verdict.level} class="rounded-2xl border p-4 {look.tone}">
      <h2 class="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden="true" class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current">{look.icon}</span>
        <span>{f.verdict.title}</span>
        <span class="text-sm font-medium">({look.label})</span>
      </h2>
      <p class="mt-2">{f.verdict.explanation}</p>
      {#if f.verdict.vendor && f.verdict.source}
        <p class="mt-2 text-sm">
          Vendor: {f.verdict.vendor}.
          <a class="underline" href={f.verdict.source} target="_blank" rel="noopener noreferrer">Source</a>
        </p>
      {/if}
      <p class="mt-3 text-sm">Type: <span data-testid="type">{f.type}</span></p>
      <pre data-testid="raw-text" class="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-surface-2 p-2 text-sm">{f.text}</pre>

      {#if f.type === 'url' && parseHttp(f.text)}
        <div class="mt-4 flex flex-wrap items-end gap-3">
          <button type="button" class="fq-btn fq-btn-ghost" onclick={() => askOpen(f.text)}>Find out where it goes</button>
        </div>
        <div class="mt-3">
          <label class="block text-sm font-medium" for="final-{i}">Final address</label>
          <input
            id="final-{i}"
            type="url"
            class="mt-1 w-full rounded-lg border border-line bg-surface p-2"
            placeholder="Paste the address you ended up at"
            bind:value={f.final}
          />
        </div>
        {#if finalVerdict}
          <div data-testid="verdict" data-level={finalVerdict.level} class="mt-3 rounded-xl border p-3 {LOOK[finalVerdict.level].tone}">
            <p class="font-semibold">Final address: {finalVerdict.title}</p>
            <p class="mt-1 break-all text-sm">{f.final.trim()}</p>
            <p class="mt-1 text-sm">{finalVerdict.explanation}</p>
          </div>
        {/if}
        <div class="mt-4">
          {#if finalUrl}
            <a class="fq-btn fq-btn-primary" href={forever(f.final.trim())}>Make a forever version</a>
          {:else if f.verdict.level === 'dynamic' || f.verdict.level === 'shortener' || f.verdict.level === 'unknown-short' || f.verdict.level === 'dead'}
            <p class="text-sm">To make a forever version, use “Find out where it goes” first, or paste the real destination above.</p>
          {:else}
            <a class="fq-btn fq-btn-primary" href={forever(f.text.trim())}>Make a forever version</a>
          {/if}
        </div>
      {/if}
    </section>
  {/each}
</div>

<dialog
  bind:this={dialogEl}
  aria-labelledby="optin-title"
  class="m-auto max-w-md rounded-2xl border border-line bg-surface p-5 text-ink backdrop:bg-black/50"
  onclose={() => (pending = null)}
>
  <h2 id="optin-title" class="text-lg font-bold">Open this link?</h2>
  {#if pending}
    <p class="mt-2">
      This opens the link in a new tab. Your browser will contact <strong class="break-all">{pending.host}</strong>: that server sees
      your IP address, browser and the time, and the visit may count as a scan in the code owner's statistics. Forever QR itself sends
      nothing; this page makes no network request. When the page loads, copy the address from the address bar and paste it below to
      check the final destination.
    </p>
  {/if}
  <div class="mt-4 flex justify-end gap-3">
    <button bind:this={cancelBtn} type="button" class="fq-btn fq-btn-ghost" onclick={() => dialogEl?.close()}>Cancel</button>
    <button type="button" class="fq-btn fq-btn-primary" onclick={confirmOpen}>Open link</button>
  </div>
</dialog>
