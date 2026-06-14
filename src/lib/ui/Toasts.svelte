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
    /* PHASE 16: anchored just ABOVE the bottom hotbar (and clear of the top
       topbar + garden toolbar), so transient toasts never cover any main button.
       The app reserves ~130px at the bottom for the hotbar; sit above that. */
    bottom: calc(var(--safe-bottom, 0px) + 134px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    /* below the modal backdrop (z-50) so an open panel stays readable; still
       above the HUD/scene so toasts show during normal play (PHASE 12) */
    z-index: 45;
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
