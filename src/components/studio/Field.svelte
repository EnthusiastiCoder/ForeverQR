<script lang="ts">
  // One labelled form control: text-like input, textarea, select or checkbox.
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    label: string;
    value?: string | boolean;
    kind?: 'input' | 'textarea' | 'select' | 'checkbox';
    type?: HTMLInputAttributes['type'];
    placeholder?: string;
    hint?: string;
    error?: string;
    options?: Option[];
    rows?: number;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    inputmode?: HTMLInputAttributes['inputmode'];
    maxlength?: number;
    autofocus?: boolean;
    class?: string;
  }

  let {
    label,
    value = $bindable(),
    kind = 'input',
    type = 'text',
    placeholder,
    hint,
    error,
    options = [],
    rows = 3,
    autocomplete,
    inputmode,
    maxlength,
    autofocus = false,
    class: klass = '',
  }: Props = $props();

  const id = $props.id();
  const describedBy = $derived([hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined);
  let el: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (autofocus && el && !matchMedia('(pointer: coarse)').matches) el.focus({ preventScroll: true });
  });
</script>

{#if kind === 'checkbox'}
  <div class="flex items-center gap-2.5 {klass}">
    <input
      id={id}
      type="checkbox"
      class="size-4.5 rounded border-line-strong accent-brand"
      bind:checked={value as boolean}
      aria-describedby={describedBy}
    />
    <label for={id} class="text-sm font-medium text-ink select-none">{label}</label>
  </div>
{:else}
  <div class={klass}>
    <label for={id} class="fq-label">{label}</label>
    {#if kind === 'textarea'}
      <textarea
        id={id}
        class="fq-input resize-y"
        {rows}
        {placeholder}
        {maxlength}
        bind:value={value as string}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
      ></textarea>
    {:else if kind === 'select'}
      <select id={id} class="fq-input fq-select" bind:value={value as string} aria-describedby={describedBy}>
        {#each options as o (o.value)}
          <option value={o.value}>{o.label}</option>
        {/each}
      </select>
    {:else}
      <input
        bind:this={el}
        id={id}
        {type}
        class="fq-input"
        {placeholder}
        {autocomplete}
        {inputmode}
        {maxlength}
        spellcheck="false"
        bind:value={value as string}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
      />
    {/if}
    {#if hint && !error}
      <p id="{id}-hint" class="mt-1.5 text-xs text-muted">{hint}</p>
    {/if}
    {#if error}
      <p id="{id}-err" class="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-bad">
        <svg viewBox="0 0 20 20" width="16" height="16" class="mt-0.5 shrink-0" fill="currentColor" aria-hidden="true"
          ><path
            d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4h1.8v5.2H9.1V6Zm0 6.8h1.8v1.8H9.1v-1.8Z"
          /></svg
        >
        {error}
      </p>
    {/if}
  </div>
{/if}
