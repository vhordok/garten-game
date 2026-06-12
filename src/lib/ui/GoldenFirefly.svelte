<script lang="ts">
  import { catchFirefly } from '../game/actions'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { perfectBurst } from './fx/particles'
  import { reducedMotion } from './fx/shake'
  import { pushToast } from './toasts'

  // The golden firefly: appears every few minutes, crosses the scene once,
  // rewards whoever clicks it. Pure UI scheduling — the reward is a core action.
  let active = $state(false)
  let top = $state(30)
  let duration = $state(14)

  $effect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function schedule() {
      const delayMs = (150 + Math.random() * 270) * 1000
      timeout = setTimeout(() => {
        if (!document.hidden && !reducedMotion()) {
          top = 18 + Math.random() * 50
          duration = 12 + Math.random() * 6
          active = true
          setTimeout(() => (active = false), duration * 1000)
        }
        schedule()
      }, delayMs)
    }
    schedule()
    return () => clearTimeout(timeout)
  })

  function handleCatch(e: MouseEvent) {
    if (!active) return
    active = false
    const reward = catchFirefly()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    perfectBurst(rect.left + rect.width / 2, rect.top + rect.height / 2)
    playSound('ticket')
    const text =
      reward.kind === 'gold'
        ? `+${formatNumber(reward.amount)} Gold`
        : reward.kind === 'ticket'
          ? '+1 Rubbellos'
          : `+${reward.amount} Turbo-Dünger`
    pushToast(`Goldener Glühwurm gefangen! ${text}`, '✨', 7000)
  }
</script>

{#if active}
  <button
    class="firefly"
    style:top={`${top}%`}
    style:animation-duration={`${duration}s`}
    onclick={handleCatch}
    aria-label="Goldener Glühwurm — fangen!"
    title="Fang mich!"
  >
    <span class="glow"></span>
  </button>
{/if}

<style>
  .firefly {
    position: fixed;
    left: -40px;
    z-index: 15;
    width: 34px;
    height: 34px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    animation-name: fly-across;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }

  .glow {
    display: block;
    width: 8px;
    height: 8px;
    margin: 13px;
    background: var(--c-gold2);
    box-shadow:
      0 0 10px 3px rgba(232, 193, 112, 0.9),
      0 0 22px 8px rgba(222, 158, 65, 0.45);
    animation: firefly-bob 0.9s ease-in-out infinite alternate;
  }

  @keyframes fly-across {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(calc(100vw + 80px));
    }
  }

  @keyframes firefly-bob {
    from {
      transform: translateY(-7px) scale(0.9);
    }
    to {
      transform: translateY(7px) scale(1.15);
    }
  }
</style>
