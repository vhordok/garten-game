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
    /* below the real topbar height so toasts never cover HUD buttons (PHASE 4/5) */
    top: calc(var(--safe-top, 0px) + 10px + var(--hud-h, 76px) + 8px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 60;
    align-items: center;
    width: max-content;
    max-width: 92vw;
    /* the container itself must never intercept clicks; toasts opt back in */
    pointer-events: none;
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
    pointer-events: auto;
  }

  .toast-icon {
    font-size: 1.05rem;
  }
</style>
