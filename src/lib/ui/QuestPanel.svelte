<script lang="ts">
  import { CONFIG } from '../data/config'
  import { PLANTS, plantById, produceName } from '../data/plants'
  import { questSlots } from '../data/progression'
  import { parcelBonus } from '../data/milestones'
  import { questTier } from '../data/questFlavor'
  import { fulfillQuest, questFulfillable, skipQuest } from '../game/actions'
  import { compostUpgradeBonus } from '../game/modifiers'
  import { questStreakBonus } from '../game/quests'
  import { gameStore } from '../game/state'
  import type { PlantCategory, QuestItem, QuestKind, QuestState } from '../game/types'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { celebrateLevelUps } from './fx/celebrate'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'
  import { spriteUrl } from './pixel/render'
  import { pushToast } from './toasts'

  let { onClose }: { onClose: () => void } = $props()

  const slots = $derived(questSlots($gameStore.level))
  const streakBonus = $derived(questStreakBonus($gameStore))
  // permanent quest-reward bonus (parcel milestone + compost garden)
  const rewardBonus = $derived(
    1 + parcelBonus($gameStore.parcels, 'questReward') + compostUpgradeBonus($gameStore, 'questReward')
  )

  const CATEGORY_LABEL: Record<PlantCategory, string> = {
    kraeuter: 'Kräuter',
    gemuese: 'Gemüse',
    beeren: 'Beeren',
    obst: 'Obst',
    baeume: 'Holz',
    zier: 'Zier',
    cannabis: 'Hanf',
    magie: 'Magie',
    kosmos: 'Kosmisch',
  }
  const KIND_LABEL: Partial<Record<QuestKind, string>> = {
    combi: 'Kombi',
    category: 'Kategorie',
    big: 'Großauftrag',
  }

  function lineHave(item: QuestItem): number {
    if (item.plantId) return $gameStore.inventory[item.plantId] ?? 0
    let sum = 0
    for (const p of PLANTS) if (p.category === item.category) sum += $gameStore.inventory[p.id] ?? 0
    return sum
  }
  function lineLabel(item: QuestItem): string {
    if (item.plantId) return produceName(plantById(item.plantId)!)
    return `${CATEGORY_LABEL[item.category as PlantCategory]} (Kategorie)`
  }
  function questIcon(quest: QuestState): string {
    const withPlant = quest.items.find((it) => it.plantId)
    if (withPlant?.plantId) return `${withPlant.plantId}-3`
    const cat = quest.items[0]?.category
    const rep = PLANTS.find((p) => p.category === cat)
    return rep ? `${rep.id}-3` : 'scroll'
  }

  function handleDeliver(e: MouseEvent, questId: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const result = fulfillQuest(questId)
    if (result) {
      coinBurst(cx, cy, 18)
      playSound('sell')
      celebrateLevelUps(result.levelUps, cx, cy)
      if (result.tickets > 0) {
        pushToast(
          result.tickets === 1
            ? 'Auftrag erfüllt! Ein Rubbellos liegt als Dankeschön bei.'
            : `Großauftrag erfüllt! ${result.tickets} Rubbellose als Dankeschön!`,
          '🎟️',
          7000
        )
        playSound('ticket')
      }
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
  <div class="streak chip num" title="Jede Lieferung ohne Neu-Würfeln erhöht den Bonus (max. +{Math.round(CONFIG.questStreakMaxBonus * 100)} %)">
    Lieferserie: <b>{formatNumber($gameStore.questStreak)}</b>
    {#if streakBonus > 0}· +{Math.round(streakBonus * 100)} % auf alle Lieferungen{/if}
  </div>
  <ul class="quest-list">
    {#each $gameStore.quests as quest (quest.id)}
      {@const fulfillable = questFulfillable($gameStore, quest.id)}
      {@const tier = questTier(quest.tier)}
      <li class="row">
        <img class="px" src={spriteUrl(questIcon(quest))} width="48" height="48" alt="" />
        <span class="info">
          <span class="client">
            <span class="tier {quest.tier}">{tier.label}</span>
            {#if KIND_LABEL[quest.kind]}<span class="kind {quest.kind}">{KIND_LABEL[quest.kind]}</span>{/if}
            {quest.client}
          </span>
          <span class="name">Liefern:</span>
          <span class="lines num" class:done={fulfillable}>
            {#each quest.items as item (item.plantId ?? item.category)}
              <span class="line" class:ok={lineHave(item) >= item.amount}>
                {formatNumber(Math.min(lineHave(item), item.amount))}/{formatNumber(item.amount)} {lineLabel(item)}
              </span>
            {/each}
          </span>
          <span class="reward num">
            <PixelIcon name="coin" scale={1} /> +{formatNumber(Math.round(quest.reward * (1 + streakBonus) * rewardBonus))}
            <span class="xp">+{formatNumber(quest.xp)} XP</span>
            {#if quest.rewardTickets > 0}<span class="ticket">+{quest.rewardTickets} Los</span>{/if}
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

  .streak {
    margin: 10px 0 0;
    padding: 2px 8px;
    font-size: 0.74rem;
    color: var(--c-mist);
  }

  .streak b {
    color: var(--c-ember);
  }

  .client {
    font-size: 0.72rem;
    color: var(--c-mist);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tier {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0 5px;
    color: var(--c-night0);
    background: var(--c-gold0);
  }

  .tier.silber {
    background: var(--c-silver);
  }

  .tier.gold {
    background: var(--c-gold2);
    box-shadow: 0 0 8px rgba(232, 193, 112, 0.6);
  }

  .ticket {
    color: var(--c-gold2);
    margin-left: 6px;
  }

  .kind {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 5px;
    color: var(--c-night0);
    background: var(--c-leaf4);
  }

  .kind.category {
    background: var(--c-blue2);
  }

  .kind.big {
    background: var(--c-plum3);
  }

  .lines {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 0.74rem;
    color: var(--c-mist);
  }

  .lines .line.ok {
    color: var(--c-leaf4);
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
