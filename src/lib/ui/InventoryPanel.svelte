<script lang="ts">
  import { PLANTS } from '../data/plants'
  import { inventoryValue, sellAll, sellPlant } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'
  import { spriteUrl } from './pixel/render'

  let { onClose }: { onClose: () => void } = $props()

  const rows = $derived(
    PLANTS.map((plant) => ({ plant, count: $gameStore.inventory[plant.id] ?? 0 })).filter(
      (row) => row.count > 0
    )
  )
  const totalValue = $derived(inventoryValue($gameStore))
</script>

<Overlay title="Lager" {onClose}>
  {#if rows.length === 0}
    <p class="hint">Noch nichts geerntet — reife Pflanzen anklicken, dann landen sie hier.</p>
  {:else}
    <ul class="inv-list">
      {#each rows as { plant, count } (plant.id)}
        <li>
          <span class="inv-item">
            <img class="px" src={spriteUrl(`${plant.id}-3`)} width="32" height="32" alt="" />
            {plant.name}
            <b class="num">×{formatNumber(count)}</b>
          </span>
          <button class="pxbtn small num" onclick={() => sellPlant(plant.id)}>
            Verkaufen +{formatNumber(count * plant.sellValue)}
          </button>
        </li>
      {/each}
    </ul>
    <button class="pxbtn gold full num" onclick={() => sellAll()}>
      <PixelIcon name="coin" scale={2} />
      Alles verkaufen +{formatNumber(totalValue)}
    </button>
  {/if}
</Overlay>

<style>
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
  }

  .inv-item b {
    color: var(--c-leaf5);
  }
</style>
