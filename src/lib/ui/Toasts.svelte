<script lang="ts">
  import { fly } from 'svelte/transition'
  import { dismissToast, toasts } from './toasts'
</script>

<div class="toasts">
  {#each $toasts as toast (toast.id)}
    <button class="toast" transition:fly={{ y: 16, duration: 250 }} onclick={() => dismissToast(toast.id)}>
      <span class="toast-icon">{toast.icon}</span>
      <span>{toast.text}</span>
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    bottom: 18px;
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
    background: var(--green-800);
    color: #f2f8ee;
    border: none;
    border-radius: 12px;
    padding: 10px 16px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    cursor: pointer;
    font-size: 0.85rem;
    text-align: left;
  }

  .toast-icon {
    font-size: 1.1rem;
  }
</style>
