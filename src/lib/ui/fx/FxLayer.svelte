<script lang="ts">
  import { hasParticles, render, update } from './particles'

  let canvas: HTMLCanvasElement

  $effect(() => {
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let last = performance.now()
    let wasEmpty = true
    let rafId = requestAnimationFrame(function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (hasParticles()) {
        update(dt)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        render(ctx)
        wasEmpty = false
      } else if (!wasEmpty) {
        // one final clear after the last particle dies
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        wasEmpty = true
      }
      rafId = requestAnimationFrame(frame)
    })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  })
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    z-index: 40;
    pointer-events: none;
    image-rendering: pixelated;
  }
</style>
