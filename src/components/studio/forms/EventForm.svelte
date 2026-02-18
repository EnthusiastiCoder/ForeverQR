<script lang="ts">
  import Field from '../Field.svelte';
  import FormError from './FormError.svelte';
  import { studio } from '../studio.svelte';

  const f = $derived(studio.fields.event);

  function zones(current: string | undefined): { value: string; label: string }[] {
    let list: string[] = [];
    try {
      list = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
    } catch {
      list = [];
    }
    const set = new Set(list);
    for (const z of ['UTC', current]) if (z) set.add(z);
    return [...set].sort().map((z) => ({ value: z, label: z.replace(/_/g, ' ') }));
  }
  const options = zones(studio.fields.event.timeZone);

  // Switching all-day keeps the dates and drops or adds a time.
  function setAllDay(all: boolean) {
    const conv = (v: string | undefined) => (!v ? '' : all ? v.slice(0, 10) : v.length === 10 ? `${v}T09:00` : v);
    f.start = conv(f.start);
    f.end = conv(f.end);
  }
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <Field label="Title" class="sm:col-span-2" placeholder="Launch party" bind:value={f.summary} />
  <Field label="All day" kind="checkbox" class="sm:col-span-2" bind:value={() => f.allDay, (v) => {
      f.allDay = v as boolean;
      setAllDay(v as boolean);
    }} />
  {#key f.allDay}
    <Field label="Start" type={f.allDay ? 'date' : 'datetime-local'} bind:value={f.start} />
    <Field label="End" type={f.allDay ? 'date' : 'datetime-local'} bind:value={f.end} />
  {/key}
  {#if !f.allDay}
    <Field label="Time zone" kind="select" class="sm:col-span-2" {options} bind:value={f.timeZone} />
  {/if}
  <Field label="Location" class="sm:col-span-2" bind:value={f.location} />
  <Field label="Description" kind="textarea" rows={2} class="sm:col-span-2" bind:value={f.description} />
</div>
<FormError />
