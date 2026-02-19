<script lang="ts">
  // A colour swatch (native picker) with an editable hex code beside it.
  import { normalizeHex } from '../../lib/qr/options';

  interface Props {
    label: string;
    value: string;
    onchange: (color: string) => void;
  }
  let { label, value, onchange }: Props = $props();

  const id = $props.id();
  let draft = $state('');
  let editing = $state(false);
  const shown = $derived(editing ? draft : value);

  function commitHex() {
    editing = false;
    const v = normalizeHex(draft.startsWith('#') ? draft : `#${draft}`, '');
    if (v && v !== value) onchange(v);
  }
</script>

<div class="min-w-0">
  <label for={id} class="fq-label">{label}</label>
  <div class="flex items-center gap-2 rounded-xl border border-line-strong bg-surface p-1.5 pr-3 focus-within:border-brand">
    <input
      id={id}
      type="color"
      class="fq-swatch size-8 shrink-0 cursor-pointer rounded-lg"
      {value}
      oninput={(e) => onchange(normalizeHex(e.currentTarget.value, value))}
    />
    <input
      type="text"
      aria-label="{label.replace(/ colou?r$/i, '')} hex code"
      class="w-full min-w-0 bg-transparent font-mono text-sm text-ink uppercase outline-none"
      value={shown}
      maxlength="7"
      spellcheck="false"
      autocomplete="off"
      onfocus={() => {
        draft = value;
        editing = true;
      }}
      oninput={(e) => {
        draft = e.currentTarget.value;
        const v = normalizeHex(draft.startsWith('#') ? draft : `#${draft}`, '');
        if (v.length === 7 && draft.replace('#', '').length === 6) onchange(v);
      }}
      onblur={commitHex}
      onkeydown={(e) => {
        if (e.key === 'Enter') commitHex();
      }}
    />
  </div>
</div>
