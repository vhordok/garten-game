<script lang="ts">
  import PixelIcon from './PixelIcon.svelte'
</script>

<!-- Fixed night-garden backdrop: sky bands, stars, moon, parallax hedge
     silhouettes, ground and a soft vignette. Purely decorative. -->
<div class="scene" aria-hidden="true">
  <div class="sky"></div>
  <div class="stars far"></div>
  <div class="stars near"></div>
  <span class="moon"><PixelIcon name="moon" scale={4} /></span>
  <div class="hedge far"></div>
  <div class="hedge near"></div>
  <div class="ground"></div>
  <span class="fly" style="left: 18%; top: 58%; animation-duration: 3.2s"></span>
  <span class="fly" style="left: 41%; top: 66%; animation-duration: 4.4s"></span>
  <span class="fly" style="left: 67%; top: 61%; animation-duration: 3.8s"></span>
  <span class="fly" style="left: 86%; top: 70%; animation-duration: 5.1s"></span>
  <div class="vignette"></div>
</div>

<style>
  .scene {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .scene > * {
    position: absolute;
  }

  /* hard color bands instead of a smooth gradient — pixel sky */
  .sky {
    inset: 0;
    background: linear-gradient(
      180deg,
      var(--c-night0) 0%,
      var(--c-night0) 22%,
      var(--c-sky0) 22%,
      var(--c-sky0) 44%,
      var(--c-sky1) 44%,
      var(--c-sky1) 56%,
      var(--c-sky0) 56%,
      var(--c-sky0) 100%
    );
  }

  .stars {
    inset: 0 0 40% 0;
    background-image: var(--bg-stars);
    background-repeat: repeat;
    image-rendering: pixelated;
  }

  .stars.far {
    background-size: 192px 192px;
    opacity: 0.55;
  }

  .stars.near {
    background-size: 288px 288px;
    background-position: 70px 40px;
  }

  .moon {
    top: 6%;
    right: 9%;
    filter: drop-shadow(0 0 14px rgba(235, 237, 233, 0.3));
  }

  .hedge {
    left: 0;
    right: 0;
    image-rendering: pixelated;
    background-repeat: repeat-x, no-repeat;
    background-position: top, bottom;
  }

  .hedge.far {
    top: 54%;
    height: 8%;
    background-image: var(--sprite-hedge-far), linear-gradient(var(--c-night1), var(--c-night1));
    background-size:
      64px 32px,
      100% calc(100% - 32px);
  }

  .hedge.near {
    top: 58%;
    height: 12%;
    background-image: var(--sprite-hedge-near), linear-gradient(var(--c-leaf0), var(--c-leaf0));
    background-size:
      96px 48px,
      100% calc(100% - 48px);
  }

  .ground {
    top: 70%;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, var(--c-leaf0) 0%, #0d1610 35%, var(--c-night0) 100%);
  }

  /* firefly: a square pixel with a soft glow, gently pulsing */
  .fly {
    width: 4px;
    height: 4px;
    background: var(--c-leaf4);
    box-shadow: 0 0 8px 2px rgba(168, 202, 88, 0.55);
    animation: fly-pulse 4s ease-in-out infinite alternate;
  }

  @keyframes fly-pulse {
    from {
      opacity: 0.15;
      transform: translateY(0);
    }
    to {
      opacity: 0.95;
      transform: translateY(-10px);
    }
  }

  .vignette {
    inset: 0;
    background: radial-gradient(120% 90% at 50% 38%, transparent 55%, rgba(5, 6, 12, 0.55) 100%);
  }
</style>
