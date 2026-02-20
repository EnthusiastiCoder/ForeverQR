<script lang="ts">
  // Foreground (solid or gradient), background and eye colours.
  import ColorInput from './ColorInput.svelte';
  import { setForeground, studio } from './studio.svelte';

  const fg = $derived(studio.style.foreground);
  const first = $derived(fg.kind === 'solid' ? fg.color : fg.stops[0].color);
  const last = $derived(fg.kind === 'solid' ? fg.color : fg.stops[fg.stops.length - 1].color);

  const FILLS = [
    ['solid', 'Solid'],
    ['linear', 'Linear gradient'],
    ['radial', 'Radial gradient'],
  ] as const;

  function setKind(kind: 'solid' | 'linear' | 'radial') {
    const f = studio.style.foreground;
    if (kind === f.kind) return;
    if (kind === 'solid') {
      studio.style.foreground = { kind: 'solid', color: first };
    } else if (f.kind === 'solid') {
      studio.style.foreground = {
        kind,
        angle: 45,
        stops: [
          { offset: 0, color: f.color },
          { offset: 1, color: f.color === '#000000' ? '#3730a3' : '#000000' },
        ],
      };
    } else {
      f.kind = kind;
    }
  }

  function setEnd(color: string) {
    const f = studio.style.foreground;
    if (f.kind !== 'solid') f.stops[f.stops.length - 1].color = color;
  }
</script>

<div class="grid gap-4">
  <div class="grid gap-4 sm:grid-cols-2">
    <ColorInput label="Foreground colour" value={first} onchange={setForeground} />
    <ColorInput label="Background colour" value={studio.style.background} onchange={(c) => (studio.style.background = c)} />
  </div>

  <fieldset>
    <legend class="fq-label">Fill</legend>
    <div class="inline-flex rounded-xl border border-line-strong bg-surface-2 p-1">
      {#each FILLS as [k, name] (k)}
        <label
          class="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand
            text-muted"
        >
          <input
            type="radio"
            name="fq-fill"
            class="sr-only"
            value={k}
            checked={fg.kind === k}
            onchange={() => setKind(k)}
          />
          {name}
        </label>
      {/each}
    </div>
  </fieldset>

  {#if fg.kind !== 'solid'}
    <div class="grid gap-4 sm:grid-cols-2">
      <ColorInput label="Gradient end colour" value={last} onchange={setEnd} />
      {#if fg.kind === 'linear'}
        <div>
          <label for="fq-angle" class="fq-label">Gradient angle <span class="font-normal text-muted">{fg.angle}°</span></label>
          <input id="fq-angle" type="range" min="0" max="360" step="15" class="fq-range w-full" bind:value={fg.angle} />
        </div>
      {/if}
    </div>
  {/if}

  <details class="rounded-xl border border-line">
    <summary class="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2">
      Corner colours
    </summary>
    <div class="grid gap-4 p-4 pt-1 sm:grid-cols-2">
      <ColorInput
        label="Eye frame colour"
        value={studio.style.eyeOuter.color}
        onchange={(c) => (studio.style.eyeOuter.color = c)}
      />
      <ColorInput
        label="Eye centre colour"
        value={studio.style.eyeInner.color}
        onchange={(c) => (studio.style.eyeInner.color = c)}
      />
    </div>
  </details>
</div>
