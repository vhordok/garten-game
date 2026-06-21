<script lang="ts">
  import { CONFIG } from '../data/config'
  import { buyDecoration, buyOrnamental, isPlantUnlocked } from '../game/actions'
  import { ORNAMENTALS, nextOrnamentalCost, ornamentalCount } from '../game/gallery'
  import { DECORATIONS, nextDecorationCost } from '../data/decorations'
  import { decorationCount } from '../game/decorations'
  import { gardenBeauty } from '../game/modifiers'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import { spriteUrl } from './pixel/render'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  // unlocked first, then by beauty strength — the collection reads like a ladder
  const sorted = $derived(
    [...ORNAMENTALS].sort((a, b) => {
      const ua = isPlantUnlocked(a, $gameStore) ? 0 : 1
      const ub = isPlantUnlocked(b, $gameStore) ? 0 : 1
      if (ua !== ub) return ua - ub
      return (a.beautyBonus ?? 0) - (b.beautyBonus ?? 0)
    })
  )

  const beauty = $derived(gardenBeauty($gameStore))
  const ownedKinds = $derived(ORNAMENTALS.filter((p) => ornamentalCount($gameStore, p.id) > 0).length)

  function handleBuy(e: MouseEvent, id: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buyOrnamental(id)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 14)
      playSound('buy')
    } else {
      playSound('error')
    }
  }

  function handleBuyDeco(e: MouseEvent, id: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buyDecoration(id)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 14)
      playSound('buy')
    } else {
      playSound('error')
    }
  }
</script>

<Overlay title="Ziergalerie — Schönheit sammeln" {onClose}>
  <p class="hint">
    Zierpflanzen werden nicht mehr aufs Feld gesät, sondern hier <b>gesammelt</b> — jede gekaufte
    Pflanze gibt dauerhaft Schönheit (gartenweiter Verkaufspreis-Bonus), ohne Beet oder Wachstumszeit,
    und bleibt auch über Prestige erhalten. Schönheit gesamt: <b>+{Math.round(beauty * 100)} %</b> ·
    <b>{ownedKinds}/{ORNAMENTALS.length}</b> Sorten besessen.
  </p>

  <ul class="gal">
    {#each sorted as p (p.id)}
      {@const unlocked = isPlantUnlocked(p, $gameStore)}
      {@const owned = ornamentalCount($gameStore, p.id)}
      {@const atCap = owned >= CONFIG.galleryMaxCopies}
      {@const cost = nextOrnamentalCost(p, owned)}
      {@const affordable = unlocked && Number.isFinite(cost) && $gameStore.money >= cost}
      <li class="row" class:owned={owned > 0} class:locked={!unlocked}>
        {#if unlocked}
          <img class="px icon" src={spriteUrl(`${p.id}-3`)} width="40" height="40" alt="" />
        {:else}
          <span class="icon lock"><PixelIcon name="lock" scale={2} /></span>
        {/if}
        <span class="body">
          <span class="head">
            <b>{unlocked ? p.name : '???'}</b>
            <span class="beauty num">✿ +{Math.round((p.beautyBonus ?? 0) * 100)} %</span>
            {#if owned > 0}<span class="count num">×{owned}</span>{/if}
          </span>
          <span class="sub num">
            {#if unlocked}
              {#if owned > 0}Beitrag: +{Math.round((p.beautyBonus ?? 0) * owned * 100)} % Schönheit{:else}Noch nicht in der Sammlung{/if}
            {:else}
              Ab {formatNumber(p.unlockAtTotalEarned)} Gesamteinnahmen{p.special ? ' · im Saatlabor entdecken' : ''}
            {/if}
          </span>
        </span>
        <button
          class="pxbtn small gold buy num"
          disabled={!affordable || atCap}
          onclick={(e) => handleBuy(e, p.id)}
          title={atCap ? 'Maximale Anzahl erreicht' : unlocked ? 'Eine Zierpflanze in die Sammlung kaufen' : 'Noch gesperrt'}
        >
          {#if atCap}
            MAX
          {:else if unlocked}
            <PixelIcon name="coin" scale={1} />
            {formatNumber(cost)}
          {:else}
            🔒
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  <h3 class="sect">Garten-Deko — im Hintergrund</h3>
  <p class="hint">
    Deko wird <b>in die Gartenszene gesetzt</b> (sie erscheint im Hintergrundbild rund um dein
    Feld) und gibt dauerhaft Schönheit. Jede Kopie kostet mehr, max. {CONFIG.decorationMaxCopies} je Art.
  </p>

  <ul class="gal">
    {#each DECORATIONS as d (d.id)}
      {@const owned = decorationCount($gameStore, d.id)}
      {@const atCap = owned >= CONFIG.decorationMaxCopies}
      {@const cost = nextDecorationCost(d, owned)}
      {@const affordable = Number.isFinite(cost) && $gameStore.money >= cost}
      <li class="row deco" class:owned={owned > 0}>
        <img class="px icon" src={spriteUrl(d.sprite)} width="40" height="40" alt="" />
        <span class="body">
          <span class="head">
            <b>{d.name}</b>
            <span class="beauty num">✿ +{Math.round(d.beautyBonus * 100)} %</span>
            {#if owned > 0}<span class="count num">×{owned}</span>{/if}
          </span>
          <span class="sub num">
            {#if owned > 0}Beitrag: +{Math.round(d.beautyBonus * owned * 100)} % Schönheit{:else}{d.desc}{/if}
          </span>
        </span>
        <button
          class="pxbtn small gold buy num"
          disabled={!affordable || atCap}
          onclick={(e) => handleBuyDeco(e, d.id)}
          title={atCap ? 'Maximale Anzahl erreicht' : 'Eine Deko im Garten aufstellen'}
        >
          {#if atCap}
            MAX
          {:else}
            <PixelIcon name="coin" scale={1} />
            {formatNumber(cost)}
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .hint {
    font-size: 0.78rem;
    color: var(--c-cloud);
    line-height: 1.4;
    margin: 2px 0 10px;
  }

  .gal {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 6px 9px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
  }

  .row.owned {
    border-left: 3px solid var(--c-plum3);
  }

  .row.deco.owned {
    border-left-color: var(--c-gold2);
  }

  .sect {
    margin: 16px 0 6px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-gold2);
  }

  .row.locked {
    opacity: 0.55;
  }

  .icon {
    flex: none;
    image-rendering: pixelated;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--c-white);
    flex-wrap: wrap;
  }

  .beauty {
    flex: none;
    font-size: 0.72rem;
    color: var(--c-plum3);
  }

  .count {
    flex: none;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0 6px;
    border-radius: 4px;
    background: var(--c-plum2);
    color: var(--c-white);
  }

  .sub {
    font-size: 0.7rem;
    color: var(--c-mist);
    line-height: 1.3;
  }

  .buy {
    flex: none;
    min-width: 84px;
    justify-content: center;
  }
</style>
