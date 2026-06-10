<script lang="ts">
  import { PLANTS } from '../data/plants'
  import { selectPlant } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatDuration, formatNumber } from '../util/format'
</script>

<div class="card">
  <h2>🌱 Saatgut</h2>
  <p class="hint">Sorte wählen, dann auf ein leeres Beet klicken.</p>
  <div class="seed-list">
    {#each PLANTS as plant (plant.id)}
      {@const unlocked = $gameStore.totalEarned >= plant.unlockAtTotalEarned}
      {@const selected = $gameStore.selectedPlantId === plant.id}
      {@const affordable = $gameStore.money >= plant.seedCost}
      <button
        class="seed"
        class:selected
        class:locked={!unlocked}
        disabled={!unlocked}
        onclick={() => selectPlant(plant.id)}
      >
        <span class="seed-emoji">{unlocked ? plant.emoji : '🔒'}</span>
        <span class="seed-info">
          {#if unlocked}
            <span class="seed-name">{plant.name}</span>
            <span class="seed-desc">{plant.description}</span>
            <span class="seed-stats">
              <span title="Saatkosten" class:too-expensive={!affordable}>🪙 {formatNumber(plant.seedCost)}</span>
              <span title="Wachszeit">⏱️ {formatDuration(plant.growTime)}</span>
              <span title="Verkaufswert der Ernte">💰 {formatNumber(plant.yield * plant.sellValue)}</span>
            </span>
          {:else}
            <span class="seed-name">???</span>
            <span class="seed-desc">Wird ab 🪙 {formatNumber(plant.unlockAtTotalEarned)} Gesamteinnahmen freigeschaltet.</span>
          {/if}
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .seed-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
  }

  .seed {
    display: flex;
    gap: 12px;
    align-items: center;
    text-align: left;
    border: 2px solid #e3decb;
    border-radius: 12px;
    padding: 10px 12px;
    background: #fffef9;
    cursor: pointer;
    transition:
      border-color 0.12s,
      background 0.12s;
  }

  .seed:hover:not(:disabled) {
    border-color: var(--green-300);
  }

  .seed.selected {
    border-color: var(--green-600);
    background: #eef7ec;
  }

  .seed.locked {
    opacity: 0.65;
    cursor: not-allowed;
    background: #f6f3e8;
  }

  .seed-emoji {
    font-size: 1.7rem;
  }

  .seed-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .seed-name {
    font-weight: 800;
    font-size: 0.9rem;
  }

  .seed-desc {
    font-size: 0.74rem;
    color: var(--muted);
    line-height: 1.35;
  }

  .seed-stats {
    display: flex;
    gap: 10px;
    font-size: 0.76rem;
    margin-top: 3px;
    color: #5d6b5d;
    font-weight: 600;
  }

  .too-expensive {
    color: var(--danger);
  }
</style>
