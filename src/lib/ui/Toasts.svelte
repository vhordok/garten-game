<script lang="ts">
  import { fly } from 'svelte/transition'
  import { dismissToast, toasts } from './toasts'
</script>

<div class="toasts">
  {#each $toasts as toast (toast.id)}
    <button class="toast pxpanel" transition:fly={{ y: -14, duration: 220 }} onclick={() => dismissToast(toast.id)}>
      <span class="toast-icon">{toast.icon}</span>
      <span>{toast.text}</span>
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    top: 72px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 60;
    align-items: center;
    width: max-content;
    max-width: 92vw;
  }

  .toast {
    display: flex;
    gap: 10px;
    align-items: center;
    color: var(--c-white);
    cursor: pointer;
    font-size: 0.82rem;
    text-align: left;
    padding: 4px 10px;
  }

  .toast-icon {
    font-size: 1.05rem;
  }
</style>
