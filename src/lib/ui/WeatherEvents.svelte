<script lang="ts">
  import { WEATHER_EVENTS, weatherById } from '../data/weather'
  import { startWeather } from '../game/actions'
  import { gameStore } from '../game/state'
  import { playSound } from './fx/audio'
  import { reducedMotion } from './fx/shake'

  // Live-only scheduler: every 4–9 minutes one random weather moment.
  // Effects live in the core (state.weather); this component triggers and
  // shows the banner with a draining bar.
  $effect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function schedule() {
      const delayMs = (240 + Math.random() * 300) * 1000
      timeout = setTimeout(() => {
        if (!document.hidden) {
          const total = WEATHER_EVENTS.reduce((sum, w) => sum + w.weight, 0)
          let roll = Math.random() * total
          for (const w of WEATHER_EVENTS) {
            roll -= w.weight
            if (roll < 0) {
              if (startWeather(w.id)) playSound('unlock')
              break
            }
          }
        }
        schedule()
      }, delayMs)
    }
    schedule()
    return () => clearTimeout(timeout)
  })

  const active = $derived($gameStore.weather.id ? weatherById($gameStore.weather.id) : undefined)
  const fraction = $derived(
    active ? Math.min($gameStore.weather.remaining / active.durationSeconds, 1) : 0
  )
</script>

{#if active && !reducedMotion()}
  <div class="banner pxpanel" role="status">
    <span class="text">{active.text}</span>
    <span class="bar"><span class="fill" style:width={`${fraction * 100}%`}></span></span>
  </div>
{:else if active}
  <div class="banner pxpanel" role="status"><span class="text">{active.text}</span></div>
{/if}

<style>
  .banner {
    position: fixed;
    /* sit in the event zone right below the real topbar height (PHASE 4/5) */
    top: calc(var(--safe-top, 0px) + 10px + var(--hud-h, 76px) + 8px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 18;
    /* purely informational — never swallow a click meant for a button */
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 12px;
    max-width: 92vw;
    text-align: center;
  }

  .text {
    font-size: 0.85rem;
    color: var(--c-gold2);
    text-shadow: 0 0 10px rgba(232, 193, 112, 0.45);
  }

  .bar {
    height: 5px;
    background: var(--c-night0);
    border: 1px solid var(--c-edge);
  }

  .fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--c-blue1), var(--c-blue2));
  }
</style>
