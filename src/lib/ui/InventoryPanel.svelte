<script lang="ts">
  import { PLANTS, produceName } from '../data/plants'
  import { quickSellAmount, sellableValue, sellAll, sellPlant } from '../game/actions'
  import { saleValue } from '../game/modifiers'
  import { questReserved } from '../game/quests'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'
  import { spriteUrl } from './pixel/render'

  let { onClose }: { onClose: () => void } = $props()

  // PHASE 2: quick sells move a fraction of the unreserved stock; an exact
  // amount in the input overrides the fraction (and the quest reservation).
  const FRACTIONS = [
    { value: 0.25, label: '25 %' },
    { value: 0.5, label: '50 %' },
    { value: 0.75, label: '75 %' },
    { value: 1, label: 'Alles' },
  ]
  let fraction = $state(1)
  let exactRaw = $state('')
  const exact = $derived.by(() => {
    const n = Math.floor(Number(exactRaw))
    return Number.isFinite(n) && n > 0 ? n : 0
  })

  const rows = $derived(
    PLANTS.map((plant) => ({
      plant,
      count: $gameStore.inventory[plant.id] ?? 0,
      reserved: questReserved($gameStore, plant.id),
    }))
      .filter((row) => row.count > 0)
      .map((row) => ({
        ...row,
        reservedShown: Math.min(row.reserved, row.count),
        free: Math.max(0, row.count - row.reserved),
        toSell:
          exact > 0 ? Math.min(exact, row.count) : quickSellAmount($gameStore, row.plant.id, fraction),
      }))
  )
  const anyReserved = $derived(rows.some((row) => row.reserved > 0))
  const bulkValue = $derived(sellableValue($gameStore, fraction))
  const fractionLabel = $derived(FRACTIONS.find((f) => f.value === fraction)?.label ?? 'Alles')

  function sellFx(e: MouseEvent, gain: number) {
    if (gain <= 0) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12)
    playSound('sell')
  }
</script>

<Overlay title="Lager" {onClose}>
  {#if rows.length === 0}
    <p class="hint">Noch nichts geerntet — reife Pflanzen anklicken, dann landen sie hier.</p>
  {:else}
    <div class="sell-controls">
      <span class="ctl-label">Menge</span>
      {#each FRACTIONS as f (f.value)}
        <button
          class="pxbtn small num"
          class:primary={exact === 0 && fraction === f.value}
          aria-pressed={exact === 0 && fraction === f.value}
          onclick={() => {
            fraction = f.value
            exactRaw = ''
            playSound('click')
          }}
        >
          {f.label}
        </button>
      {/each}
      <input
        class="exact num"
        type="number"
        min="1"
        inputmode="numeric"
        placeholder="genau…"
        bind:value={exactRaw}
        aria-label="Genaue Stückzahl verkaufen"
      />
    </div>
    {#if anyReserved}
      <p class="hint reserve-note">
        🔒 = für offene Aufträge reserviert. Schnellverkauf, „Lager verkaufen" und der Marktkarren
        verkaufen nur den <b>freien</b> Überschuss — eine genaue Stückzahl verkauft auch Reserviertes.
      </p>
    {/if}
    <ul class="inv-list">
      {#each rows as { plant, count, reservedShown, free, toSell } (plant.id)}
        <li>
          <span class="inv-item">
            <img class="px" src={spriteUrl(`${plant.id}-3`)} width="32" height="32" alt="" />
            <span class="inv-name">
              <span class="inv-title">{produceName(plant)} <b class="num">×{formatNumber(count)}</b></span>
              {#if reservedShown > 0}
                <span class="inv-breakdown num">
                  🔒 {formatNumber(reservedShown)} reserviert · {formatNumber(free)} frei
                </span>
              {/if}
            </span>
          </span>
          <button
            class="pxbtn small num"
            disabled={toSell === 0}
            onclick={(e) => sellFx(e, sellPlant(plant.id, toSell))}
            title={toSell === 0
              ? 'Alles für Aufträge reserviert — genaue Stückzahl verkauft auch Reserviertes'
              : `${formatNumber(toSell)} Stück verkaufen`}
          >
            ×{formatNumber(toSell)} +{formatNumber(saleValue($gameStore, plant.sellValue, toSell))}
          </button>
        </li>
      {/each}
    </ul>
    <button
      class="pxbtn gold full num"
      disabled={bulkValue === 0}
      onclick={(e) => sellFx(e, sellAll(fraction))}
    >
      <PixelIcon name="coin" scale={2} />
      Lager verkaufen ({fractionLabel}){anyReserved ? ' · nur Überschuss' : ''} +{formatNumber(bulkValue)}
    </button>
  {/if}
</Overlay>

<style>
  .sell-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin: 4px 0 10px;
  }

  .ctl-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-mist);
  }

  .exact {
    width: 92px;
    padding: 6px 8px;
    background: rgba(16, 20, 31, 0.65);
    border: 2px solid var(--c-mist);
    color: inherit;
    font-size: 0.85rem;
  }

  .exact:focus {
    outline: none;
    border-color: var(--c-gold2);
  }

  .reserve-note {
    margin: 0 0 10px;
  }

  .inv-list {
    list-style: none;
    margin: 4px 0 12px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .inv-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    min-width: 0;
  }

  .inv-name {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .inv-breakdown {
    font-size: 0.7rem;
    color: var(--c-gold2);
  }

  .inv-item b {
    color: var(--c-leaf5);
  }
</style>
