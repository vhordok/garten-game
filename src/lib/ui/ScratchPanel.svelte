<script lang="ts">
  import { drawScratchCard, type ScratchCard } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { celebrateLevelUps } from './fx/celebrate'
  import { burst, coinBurst, legendaryBurst } from './fx/particles'
  import { screenShake } from './fx/shake'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  let card = $state<ScratchCard | null>(drawScratchCard())
  let revealed = $state<boolean[]>(Array(9).fill(false))
  let celebrated = false

  const done = $derived(card !== null && revealed.every(Boolean))

  const PRIZE_LABEL: Record<string, string> = {
    'money-small': 'Gold',
    'money-medium': 'Gold',
    'money-large': 'Gold',
    xp: 'XP',
    fertilizer: 'Turbo-Dünger (nächste Ernten ×2)',
    jackpot: 'JACKPOT-Gold',
  }

  function reveal(index: number, e: MouseEvent) {
    if (!card || revealed[index]) return
    revealed[index] = true
    playSound('click')
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, {
      colors: ['mist', 'silver', 'gold2'],
      count: 6,
      speed: 70,
      lift: 50,
      ttl: 0.45,
      sizeMax: 3,
    })
  }

  function revealAll() {
    revealed = Array(9).fill(true)
    playSound('click')
  }

  function nextCard() {
    card = drawScratchCard()
    revealed = Array(9).fill(false)
    celebrated = false
  }

  // win fanfare once everything is uncovered
  $effect(() => {
    if (!done || !card || celebrated) return
    celebrated = true
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    if (card.prizeType === 'jackpot') {
      legendaryBurst(cx, cy)
      playSound('legendary')
      screenShake(1.4)
    } else {
      coinBurst(cx, cy, 16)
      playSound(card.prizeType === 'money-large' ? 'perfect' : 'sell')
    }
    celebrateLevelUps(card.levelUps, cx, cy)
  })
</script>

<Overlay title="Rubbellos" {onClose}>
  {#if card}
    <p class="hint">Decke alle Felder auf — drei gleiche Symbole zeigen deinen Gewinn. (Schon gutgeschrieben, versprochen.)</p>
    <div class="board">
      {#each card.symbols as symbol, i (i)}
        <button class="cell" class:revealed={revealed[i]} onclick={(e) => reveal(i, e)} aria-label="Feld aufdecken">
          {#if revealed[i]}
            <span class="symbol" class:hit={done && symbol === card.symbol}>
              <PixelIcon name={symbol} scale={2} />
            </span>
          {:else}
            <span class="foil num">?</span>
          {/if}
        </button>
      {/each}
    </div>

    {#if done}
      <div class="result num" class:jackpot={card.prizeType === 'jackpot'}>
        Gewonnen: +{formatNumber(card.amount)} {PRIZE_LABEL[card.prizeType]}!
      </div>
      {#if $gameStore.scratchTickets > 0}
        <button class="pxbtn gold full num" onclick={nextCard}>
          <PixelIcon name="los" scale={1} />
          Nächstes Los rubbeln ({$gameStore.scratchTickets})
        </button>
      {:else}
        <button class="pxbtn primary full" onclick={onClose}>Zurück in den Garten</button>
      {/if}
    {:else}
      <button class="pxbtn small" onclick={revealAll}>Alles aufdecken</button>
    {/if}
  {:else}
    <p class="hint">Kein Los übrig — beim Ernten findest du mit etwas Glück neue. 🍀</p>
  {/if}
</Overlay>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(3, 64px);
    gap: 8px;
    justify-content: center;
    margin: 14px 0;
  }

  .cell {
    width: 64px;
    height: 64px;
    padding: 0;
    border: none;
    background: var(--c-night1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .cell:not(.revealed) {
    background: linear-gradient(135deg, var(--c-gold0), var(--c-gold1) 55%, var(--c-gold0));
    box-shadow: inset 0 0 0 2px var(--c-night0);
  }

  .cell:not(.revealed):hover {
    filter: brightness(1.15);
  }

  .cell.revealed {
    cursor: default;
    box-shadow: inset 0 0 0 2px var(--c-edge);
  }

  .foil {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--c-night0);
  }

  .symbol {
    animation: cell-pop 0.18s ease-out;
  }

  .symbol.hit {
    filter: drop-shadow(0 0 8px rgba(232, 193, 112, 0.9));
  }

  @keyframes cell-pop {
    0% {
      transform: scale(0.4);
    }
    70% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }

  .result {
    text-align: center;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-gold2);
    text-shadow: 0 0 12px rgba(222, 158, 65, 0.55);
    margin: 0 0 12px;
    animation: cell-pop 0.25s ease-out;
  }

  .result.jackpot {
    font-size: 1.25rem;
    color: var(--c-plum3);
    text-shadow: 0 0 14px rgba(223, 132, 165, 0.85);
  }
</style>
