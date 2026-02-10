<script lang="ts">
  // Counts every network request this page has made (Resource Timing plus a live observer)
  // and splits them into same-origin files and third-party requests. data: and blob: URLs
  // never leave the machine, so they are not counted.
  import { onMount } from 'svelte';

  interface Entry {
    url: string;
    origin: string;
    kind: string;
    thirdParty: boolean;
  }

  let entries = $state<Entry[]>([]);
  let ready = $state(false);
  let dialog: HTMLDialogElement | undefined = $state();

  const thirdParty = $derived(entries.filter((e) => e.thirdParty).length);
  const local = $derived(entries.length - thirdParty);

  function add(list: PerformanceEntryList) {
    const seen = new Set(entries.map((e) => e.url));
    const next: Entry[] = [];
    for (const raw of list) {
      const url = raw.name;
      if (/^(data|blob):/.test(url) || seen.has(url)) continue;
      seen.add(url);
      let origin = '';
      try {
        origin = new URL(url, location.href).origin;
      } catch {
        continue;
      }
      next.push({
        url,
        origin,
        kind: (raw as PerformanceResourceTiming).initiatorType || 'other',
        thirdParty: origin !== location.origin,
      });
    }
    if (next.length) entries = [...entries, ...next];
  }

  onMount(() => {
    // The page document itself is a request too.
    add([{ name: location.href, initiatorType: 'document' } as unknown as PerformanceEntry]);
    add(performance.getEntriesByType('resource'));
    ready = true;
    if (typeof PerformanceObserver === 'undefined') return;
    const obs = new PerformanceObserver((l) => add(l.getEntries()));
    obs.observe({ type: 'resource', buffered: true });
    return () => obs.disconnect();
  });

  const short = (url: string) => {
    try {
      const u = new URL(url);
      return u.origin === location.origin ? u.pathname + u.search : url;
    } catch {
      return url;
    }
  };
</script>

<div data-testid="privacy-meter" class="inline-flex">
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
    aria-haspopup="dialog"
    onclick={() => dialog?.showModal()}
  >
    <span
      class="size-2 rounded-full {thirdParty === 0 ? 'bg-ok' : 'bg-bad'}"
      aria-hidden="true"
    ></span>
    {#if ready}
      <span>
        <strong class="font-semibold">{thirdParty} third-party request{thirdParty === 1 ? '' : 's'}</strong>
        · {local} file{local === 1 ? '' : 's'}, all from this site
      </span>
    {:else}
      <span>Counting requests…</span>
    {/if}
  </button>
</div>

<dialog
  bind:this={dialog}
  aria-labelledby="pm-title"
  class="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-card backdrop:bg-black/50"
  onclick={(e) => {
    if (e.target === dialog) dialog?.close();
  }}
>
  <div class="flex items-start justify-between gap-4 border-b border-line p-5">
    <div>
      <h2 id="pm-title" class="text-lg font-bold">Every request this page made</h2>
      <p class="mt-1 text-sm text-muted">
        Read live from your browser's own network log. Your content never leaves this device.
      </p>
    </div>
    <button type="button" class="fq-btn fq-btn-ghost px-3 py-1.5 text-sm" onclick={() => dialog?.close()}>Close</button>
  </div>
  <ul class="max-h-[60vh] divide-y divide-line overflow-auto px-5 text-sm">
    {#each entries as e (e.url)}
      <li class="flex items-center gap-3 py-2">
        <span
          class="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold {e.thirdParty
            ? 'bg-bad-soft text-bad'
            : 'bg-ok-soft text-ok'}">{e.thirdParty ? 'third-party' : 'this site'}</span
        >
        <span class="min-w-0 flex-1 truncate font-mono text-xs" title={e.url}>{short(e.url)}</span>
        <span class="shrink-0 text-xs text-muted">{e.kind}</span>
      </li>
    {/each}
  </ul>
</dialog>
