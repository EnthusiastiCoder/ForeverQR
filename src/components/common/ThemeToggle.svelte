<script lang="ts">
  // Light / dark switch. The initial theme is set before paint by Base.astro's inline script
  // (saved choice, else the system preference). A click stores an explicit choice.
  import { onMount } from 'svelte';

  const KEY = 'fqr:theme';
  let theme = $state<'light' | 'dark'>('light');

  onMount(() => {
    theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    // Follow the system while the user has not picked a theme.
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(KEY)) return;
      apply(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  function apply(next: 'light' | 'dark') {
    theme = next;
    document.documentElement.dataset.theme = next;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (meta) meta.content = next === 'dark' ? '#0c100e' : '#f6f7f4';
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage may be blocked; the switch still works for this page.
    }
  }
</script>

<button
  type="button"
  class="inline-flex size-10 items-center justify-center rounded-xl border border-line text-ink transition-colors hover:bg-surface-2"
  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
  onclick={toggle}
>
  {#if theme === 'dark'}
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  {/if}
</button>
