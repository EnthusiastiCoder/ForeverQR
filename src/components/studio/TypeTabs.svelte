<script lang="ts">
  // Content type tabs: a WAI-ARIA tablist with a roving tabindex (one tab stop, arrow keys move).
  import type { PayloadType } from '../../lib/qr/payloads';
  import { studio } from './studio.svelte';

  interface Props {
    panelId: string;
    idPrefix: string;
  }
  let { panelId, idPrefix }: Props = $props();

  const TABS: { type: PayloadType; label: string; icon: string }[] = [
    { type: 'url', label: 'URL', icon: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' },
    { type: 'wifi', label: 'WiFi', icon: 'M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01' },
    { type: 'vcard', label: 'vCard', icon: 'M3 5h18v14H3zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 16c.5-2 2-3 3-3s2.5 1 3 3M14 9h4M14 13h4' },
    { type: 'email', label: 'Email', icon: 'M3 5h18v14H3zM3 6l9 7 9-7' },
    { type: 'sms', label: 'SMS', icon: 'M4 4h16v12H8l-4 4z' },
    { type: 'geo', label: 'Location', icon: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' },
    { type: 'event', label: 'Event', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
    { type: 'text', label: 'Text', icon: 'M5 6h14M12 6v13M9 19h6' },
  ];

  const tabEls: HTMLButtonElement[] = [];

  function select(i: number, focus = false) {
    studio.type = TABS[i].type;
    if (focus) {
      tabEls[i]?.focus();
      tabEls[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function onKey(e: KeyboardEvent, i: number) {
    const n = TABS.length;
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next, true);
  }
</script>

<div
  role="tablist"
  aria-label="Content type"
  class="no-scrollbar -mx-1 flex snap-x gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1"
>
  {#each TABS as t, i (t.type)}
    {@const active = studio.type === t.type}
    <button
      bind:this={tabEls[i]}
      type="button"
      role="tab"
      id="{idPrefix}-{t.type}"
      aria-selected={active}
      aria-controls={panelId}
      tabindex={active ? 0 : -1}
      class="flex shrink-0 snap-start items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors
        {active
        ? 'border-brand bg-brand-soft text-ink'
        : 'border-transparent text-muted hover:bg-surface-2 hover:text-ink'}"
      onclick={() => select(i)}
      onkeydown={(e) => onKey(e, i)}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class={active ? 'text-brand' : ''}><path d={t.icon} /></svg
      >
      {t.label}
    </button>
  {/each}
</div>
