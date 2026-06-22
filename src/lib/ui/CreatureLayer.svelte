<script lang="ts">
  // PHASE 72: befriended Garten-Bewohner ROAM the garden — ground animals walk a
  // low band, flyers drift higher — each wandering to fresh targets with pauses,
  // facing its direction. When a creature has a gift ready a 🎁 bubbles over it;
  // click it to collect (reward + friendship). Click with no gift = a little pet
  // (a heart). Only the creatures capture clicks; the layer lets the field through.
  import { CREATURES, creatureById } from '../data/creatures'
  import { collectCreatureGift } from '../game/actions'
  import { creatureLevel, giftReward, isGiftReady } from '../game/creatures'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { pushToast } from './toasts'

  const FLYERS = new Set(['biene', 'schmetterling', 'gartenvogel', 'eule'])

  type Mover = { id: string; emoji: string; flying: boolean; x: number; y: number; tx: number; ty: number; pause: number; face: number }

  let movers = $state<Mover[]>([])
  let now = $state(Date.now())
  let hearts = $state<{ key: number; x: number; y: number }[]>([])
  let heartSeq = 0

  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  function band(flying: boolean): [number, number] {
    return flying ? [30, 56] : [70, 88]
  }
  function spawn(c: (typeof CREATURES)[number]): Mover {
    const flying = FLYERS.has(c.id)
    const [lo, hi] = band(flying)
    const x = 8 + Math.random() * 84
    const y = lo + Math.random() * (hi - lo)
    return { id: c.id, emoji: c.emoji, flying, x, y, tx: x, ty: y, pause: Math.random() * 2, face: 1 }
  }

  // keep one mover per befriended creature (preserve positions across updates)
  $effect(() => {
    const present = CREATURES.filter((c) => creatureLevel($gameStore, c.id) > 0)
    const byId = new Map(movers.map((m) => [m.id, m]))
    movers = present.map((c) => byId.get(c.id) ?? spawn(c))
  })

  // 1 Hz clock for gift readiness
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(t)
  })

  // wander loop
  $effect(() => {
    if (reduce || movers.length === 0) return
    let raf = 0
    let last = performance.now()
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      for (const m of movers) {
        if (m.pause > 0) {
          m.pause -= dt
          continue
        }
        const dx = m.tx - m.x
        const dy = m.ty - m.y
        const dist = Math.hypot(dx, dy)
        if (dist < 1.2) {
          const [lo, hi] = band(m.flying)
          m.tx = 6 + Math.random() * 88
          m.ty = lo + Math.random() * (hi - lo)
          m.pause = 0.6 + Math.random() * 2.8
        } else {
          const sp = (m.flying ? 9 : 5) * dt
          m.x += (dx / dist) * sp
          m.y += (dy / dist) * sp
          m.face = dx < 0 ? -1 : 1
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  })

  function click(m: Mover, ready: boolean) {
    if (ready) {
      const r = collectCreatureGift(m.id)
      if (r) {
        playSound('ticket')
        const label = r.kind === 'tickets' ? `${formatNumber(r.amount)}× Rubbellos` : `${formatNumber(r.amount)}× Turbo-Dünger`
        pushToast(`${creatureById(m.id)?.name}: ${label} 🎁`, '🎁', 5000, { key: 'creature-gift' })
      }
    } else {
      playSound('click')
    }
    // a little heart pops wherever you tapped, either way
    const key = heartSeq++
    hearts = [...hearts, { key, x: m.x, y: m.y }]
    setTimeout(() => (hearts = hearts.filter((h) => h.key !== key)), 900)
  }
</script>

<div class="creature-layer" aria-hidden="false">
  {#each movers as m (m.id)}
    {@const ready = isGiftReady($gameStore, m.id, now)}
    {@const def = creatureById(m.id)}
    <button
      class="critter"
      class:flying={m.flying}
      class:ready
      style:left={`${m.x}%`}
      style:top={`${m.y}%`}
      aria-label={ready ? `Geschenk von ${def?.name} abholen` : def?.name}
      title={ready && def ? `🎁 ${formatNumber(giftReward(def, creatureLevel($gameStore, m.id)).amount)} abholen` : def?.name}
      onclick={() => click(m, ready)}
    >
      <span class="body" style:transform={`scaleX(${m.face})`}>{m.emoji}</span>
      {#if ready}<span class="gift-bubble">🎁</span>{/if}
    </button>
  {/each}
  {#each hearts as h (h.key)}
    <span class="heart" style:left={`${h.x}%`} style:top={`${h.y}%`}>❤</span>
  {/each}
</div>

<style>
  .creature-layer {
    position: fixed;
    inset: 0;
    z-index: 60; /* above the scene/field, below panels/HUD */
    pointer-events: none; /* the field stays clickable… */
    overflow: hidden;
  }
  .critter {
    position: absolute;
    transform: translate(-50%, -50%);
    background: none;
    border: none;
    padding: 6px;
    margin: 0;
    cursor: pointer;
    font-size: 22px;
    line-height: 1;
    pointer-events: auto; /* …but the creatures catch clicks */
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.55));
    transition: filter 0.2s;
  }
  .critter.flying {
    font-size: 17px;
  }
  .critter .body {
    display: inline-block;
  }
  .critter.ready {
    filter: drop-shadow(0 0 7px rgba(232, 193, 112, 0.9));
  }
  .critter:hover .body {
    transform: scale(1.18);
  }
  .gift-bubble {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 14px;
    animation: gift-bob 0.8s ease-in-out infinite;
  }
  @keyframes gift-bob {
    0%,
    100% {
      transform: translate(-50%, 0);
    }
    50% {
      transform: translate(-50%, -4px);
    }
  }
  .heart {
    position: absolute;
    transform: translate(-50%, -50%);
    color: var(--c-red1);
    font-size: 16px;
    pointer-events: none;
    animation: heart-float 0.9s ease-out forwards;
  }
  @keyframes heart-float {
    from {
      opacity: 0.95;
      transform: translate(-50%, -50%) scale(0.6);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -180%) scale(1.2);
    }
  }
</style>
