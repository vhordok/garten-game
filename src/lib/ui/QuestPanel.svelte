<script lang="ts">
  import { plantById } from '../data/plants'
  import { questSlots } from '../data/progression'
  import { fulfillQuest, questFulfillable, skipQuest } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { celebrateLevelUps } from './fx/celebrate'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'
  import { spriteUrl } from './pixel/render'

  let { onClose }: { onClose: () => void } = $props()

  const slots = $derived(questSlots($gameStore.level))

  function handleDeliver(e: MouseEvent, questId: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const result = fulfillQuest(questId)
    if (result) {
      coinBurst(cx, cy, 18)
      playSound('sell')
      celebrateLevelUps(result.levelUps, cx, cy)
    } else {
      playSound('error')
    }
  }

  function handleSkip(questId: number) {
    if (skipQuest(questId)) playSound('click')
    else playSound('error')
  }
</script>

<Overlay title="Aufträge" {onClose}>
  <p class="hint">Liefere aus dem Lager und kassiere mehr als den Marktpreis — plus Bonus-XP.</p>
  <ul class="quest-list">
    {#each $gameStore.quests as quest (quest.id)}
      {@const plant = plantById(quest.plantId)}
      {@const have = $gameStore.inventory[quest.plantId] ?? 0}
      {@const fulfillable = questFulfillable($gameStore, quest.id)}
      {#if plant}
        <li class="row">
          <img class="px" src={spriteUrl(`${plant.id}-3`)} width="48" height="48" alt="" />
          <span class="info">
            <span class="name">Liefere {quest.amount}× {plant.name}</span>
            <span class="progress num" class:done={fulfillable}>
              {formatNumber(Math.min(have, quest.amount))}/{formatNumber(quest.amount)} im Lager
            </span>
            <span class="reward num">
              <PixelIcon name="coin" scale={1} /> +{formatNumber(quest.reward)}
              <span class="xp">+{formatNumber(quest.xp)} XP</span>
            </span>
          </span>
          <span class="buttons">
            <button class="pxbtn primary small" disabled={!fulfillable} onclick={(e) => handleDeliver(e, quest.id)}>
              Liefern
            </button>
            <button
              class="pxbtn small"
              disabled={quest.skipCooldown > 0}
              onclick={() => handleSkip(quest.id)}
              title="Auftrag neu auswürfeln"
            >
              {quest.skipCooldown > 0 ? `Neu (${Math.ceil(quest.skipCooldown)}s)` : 'Neu'}
            </button>
          </span>
        </li>
      {/if}
    {/each}
    {#if slots < 3}
      <li class="row locked">
        <span class="lock-icon"><PixelIcon name="lock" scale={3} /></span>
        <span class="info">
          <span class="name">Weiterer Auftragsslot</span>
          <span class="progress">ab Gärtner-Level {slots === 1 ? 3 : 5}</span>
        </span>
      </li>
    {/if}
  </ul>
</Overlay>

<style>
  .quest-list {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .row > img {
    flex: none;
    background: var(--c-night1);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .name {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--c-leaf5);
  }

  .progress {
    font-size: 0.74rem;
    color: var(--c-mist);
  }

  .progress.done {
    color: var(--c-leaf4);
  }

  .reward {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    color: var(--c-gold2);
  }

  .xp {
    color: var(--c-plum3);
    margin-left: 6px;
  }

  .buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: none;
  }

  .locked {
    opacity: 0.55;
  }

  .lock-icon {
    flex: none;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-night1);
  }
</style>
