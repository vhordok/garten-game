<script lang="ts">
  import { ACHIEVEMENTS } from '../data/achievements'
  import { gameStore } from '../game/state'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const unlocked = $derived(new Set($gameStore.achievements))
</script>

<Overlay title="Erfolge" {onClose}>
  <p class="hint">
    {$gameStore.achievements.length}/{ACHIEVEMENTS.length} freigeschaltet — jeder Erfolg gibt dauerhaft
    <b>+1 % Ertrag</b> (aktuell +{$gameStore.achievements.length} %).
  </p>
  <ul class="list">
    {#each ACHIEVEMENTS as a (a.id)}
      {@const done = unlocked.has(a.id)}
      <li class="row" class:done>
        <span class="icon"><PixelIcon name={done ? 'pokal' : 'lock'} scale={2} /></span>
        <span class="info">
          <span class="name">{done ? a.name : '???'}</span>
          <span class="desc">{a.description}</span>
        </span>
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .list {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px;
    background: var(--c-night1);
    box-shadow: inset 0 0 0 2px var(--c-edge);
    opacity: 0.55;
  }

  .row.done {
    opacity: 1;
    box-shadow: inset 0 0 0 2px var(--c-gold0);
  }

  .icon {
    flex: none;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .name {
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--c-gold2);
  }

  .row:not(.done) .name {
    color: var(--c-mist);
  }

  .desc {
    font-size: 0.68rem;
    color: var(--c-mist);
    line-height: 1.3;
  }

  @media (max-width: 560px) {
    .list {
      grid-template-columns: 1fr;
    }
  }
</style>
