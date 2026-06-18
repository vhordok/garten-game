<script lang="ts">
  import { fly } from 'svelte/transition'
  import { dismissToast, toasts } from './toasts'

  // PHASE 29: never let spam bury rare/important toasts — show at most the three
  // strongest (priority first, then most recent). Lower-priority overflow simply
  // isn't rendered (it still ages out of the store in the background).
  const MAX_VISIBLE = 3
  const visible = $derived(
    [...$toasts]
      .sort((a, b) => b.priority - a.priority || b.id - a.id)
      .slice(0, MAX_VISIBLE)
  )
</script>

<div class="toasts">
  {#each visible as toast (toast.id)}
    <button class="toast pxpanel" transition:fly={{ x: 16, duration: 200 }} onclick={() => dismissToast(toast.id)}>
      <span class="toast-icon">{toast.icon}</span>
      <span class="toast-text">{toast.text}</span>
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    /* PHASE 29: pinned to the BOTTOM-RIGHT corner, clear of the centred hotbar
       and main buttons (which sit bottom-centre). Sits above the hotbar's safe
       area so it never covers it. */
    bottom: calc(var(--safe-bottom, 0px) + 134px);
    right: 12px;
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    /* below the modal backdrop (z-50) so an open panel stays readable; still
       above the HUD/scene so toasts show during normal play */
    z-index: 45;
    align-items: flex-end;
    width: max-content;
    max-width: min(340px, 70vw);
    /* the container itself must never intercept clicks; toasts opt back in */
    pointer-events: none;
  }

  .toast {
    display: flex;
    gap: 8px;
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
    flex: none;
  }

  .toast-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 560px) {
    .toasts {
      /* compact + a touch higher on small screens, still corner-anchored */
      max-width: 62vw;
      right: 8px;
    }
    .toast {
      font-size: 0.76rem;
      padding: 3px 8px;
    }
  }
</style>
