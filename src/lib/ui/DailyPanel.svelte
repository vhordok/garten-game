<script lang="ts">
  import { claimDaily, dailyClaimable, type DailyReward } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const DAY_LABEL = ['Gold', 'Dünger ×3', 'Gold ×2', 'Los', 'Dünger ×6', 'Gold ×4', 'Jackpot-Tag']

  let claimed = $state<DailyReward | null>(null)

  const claimable = $derived(dailyClaimable($gameStore))
  const cyclePos = $derived(
    claimed ? claimed.day : (($gameStore.daily.streak % 7) + 1)
  )

  function rewardText(r: DailyReward): string {
    const parts: string[] = []
    if (r.gold > 0) parts.push(`+${formatNumber(r.gold)} Gold`)
    if (r.tickets > 0) parts.push(`+${r.tickets} Los${r.tickets > 1 ? 'e' : ''}`)
    if (r.fertilizer > 0) parts.push(`+${r.fertilizer} Turbo-Dünger`)
    return parts.join(' · ')
  }

  function handleClaim(e: MouseEvent) {
    const reward = claimDaily()
    if (!reward) {
      playSound('error')
      return
    }
    claimed = reward
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 18)
    playSound(reward.day === 7 ? 'levelup' : 'sell')
  }
</script>

<Overlay title="Tagesbonus" {onClose}>
  <p class="hint">
    Einmal pro Tag wartet ein Geschenk — jeden Tag in Folge ein besseres. Einen Tag verpasst = Serie
    beginnt von vorn.
  </p>

  <div class="days">
    {#each DAY_LABEL as label, i (i)}
      {@const pos = i + 1}
      <div class="day" class:done={pos < cyclePos} class:today={pos === cyclePos} class:big={pos === 7}>
        <span class="num pos">Tag {pos}</span>
        <span class="label">{label}</span>
      </div>
    {/each}
  </div>

  {#if claimed}
    <div class="result num">{rewardText(claimed)}</div>
    <p class="hint center">Serie: {claimed.streak} {claimed.streak === 1 ? 'Tag' : 'Tage'} — bis morgen! 🌙</p>
    <button class="pxbtn primary full" onclick={onClose}>Zurück in den Garten</button>
  {:else if claimable}
    <button class="pxbtn gold full" onclick={handleClaim}>
      <PixelIcon name="geschenk" scale={1} />
      Geschenk öffnen
    </button>
  {:else}
    <p class="hint center">Heute schon abgeholt — Serie: {formatNumber($gameStore.daily.streak)}. Morgen geht's weiter!</p>
  {/if}
</Overlay>

<style>
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin: 12px 0 14px;
  }

  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 2px;
    background: var(--c-night1);
    box-shadow: inset 0 0 0 2px var(--c-edge);
    text-align: center;
  }

  .day.done {
    opacity: 0.45;
  }

  .day.today {
    box-shadow:
      inset 0 0 0 2px var(--c-gold1),
      0 0 10px rgba(222, 158, 65, 0.4);
  }

  .day.big .label {
    color: var(--c-plum3);
  }

  .pos {
    font-size: 0.66rem;
    color: var(--c-mist);
  }

  .label {
    font-size: 0.6rem;
    color: var(--c-cloud);
    line-height: 1.3;
  }

  .result {
    text-align: center;
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-gold2);
    text-shadow: 0 0 12px rgba(222, 158, 65, 0.5);
    margin: 0 0 8px;
  }

  .center {
    text-align: center;
  }
</style>
