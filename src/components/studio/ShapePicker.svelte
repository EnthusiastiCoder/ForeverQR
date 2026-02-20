<script lang="ts">
  // A real <select> (the accessible control) with a row of visual tiles beside it. The tiles
  // are a mouse shortcut only: hidden from assistive tech and out of the tab order.
  interface Option {
    value: string;
    label: string;
    thumb: string;
  }
  interface Props {
    label: string;
    value: string;
    options: Option[];
    onchange: (value: string) => void;
  }
  let { label, value, options, onchange }: Props = $props();
  const id = $props.id();
</script>

<div>
  <label for={id} class="fq-label">{label}</label>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap gap-1.5" aria-hidden="true">
      {#each options as o (o.value)}
        <button
          type="button"
          tabindex="-1"
          title={o.label}
          class="size-11 rounded-lg border p-1.5 transition-colors [&>svg]:h-full [&>svg]:w-full
            {o.value === value ? 'border-brand bg-brand-soft text-ink ring-1 ring-brand' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink'}"
          onclick={() => onchange(o.value)}>{@html o.thumb}</button
        >
      {/each}
    </div>
    <select id={id} class="fq-input fq-select py-2 text-sm" {value} onchange={(e) => onchange(e.currentTarget.value)}>
      {#each options as o (o.value)}
        <option value={o.value}>{o.label}</option>
      {/each}
    </select>
  </div>
</div>
