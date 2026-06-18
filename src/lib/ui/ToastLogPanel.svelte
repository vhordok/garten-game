<script lang="ts">
  import { onMount } from 'svelte'
  import { toastLog, clearToastLog, markToastLogSeen, type ToastLogEntry } from './toasts'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  // opening the log clears the unseen badge
  onMount(() => markToastLogSeen())

  // re-tick relative times while open so "vor 1m" stays fresh
  let now = $state(Date.now())
  onMount(() => {
    const t = setInterval(() => (now = Date.now()), 10000)
    return () => clearInterval(t)
  })

  function ago(at: number): string {
    const s = Math.max(0, Math.round((now - at) / 1000))
    if (s < 10) return 'gerade eben'
    if (s < 60) return `vor ${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `vor ${m}m`
    const h = Math.floor(m / 60)
    return `vor ${h}h ${m % 60}m`
  }

  const PRIO_LABEL = ['niedrig', 'normal', 'wichtig', 'selten']
  const entries = $derived($toastLog as ToastLogEntry[])
</script>

<Overlay title="Verlauf — verpasste Meldungen" {onClose}>
  <p class="hint">
    Die letzten Meldungen, auch wenn sie auf dem Spielfeld nur kurz oder gebündelt erschienen.
    Wird nicht gespeichert.
  </p>

  {#if entries.length === 0}
    <p class="hint empty">Noch nichts passiert — pflanze, ernte und liefere los!</p>
  {:else}
    <ul class="log-list">
      {#each entries as e (e.logKey + e.at)}
        <li class="log" class:rare={e.priority >= 3} class:important={e.priority === 2}>
          <span class="l-icon">{e.icon}</span>
          <span class="l-body">
            <span class="l-text">{e.text}</span>
            <span class="l-meta num">
              {ago(e.at)}{#if e.count > 1} · ×{e.count}{/if} · {PRIO_LABEL[e.priority] ?? 'normal'}
            </span>
          </span>
        </li>
      {/each}
    </ul>
    <button class="pxbtn small clear" onclick={clearToastLog}>Verlauf leeren</button>
  {/if}
</Overlay>

<style>
  .hint {
    font-size: 0.78rem;
    color: var(--c-cloud);
    line-height: 1.4;
    margin: 2px 0 8px;
  }

  .hint.empty {
    color: var(--c-mist);
  }

  .log-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .log {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 6px 9px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    border-left: 3px solid var(--c-steel);
  }

  .log.important {
    border-left-color: var(--c-leaf4);
  }

  .log.rare {
    border-left-color: var(--c-gold2);
  }

  .l-icon {
    font-size: 1.1rem;
    line-height: 1.1;
    flex: none;
  }

  .l-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .l-text {
    font-size: 0.82rem;
    color: var(--c-white);
    line-height: 1.3;
  }

  .l-meta {
    font-size: 0.68rem;
    color: var(--c-mist);
  }

  .clear {
    margin-top: 12px;
    align-self: flex-start;
  }
</style>
