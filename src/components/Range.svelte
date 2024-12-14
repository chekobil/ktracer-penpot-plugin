<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/range/range.js";
  import type SlRange from "@shoelace-style/shoelace/dist/components/range/range.js";
  let { label, help, value = $bindable(), min, max, step } = $props();
  let element: SlRange | null = $state(null);

  function handleChangeRange(ev: any) {
    value = ev.target.value;
  }
</script>

<div class="range-container">
  {#if label}
    <span>{label}</span>
  {/if}
  <div class="range-wrapper">
    <small>{min}</small>
    <sl-range
      bind:this={element}
      {value}
      {min}
      {max}
      {step}
      onsl-change={handleChangeRange}
    ></sl-range>
    <small>{max}</small>
  </div>
  {#if help}
    <small>{help}</small>
  {/if}
</div>

<style>
  .range-container {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    .range-wrapper {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      sl-range {
        flex: 1;
      }
    }
    small {
      font-size: 80%;
      color: #aaa;
    }
  }
</style>
