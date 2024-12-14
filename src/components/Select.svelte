<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/button-group/button-group.js";
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";

  let { label, help, value = $bindable(), options } = $props();

  function selectOption(newOption: string) {
    value = newOption;
  }
  function isSelected(theValue: string) {
    return Boolean(value === theValue);
  }
</script>

<div class="select-container">
  {#if label}
    <span>{label}</span>
  {/if}
  {#if help}
    <small>{help}</small>
  {/if}
  <div class="select-wrapper">
    <sl-button-group label="Alignment">
      {#each options as option}
        <sl-tooltip content={option.description}>
          <sl-button
            size="small"
            variant={isSelected(option.value) ? "primary" : "default"}
            onclick={() => selectOption(option.value)}
          >
            {option.name}</sl-button
          >
        </sl-tooltip>
      {/each}
    </sl-button-group>
  </div>
</div>

<style>
  .select-container {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    small {
      font-size: 80%;
      color: #aaa;
    }
  }
</style>
