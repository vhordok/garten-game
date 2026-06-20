<script lang="ts">
  import { onDestroy, onMount, type Snippet } from 'svelte'
  import { fade, scale } from 'svelte/transition'
  import { playSound } from './fx/audio'

  let { title, onClose, children }: { title: string; onClose: () => void; children: Snippet } = $props()

  // covers every close path (X, backdrop, Escape, child-initiated)
  onMount(() => playSound('open'))
  onDestroy(() => playSound('close'))
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') onClose()
  }}
/>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="backdrop"
  transition:fade={{ duration: 130 }}
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose()
  }}
>
  <div
    class="modal pxpanel"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    transition:scale={{ duration: 160, start: 0.93 }}
  >
    <header>
      <h2>{title}</h2>
      <button class="pxbtn small" onclick={onClose} aria-label="Schließen">✕</button>
    </header>
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(5, 6, 12, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    /* clear notch / home indicator on phones (PHASE 5) */
    padding:
      calc(var(--safe-top, 0px) + 18px)
      calc(var(--safe-right, 0px) + 18px)
      calc(var(--safe-bottom, 0px) + 18px)
      calc(var(--safe-left, 0px) + 18px);
  }

  .modal {
    width: min(560px, 100%);
    max-height: 86vh;
    /* dynamic viewport height so tall panels aren't clipped behind the
       mobile URL bar (PHASE 5) */
    max-height: 86dvh;
    overflow: auto;
    padding: 6px 10px 12px;
  }

  /* PHASE 38: keep the title + ✕ pinned while a long panel scrolls, so the close
     button is always reachable on mobile (Shop/Skills/Erfolge get long). */
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: -6px -10px 8px;
    padding: 6px 10px 8px;
    background: var(--c-panel, #151d28);
    border-bottom: 1px solid var(--c-edge, #202e37);
  }

  header h2 {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  header .pxbtn {
    flex: none;
  }
</style>
