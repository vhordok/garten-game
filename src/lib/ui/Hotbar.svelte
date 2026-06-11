<script lang="ts">
  import { PLANTS } from '../data/plants'
  import { selectPlant } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatDuration, formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import PixelIcon from './PixelIcon.svelte'
  import { spriteUrl } from './pixel/render'

  function select(plantId: string) {
    selectPlant(plantId)
    playSound('click')
  }

  function handleKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const slot = Number.parseInt(e.key, 10)
    if (!Number.isInteger(slot) || slot < 1 || slot > PLANTS.length) return
    select(PLANTS[slot - 1].id)
  }
</script>

<svelte:window onkeydown={handleKey} />

<nav class="hotbar pxpanel" aria-label="Saatgut">
  {#each PLANTS as plant, i (plant.id)}
    {@const unlocked = $gameStore.totalEarned >= plant.unlockAtTotalEarned}
    {@const selected = $gameStore.selectedPlantId === plant.id}
    {@const affordable = $gameStore.money >= plant.seedCost}
    <button
      class="slot"
      class:selected
      class:locked={!unlocked}
      disabled={!unlocked}
      onclick={() => select(plant.id)}
      aria-label={unlocked ? `${plant.name} auswählen` : 'Gesperrte Pflanze'}
    >
      <span class="key num">{i + 1}</span>
      {#if unlocked}
        <img class="px art" src={spriteUrl(`${plant.id}-3`)} width="48" height="48" alt="" />
        <span class="price num" class:broke={!affordable}>
          <PixelIcon name="coin" scale={1} />
          {formatNumber(plant.seedCost)}
        </span>
      {:else}
        <span class="art lock"><PixelIcon name="lock" scale={3} /></span>
        <span class="price num">???</span>
      {/if}

      <span class="tip pxpanel">
        {#if unlocked}
          <b class="tip-name">{plant.name}</b>
          <span class="tip-desc">{plant.description}</span>
          <span class="tip-stats num">
            <span><PixelIcon name="coin" scale={1} /> {formatNumber(plant.seedCost)}</span>
            <span>⏱ {formatDuration(plant.growTime)}</span>
            <span class="gain">→ {formatNumber(plant.yield * plant.sellValue)}</span>
          </span>
        {:else}
          <b class="tip-name">???</b>
          <span class="tip-desc">
            Wird ab {formatNumber(plant.unlockAtTotalEarned)} Gesamteinnahmen freigeschaltet.
          </span>
        {/if}
      </span>
    </button>
  {/each}
</nav>

<style>
  .hotbar {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    gap: 8px;
    padding: 4px 6px;
  }

  .slot {
    position: relative;
    width: 64px;
    height: 76px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    padding: 4px 2px;
    cursor: pointer;
    border-style: solid;
    border-width: calc(var(--ui) * 3px);
    border-image: var(--frame-chip) 3 fill / calc(var(--ui) * 3px) repeat;
    image-rendering: pixelated;
    transition:
      filter 0.08s,
      transform 0.1s ease;
  }

  .slot:hover:not(:disabled) {
    filter: brightness(1.2);
    transform: translateY(-3px);
  }

  .slot.selected {
    border-image-source: var(--frame-btn-gold);
    filter: brightness(1.05);
  }

  .slot.locked {
    cursor: not-allowed;
    filter: grayscale(0.4) brightness(0.8);
  }

  .key {
    position: absolute;
    top: 1px;
    left: 4px;
    font-size: 0.65rem;
    color: var(--c-mist);
  }

  .art {
    image-rendering: pixelated;
  }

  .art.lock {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
  }

  .price {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--c-gold2);
  }

  .price.broke {
    color: var(--c-red1);
  }

  /* custom tooltip above the slot */
  .tip {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    display: none;
    flex-direction: column;
    gap: 4px;
    padding: 4px 8px;
    text-align: left;
    pointer-events: none;
    z-index: 5;
  }

  .slot:hover .tip,
  .slot:focus-visible .tip {
    display: flex;
  }

  .tip-name {
    color: var(--c-leaf5);
    font-size: 0.85rem;
  }

  .tip-desc {
    font-size: 0.72rem;
    color: var(--c-mist);
    line-height: 1.4;
  }

  .tip-stats {
    display: flex;
    gap: 10px;
    font-size: 0.72rem;
    color: var(--c-cloud);
  }

  .tip-stats span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .gain {
    color: var(--c-gold2);
  }

  @media (max-width: 640px) {
    .slot {
      width: 56px;
      height: 70px;
    }
  }
</style>
