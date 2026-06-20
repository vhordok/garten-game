<script lang="ts">
  import { PLANTS, SPECIAL_PLANTS, steadyProfitPerSecond } from '../data/plants'
  import { isPlantUnlocked, selectPlant } from '../game/actions'
  import { masteryLevel } from '../game/modifiers'
  import { effectiveCycleSeconds } from '../game/tick'
  import { CONFIG } from '../data/config'
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
    baeume: 'Holz',
    zier: 'Zier',
    cannabis: 'Hanf',
    magie: 'Magie',
    kosmos: 'Kosmisch',
    kreuzungen: 'Kreuzungen',
  }

  // PHASE 44: ornamentals (beautyBonus) moved to the Ziergalerie — they're no
  // longer sown on the field, so their categories drop out of the hotbar tabs.
  const isBeauty = (p: { beautyBonus?: number }) => (p.beautyBonus ?? 0) > 0

  // PHASE 37: seed-lab specials get their OWN tab (their category), appended
  // after the regular ladder — but only once at least one is discovered.
  const specialCats = $derived([
    ...new Set(
      SPECIAL_PLANTS.filter((p) => !isBeauty(p) && isPlantUnlocked(p, $gameStore)).map((p) => p.category)
    ),
  ])
  const baseCategories = [...new Set(PLANTS.filter((p) => !isBeauty(p)).map((p) => p.category))]
  const categories = $derived([
    ...baseCategories,
    ...specialCats.filter((c) => !baseCategories.includes(c)),
  ])

  let activeCat = $state<PlantCategory>(
    PLANTS.find((p) => p.id === $gameStore.selectedPlantId && !isBeauty(p))?.category ?? 'kraeuter'
  )

  // PHASE 22: discovered seed-lab special plants appear in their category slot
  const slots = $derived([
    ...PLANTS.filter((p) => p.category === activeCat && !isBeauty(p)),
    ...SPECIAL_PLANTS.filter((p) => p.category === activeCat && !isBeauty(p) && isPlantUnlocked(p, $gameStore)),
  ])

  function catUnlocked(cat: PlantCategory): boolean {
    const first = PLANTS.find((p) => p.category === cat)
    // special-only category (Kreuzungen): unlocked once any special plant is discovered
    if (!first) return SPECIAL_PLANTS.some((p) => p.category === cat && isPlantUnlocked(p, $gameStore))
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

  // PHASE 46: publish the real hotbar height (tabs + slots) so the page can
  // reserve exactly that much space at the bottom — otherwise tall fields slide
  // behind the fixed hotbar and the last rows can't be scrolled into view.
  let wrapHeight = $state(0)
  $effect(() => {
    document.documentElement.style.setProperty('--hotbar-h', `${wrapHeight}px`)
  })
</script>

<svelte:window onkeydown={handleKey} />

<nav class="hotbar-wrap" aria-label="Saatgut" bind:offsetHeight={wrapHeight}>
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
    {#each slots as plant (plant.id)}
      {@const earnedMet =
        $gameStore.totalEarned >= plant.unlockAtTotalEarned &&
        (!plant.requiresLicense || $gameStore.licenses >= plant.requiresLicense)}
      {@const parcelLocked = earnedMet && !!plant.unlockParcel && $gameStore.parcels < plant.unlockParcel}
      {@const unlocked = earnedMet && !parcelLocked}
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
        {#if plant.regrowTime}<span class="regrow" title="Wächst nach der Ernte von selbst nach">⟳</span>{/if}
        {#if unlocked}
          <!-- PHASE 40: the name is shown right on the slot (no hover on touch) -->
          <span class="pname">{plant.name}</span>
          <img class="px art" src={spriteUrl(`${plant.id}-3`)} width="44" height="44" alt="" />
          <span class="price num" class:broke={!affordable}>
            <PixelIcon name="coin" scale={1} />
            {formatNumber(plant.seedCost)}
          </span>
        {:else}
          <span class="pname locked-name">Gesperrt</span>
          <span class="art lock"><PixelIcon name="lock" scale={2} /></span>
          <span class="price num">{parcelLocked ? `Parz. ${plant.unlockParcel}` : '???'}</span>
        {/if}

        <span class="tip pxpanel">
          {#if unlocked}
            <b class="tip-name">{plant.name}</b>
            <span class="tip-desc">{plant.description}</span>
            <span class="tip-stats num">
              <span><PixelIcon name="coin" scale={1} /> {formatNumber(plant.seedCost)}</span>
              <span>⏱ {formatDuration(effectiveCycleSeconds($gameStore, plant, false))}</span>
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
                  · wächst alle {formatDuration(effectiveCycleSeconds($gameStore, plant, true))} nach
                {/if}
              {/if}
            </span>
            {#if !plant.beautyBonus && !plant.passiveIncome}
              {@const mLevel = masteryLevel($gameStore.mastery[plant.id] ?? 0)}
              <span class="tip-mastery num">
                🏅 Meisterschaft Lv {mLevel}/{CONFIG.masteryMaxLevel}
                {#if mLevel > 0}· +{Math.round(mLevel * CONFIG.masteryYieldPerLevel * 100)} % Ertrag{:else}· ernten zum Steigern{/if}
              </span>
            {/if}
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
    bottom: calc(var(--safe-bottom, 0px) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    max-width: 100vw;
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
    width: 80px;
    height: 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    padding: 5px 3px;
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

  /* PHASE 40: plant name on the slot — readable at a glance, no hover needed */
  .pname {
    width: 100%;
    text-align: center;
    font-size: 0.72rem;
    line-height: 1.1;
    font-weight: 700;
    color: var(--c-white);
    /* PHASE 43: plain block (NOT -webkit-box) so long single words such as
       "Schnittlauch" actually break onto a 2nd line — inside a -webkit-box
       line-clamp, overflow-wrap does NOT break a lone word in Chrome, so the
       word stayed on one line and was clipped mid-word. Cap height at ~2
       lines and hide the rest to keep slot heights stable. */
    max-height: 2.3em;
    overflow: hidden;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .pname.locked-name {
    color: var(--c-mist);
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

  /* :focus (not just :focus-visible) so a TAP on touch shows the info too — a
     real tap-for-info without hover. Pointer-events:none keeps it click-through. */
  .slot:hover .tip,
  .slot:focus .tip {
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

  .tip-mastery {
    font-size: 0.7rem;
    color: var(--c-gold2);
  }

  @media (max-width: 640px) {
    /* PHASE 40: room for the plant-name label on each slot */
    .slot {
      width: 78px;
      height: 96px;
    }

    /* keep the hover tooltip from forcing horizontal page-scroll (PHASE 11) */
    .tip {
      max-width: 86vw;
    }

    /* full-width strip so wide categories scroll horizontally instead of
       spilling past the screen edges where taps can't reach (PHASE 5) */
    .hotbar-wrap {
      left: 0;
      right: 0;
      transform: none;
      width: 100%;
      align-items: stretch;
      padding: 0 6px;
    }

    /* PHASE 40: fade the right edge so it's obvious the category row scrolls
       (the categories were getting cut off with no hint) */
    .tabs {
      max-width: 100%;
      overflow-x: auto;
      flex-wrap: nowrap;
      justify-content: flex-start;
      scrollbar-width: none;
      scroll-snap-type: x proximity;
      -webkit-mask-image: linear-gradient(to right, #000 90%, transparent);
      mask-image: linear-gradient(to right, #000 90%, transparent);
    }

    .tabs .tab {
      flex: 0 0 auto;
      scroll-snap-align: start;
    }

    .hotbar {
      max-width: 100%;
      overflow-x: auto;
      justify-content: flex-start;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .tabs::-webkit-scrollbar,
    .hotbar::-webkit-scrollbar {
      display: none;
    }

    .slot {
      scroll-snap-align: start;
      flex: 0 0 auto;
    }
  }
</style>
