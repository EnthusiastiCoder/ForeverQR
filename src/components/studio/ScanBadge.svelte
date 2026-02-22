<script lang="ts">
  // The scan-test verdict. data-status / data-revision are the test contract; the header is a
  // button that expands the issue list (collapsed by default), each issue with its fix.
  import { out } from './engine.svelte';
  import { fixFor } from './fixes';

  interface Props {
    compact?: boolean;
  }
  let { compact = false }: Props = $props();

  let open = $state(false);
  const id = $props.id();

  const TEXT = {
    checking: { title: 'Checking it scans…', sub: 'Decoding it like a phone would' },
    pass: { title: 'Scan test passed', sub: 'Reads back exactly, large and small' },
    warning: { title: 'Scans, with warnings', sub: 'Some phones may struggle' },
    fail: { title: 'Won’t scan reliably', sub: 'Fix the issues below' },
  } as const;

  const idle = $derived(!out.ready);
  const t = $derived(idle ? { title: 'Scan test', sub: 'Waiting for content' } : TEXT[out.status]);
  const shown = $derived(out.issues.filter((i) => i.severity !== 'info' || i.id === 'transparent-bg'));
  const tone = $derived(
    idle || out.status === 'checking'
      ? 'border-line bg-surface-2 text-ink'
      : out.status === 'pass'
        ? 'border-ok/40 bg-ok-soft text-ink'
        : out.status === 'warning'
          ? 'border-warn/40 bg-warn-soft text-ink'
          : 'border-bad/40 bg-bad-soft text-ink',
  );
</script>

<div data-testid="scan-badge" data-status={out.status} data-revision={out.revision} class="rounded-xl border {tone} transition-colors">
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-xl px-3 text-left {compact ? 'py-1.5' : 'py-2.5'}"
    aria-expanded={open}
    aria-controls="{id}-list"
    onclick={() => (open = !open)}
  >
    <span class="grid size-7 shrink-0 place-items-center rounded-full {idle || out.status === 'checking'
        ? 'bg-surface text-muted'
        : out.status === 'pass'
          ? 'bg-ok text-surface'
          : out.status === 'warning'
            ? 'bg-warn text-surface'
            : 'bg-bad text-surface'}" aria-hidden="true">
      {#if idle}
        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><circle cx="10" cy="10" r="3" /></svg>
      {:else if out.status === 'checking'}
        <svg viewBox="0 0 24 24" width="16" height="16" class="animate-spin" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9" /></svg>
      {:else if out.status === 'pass'}
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
      {:else}
        <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor"><path d="M9 4h2v7H9zM9 13.5h2v2H9z" /></svg>
      {/if}
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-bold" aria-live="polite">{t.title}</span>
      {#if !compact}<span class="block truncate text-xs text-muted">{t.sub}</span>{/if}
    </span>
    {#if shown.length > 0 && !idle}
      <span class="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink">{shown.length}</span>
    {/if}
    <svg viewBox="0 0 20 20" width="16" height="16" class="shrink-0 text-muted transition-transform {open ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg>
  </button>
  {#if open}
    <ul id="{id}-list" class="grid gap-2 border-t border-current/10 px-3 py-3 text-sm">
      {#if idle}
        <li class="text-muted">Enter some content to run the scan test.</li>
      {:else if out.status === 'checking'}
        <li class="text-muted">Rendering and decoding your code…</li>
      {:else if shown.length === 0}
        <li data-issue-id="decode-pass" class="text-ink">It decodes back to exactly what you entered, at full size and when small.</li>
      {:else}
        {#each shown as issue (issue.id)}
          {@const fix = fixFor(issue.id, out.modules)}
          <li data-issue-id={issue.id} class="flex flex-col gap-2 rounded-lg bg-surface p-2.5 sm:flex-row sm:items-center">
            <span class="flex-1">
              <span class="mr-1.5 rounded px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide uppercase {issue.severity === 'error'
                  ? 'bg-bad-soft text-bad'
                  : issue.severity === 'warning'
                    ? 'bg-warn-soft text-warn'
                    : 'bg-surface-2 text-muted'}">{issue.severity === 'error' ? 'Problem' : issue.severity === 'warning' ? 'Warning' : 'Note'}</span
              >
              {issue.message}
            </span>
            {#if fix}
              <button type="button" class="fq-btn fq-btn-ghost shrink-0 px-3 py-1.5 text-sm" onclick={fix.apply}>{fix.label}</button>
            {/if}
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>
