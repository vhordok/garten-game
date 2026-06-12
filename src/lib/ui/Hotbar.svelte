<script lang="ts">
  import { PLANTS, steadyProfitPerSecond } from '../data/plants'
  import { selectPlant } from '../game/actions'
  import { gameStore } from '../game/state'
  import type { PlantCategory } from '../game/types'
  import { formatDuration, formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import PixelIcon from './PixelIcon.svelte'
  import { spriteUrl } from './pixel/render'

  const CATEGORY_LABEL: Partial<Record<PlantCategory, string>> = {
    kraeuter: 'Kräuter',
    gemuese: 'Gemüse',
    beeren: 'Beeren',
    obst: 'Obst',
    baeume: 'Bäume',
    zier: 'Zier',
    cannabis: 'Hanf',
    magie: 'Magie',
  }

  const categories = [...new Set(PLANTS.map((p) => p.category))]

  let activeCat = $state<PlantCategory>(
    PLANTS.find((p) => p.id === $gameStore.selectedPlantId)?.category ?? 'kraeuter'
  )

  const slots = $derived(PLANTS.filter((p) => p.category === activeCat))

  function catUnlocked(cat: PlantCategory): boolean {
    const first = PLANTS.find((p) => p.category === cat)
    if (!first) return false
    if (first.requiresLicense && $gameStore.licenses < first.requiresLicense) return false
    return $gameStore.totalEarned >= first.unlockAtTotalEarned
  }

  function catUnlockAt(cat: PlantCategory): number {
    return PLANTS.find((p) => p.category === cat)?.unlockAtTotalEarned ?? 0
  }

  function switchCat(cat: PlantCategory) {
    if (!catUnlocked(cat)) {
      playSound('error')
      return
    }
    activeCat = cat
    playSound('click')
  }

  function select(plantId: string) {
    selectPlant(plantId)
    playSound('click')
  }

  function handleKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'Tab') {
      e.preventDefault()
      const unlockedCats = categories.filter(catUnlocked)
      const i = unlockedCats.indexOf(activeCat)
      activeCat = unlockedCats[(i + 1) % unlockedCats.length] ?? activeCat
      playSound('click')
      return
    }
    const slot = Number.parseInt(e.key, 10)
    if (!Number.isInteger(slot) || slot < 1 || slot > slots.length) return
    select(slots[slot - 1].id)
  }
</script>

<svelte:window onkeydown={handleKey} />

<nav class="hotbar-wrap" aria-label="Saatgut">
  <div class="tabs">
    {#each categories as cat (cat)}
      {@const unlocked = catUnlocked(cat)}
      <button
        class="tab pxbtn small"
        class:active={cat === activeCat}
        onclick={() => switchCat(cat)}
        title={unlocked
          ? `${CATEGORY_LABEL[cat]} (Tab wechselt)`
          : `${CATEGORY_LABEL[cat]} — ab ${formatNumber(catUnlockAt(cat))} Gesamteinnahmen`}
      >
        {#if !unlocked}<PixelIcon name="lock" scale={1} />{/if}
        {CATEGORY_LABEL[cat]}
      </button>
    {/each}
  </div>

  <div class="hotbar pxpanel">
    {#each slots as plant, i (plant.id)}
      {@const unlocked =
        $gameStore.totalEarned >= plant.unlockAtTotalEarned &&
        (!plant.requiresLicense || $gameStore.licenses >= plant.requiresLicense)}
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
        {#if plant.regrowTime}<span class="regrow" title="Wächst nach der Ernte von selbst nach">⟳</span>{/if}
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
            <span class="tip-profit num">
              {#if plant.beautyBonus}
                +{Math.round(plant.beautyBonus * 100)} % Verkaufspreis, solange sie steht
              {:else if plant.passiveIncome}
                ≈ {formatNumber(plant.passiveIncome)} Gold/s passiv, sobald ausgewachsen
              {:else}
                ≈ {formatNumber(steadyProfitPerSecond(plant))} Gold/s
                {#if plant.regrowTime}
                  · wächst alle {formatDuration(plant.regrowTime)} nach
                {/if}
              {/if}
            </span>
          {:else}
            <b class="tip-name">???</b>
            <span class="tip-desc">
              Wird ab {formatNumber(plant.unlockAtTotalEarned)} Gesamteinnahmen freigeschaltet{plant.requiresLicense
                ? ` — und braucht Lizenz ${plant.requiresLicense} (Shop)`
                : ''}.
            </span>
          {/if}
        </span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .hotbar-wrap {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .tabs {
    display: flex;
    gap: 6px;
  }

  .tab.active {
    border-image-source: var(--frame-btn-primary);
  }

  .hotbar {
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
    font-size: 0.72rem;
    color: var(--c-cloud);
  }

  .regrow {
    position: absolute;
    top: 0;
    right: 4px;
    font-size: 0.7rem;
    color: var(--c-leaf4);
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
    font-size: 0.78rem;
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
    width: 230px;
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

  .tip-profit {
    font-size: 0.72rem;
    color: var(--c-leaf4);
  }

  @media (max-width: 640px) {
    .slot {
      width: 56px;
      height: 70px;
    }
  }
</style>
