<script lang="ts">
  // Six starting looks. Each button is named after its preset; the thumbnail is decorative.
  import { encode } from '../../lib/qr/encode';
  import { PRESETS, type Preset } from '../../lib/qr/presets';
  import { dotsPath } from '../../lib/qr/render/dots';
  import { eyeInnerPath, eyeOuterPath } from '../../lib/qr/render/eyes';
  import type { Fill } from '../../lib/qr/options';
  import { studio, ui } from './studio.svelte';

  const matrix = encode('https://foreverqr.app', 'M');

  const paint = (f: Fill, id: string) =>
    f.kind === 'solid'
      ? { defs: '', fill: f.color }
      : {
          defs: `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${f.stops
            .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`)
            .join('')}</linearGradient></defs>`,
          fill: `url(#${id})`,
        };

  function thumb(p: Preset, i: number): string {
    const s = p.style;
    const ms = 10;
    const m = s.margin;
    const side = (matrix.size + 2 * m) * ms;
    const band = s.frame.style === 'none' ? 0 : 7 * ms;
    const top = s.frame.style === 'banner-top' ? band : 0;
    const o = { x: m * ms, y: m * ms + top };
    const fg = paint(s.foreground, `pg${i}`);
    const frame =
      band === 0
        ? ''
        : `<rect x="${ms}" y="${top ? ms : side}" width="${side - 2 * ms}" height="${band - ms}" rx="${ms}" fill="${s.frame.color}"/>`;
    return `<svg viewBox="0 0 ${side} ${side + band}" aria-hidden="true" focusable="false">${fg.defs}<rect width="${side}" height="${side + band}" rx="${2 * ms}" fill="${s.background}"/>${frame}<path d="${dotsPath(matrix, s, o)}" fill="${fg.fill}"/><path d="${eyeOuterPath(matrix.size, ms, s.eyeOuter.style, o)}" fill="${s.eyeOuter.color}"/><path d="${eyeInnerPath(matrix.size, ms, s.eyeInner.style, o)}" fill="${s.eyeInner.color}"/></svg>`;
  }

  const thumbs = PRESETS.map(thumb);

  function apply(p: Preset) {
    const logo = studio.style.logo;
    const next = structuredClone(p.style);
    // Keep the user's logo and CTA text; a preset changes the look, not the content.
    next.logo = logo ? { ...logo } : null;
    if (p.style.frame.style !== 'none' && studio.style.frame.text) next.frame.text = studio.style.frame.text;
    studio.style = next;
    if (p.ecc) studio.ecc = p.ecc;
    else if (logo && (studio.ecc === 'L' || studio.ecc === 'M')) studio.ecc = 'H';
    ui.eccRaised = false;
  }
</script>

<div class="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
  {#each PRESETS as p, i (p.name)}
    <button
      type="button"
      class="group flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-2 text-xs font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brand hover:shadow-card"
      onclick={() => apply(p)}
    >
      <span class="block aspect-square w-full overflow-hidden rounded-lg bg-white p-1 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true"
        >{@html thumbs[i]}</span
      >
      <span>{p.name}</span>
    </button>
  {/each}
</div>
