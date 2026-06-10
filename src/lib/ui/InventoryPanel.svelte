<script lang="ts">
  import { PLANTS } from '../data/plants'
  import { inventoryValue, sellAll, sellPlant } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'

  const rows = $derived(
    PLANTS.map((plant) => ({ plant, count: $gameStore.inventory[plant.id] ?? 0 })).filter(
      (row) => row.count > 0
    )
  )
  const totalValue = $derived(inventoryValue($gameStore))
</script>

<div class="card">
  <h2>🧺 Lager</h2>
  {#if rows.length === 0}
    <p class="hint">Noch nichts geerntet — reife Pflanzen anklicken, dann landen sie hier.</p>
  {:else}
    <ul class="inv-list">
      {#each rows as { plant, count } (plant.id)}
        <li>
          <span class="inv-item">{plant.emoji} {plant.name} <b>×{formatNumber(count)}</b></span>
          <button class="btn small" onclick={() => sellPlant(plant.id)}>
            Verkaufen · 🪙 {formatNumber(count * plant.sellValue)}
          </button>
        </li>
      {/each}
    </ul>
    <button class="btn primary full" onclick={() => sellAll()}>
      💰 Alles verkaufen — 🪙 {formatNumber(totalValue)}
    </button>
  {/if}
</div>

<style>
  .inv-list {
    list-style: none;
    margin: 12px 0;
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
    font-size: 0.88rem;
  }
</style>
