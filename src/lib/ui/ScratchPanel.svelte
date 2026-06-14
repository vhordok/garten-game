<script lang="ts">
  import { onDestroy } from 'svelte'
  import { CONFIG } from '../data/config'
  import {
    drawScratchCard,
    refundScratchTicket,
    settleScratchCard,
    type ScratchCard,
    type ScratchOutcome,
  } from '../game/actions'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { celebrateLevelUps } from './fx/celebrate'
  import { burst, coinBurst, legendaryBurst, perfectBurst } from './fx/particles'
  import { screenShake } from './fx/shake'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const PICKS = 3

  let card = $state<ScratchCard | null>(drawScratchCard())
  let picked = $state<number[]>([])
  let outcome = $state<ScratchOutcome | null>(null)

  const done = $derived(outcome !== null)

  const PRIZE_LABEL: Record<string, string> = {
    'money-small': 'Gold',
    'money-medium': 'Gold',
    'money-large': 'Gold',
    xp: 'XP',
    fertilizer: 'Turbo-Dünger (nächste Ernten ×2)',
    compost: 'Kompost',
    mastery: 'Meisterschafts-XP',
    jackpot: 'JACKPOT-Gold',
  }

  const GRADE_LABEL: Record<ScratchOutcome['grade'], string> = {
    voll: `HAUPTGEWINN ×${CONFIG.scratchFullMult}!`,
    teil: '2 Treffer — Teilgewinn',
    trost: 'Trostpreis',
  }

  // closing with an unscratched card gives the ticket back
  onDestroy(() => {
    if (card && !outcome && picked.length === 0) refundScratchTicket()
  })

  function pick(index: number, e: MouseEvent) {
    if (!card || outcome || picked.length >= PICKS || picked.includes(index)) return
    picked.push(index)
    playSound('scratch')
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    burst(cx, cy, { colors: ['mist', 'silver', 'gold2'], count: 6, speed: 70, lift: 50, ttl: 0.45, sizeMax: 3 })

    if (picked.length === PICKS) {
      outcome = settleScratchCard(card, picked.map((idx) => card!.symbols[idx]))
      if (outcome.grade === 'voll') {
        if (card.prizeType === 'jackpot') {
          legendaryBurst(cx, cy)
          playSound('legendary')
          screenShake(1.4)
        } else {
          perfectBurst(cx, cy)
          playSound('perfect')
        }
      } else if (outcome.grade === 'teil') {
        coinBurst(cx, cy, 14)
        playSound('sell')
      } else {
        playSound('click')
      }
      celebrateLevelUps(outcome.levelUps, cx, cy)
    }
  }

  function nextCard() {
    card = drawScratchCard()
    picked = []
    outcome = null
    playSound('click')
  }
</script>

<Overlay title="Rubbellos" {onClose}>
  {#if card}
    <p class="hint">
      Rubbel genau <b>{PICKS} Felder</b> frei. Irgendein Paar = Teilgewinn des Symbols, der versteckte
      Drilling = <b>Hauptgewinn ×{CONFIG.scratchFullMult}</b> (trifft ~1 von 84 Losen) — und ein
      Trostpreis ist dir sicher.
    </p>
    <div class="board">
      {#each card.symbols as symbol, i (i)}
        {@const isPicked = picked.includes(i)}
        <button
          class="cell"
          class:revealed={isPicked || done}
          class:dimmed={done && !isPicked}
          class:hit={done && isPicked && outcome !== null && symbol === outcome.symbol}
          onclick={(e) => pick(i, e)}
          aria-label="Feld aufdecken"
        >
          {#if isPicked || done}
            <span class="symbol"><PixelIcon name={symbol} scale={2} /></span>
          {:else}
            <span class="foil num">?</span>
          {/if}
        </button>
      {/each}
    </div>

    {#if !done}
      <p class="picks-left num">Noch {PICKS - picked.length} Feld{PICKS - picked.length === 1 ? '' : 'er'} frei rubbeln …</p>
    {:else if outcome}
      <div class="result num" class:jackpot={card.prizeType === 'jackpot' && outcome.grade === 'voll'}>
        {GRADE_LABEL[outcome.grade]} +{formatNumber(outcome.amount)} {PRIZE_LABEL[outcome.prizeType]}
      </div>
      {#if $gameStore.scratchTickets > 0}
        <button class="pxbtn gold full num" onclick={nextCard}>
          <PixelIcon name="los" scale={1} />
          Nächstes Los rubbeln ({$gameStore.scratchTickets})
        </button>
      {:else}
        <button class="pxbtn primary full" onclick={onClose}>Zurück in den Garten</button>
      {/if}
    {/if}
  {:else}
    <p class="hint">Kein Los übrig — beim Ernten und bei Gold-Aufträgen findest du neue. 🍀</p>
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
    transform: translateY(-2px);
  }

  .cell.revealed {
    cursor: default;
    box-shadow: inset 0 0 0 2px var(--c-edge);
  }

  .cell.dimmed {
    opacity: 0.35;
  }

  .cell.hit {
    box-shadow:
      inset 0 0 0 2px var(--c-gold2),
      0 0 10px rgba(232, 193, 112, 0.55);
  }

  .foil {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--c-night0);
  }

  .symbol {
    animation: cell-pop 0.18s ease-out;
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

  .picks-left {
    text-align: center;
    font-size: 0.8rem;
    color: var(--c-mist);
    margin: 0 0 10px;
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
