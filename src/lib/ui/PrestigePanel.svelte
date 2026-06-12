<script lang="ts">
  import { CONFIG } from '../data/config'
  import { compostGain, leaseParcel, leaseRequirement } from '../game/actions'
  import { effectiveCompost } from '../game/modifiers'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { legendaryBurst } from './fx/particles'
  import { screenShake } from './fx/shake'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'
  import { pushToast } from './toasts'

  let { onClose }: { onClose: () => void } = $props()

  const gain = $derived(compostGain($gameStore))
  const required = $derived(leaseRequirement($gameStore))
  const nextAt = $derived(CONFIG.prestigeBase * Math.pow($gameStore.compost + gain + 1, 2))
  const yieldPct = $derived(Math.round(effectiveCompost($gameStore) * CONFIG.compostYieldPerPoint * 100))
  const growthPct = $derived(Math.round(effectiveCompost($gameStore) * CONFIG.compostGrowthPerPoint * 100))

  function handleLease() {
    if (
      !window.confirm(
        'Neue Parzelle pachten? Geld, Beete, Lager, Upgrades und Aufträge dieser Runde werden zurückgesetzt!'
      )
    ) {
      return
    }
    const earned = leaseParcel()
    if (earned > 0) {
      playSound('legendary')
      screenShake(1.4)
      legendaryBurst(window.innerWidth / 2, window.innerHeight / 2)
      pushToast(`Parzelle ${$gameStore.parcels} gepachtet! +${formatNumber(earned)} Kompost`, '🌱', 9000)
      onClose()
    }
  }
</script>

<Overlay title="Neue Parzelle" {onClose}>
  <p class="hint">
    Der große Schritt: Du pachtest frisches Land, startest die Runde neu — und nimmst <b>Kompost</b> mit,
    der für immer wirkt.
  </p>

  <div class="rows num">
    <div class="row">
      <span class="label">Aktuell</span>
      <span>
        Parzelle {$gameStore.parcels} · {formatNumber($gameStore.compost)} Kompost
        {#if $gameStore.compost > 0}
          (+{yieldPct} % Ertrag, +{growthPct} % Tempo — sättigt sanft)
        {/if}
      </span>
    </div>
    <div class="row">
      <span class="label">Diese Runde</span>
      <span>{formatNumber($gameStore.totalEarned)} verdient · gesamt {formatNumber($gameStore.lifetimeEarned)}</span>
    </div>
    <div class="row gain-row" class:ready={gain >= 1}>
      <span class="label">Beim Pachten</span>
      <span>
        <PixelIcon name="duenger" scale={1} />
        +{formatNumber(gain)} Kompost · +{CONFIG.parcelExtraPlots} Beete maximal
      </span>
    </div>
    {#if gain < 3}
      <div class="row">
        <span class="label">Nächster Punkt</span>
        <span>ab {formatNumber(nextAt)} Gesamteinnahmen</span>
      </div>
    {/if}
  </div>

  <div class="lists">
    <div>
      <h3>Wird zurückgesetzt</h3>
      <ul>
        <li>Geld &amp; Runden-Einnahmen</li>
        <li>Beete &amp; Pflanzen</li>
        <li>Lager &amp; Upgrades</li>
        <li>Aufträge</li>
      </ul>
    </div>
    <div>
      <h3>Bleibt für immer</h3>
      <ul>
        <li>Kompost-Boni</li>
        <li>Gärtner-Level &amp; XP</li>
        <li>Lose &amp; Turbo-Dünger</li>
        <li>Statistiken</li>
      </ul>
    </div>
  </div>

  <button class="pxbtn gold full num" disabled={gain < required} onclick={handleLease}>
    Parzelle {$gameStore.parcels + 1} pachten — +{formatNumber(gain)} Kompost
  </button>
  {#if gain < required}
    <p class="hint">
      Parzelle {$gameStore.parcels + 1} braucht mindestens <b>+{required} Kompost</b> auf einmal —
      Kompost wächst mit deinen Gesamteinnahmen (nächster Punkt ab {formatNumber(nextAt)}). Lieber
      selten und wuchtig als oft und wirkungslos.
    </p>
  {/if}
  <p class="hint">
    Ertrags-% wirken als Chance: +25 % heißt, jede Ernte bringt im Schnitt das 1,25-fache — der Bonus
    würfelt pro Ernte eine Extra-Einheit aus.
  </p>
</Overlay>

<style>
  .rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 12px 0;
    font-size: 0.85rem;
  }

  .row {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }

  .row span:last-child {
    color: var(--c-cloud);
  }

  .label {
    flex: none;
    width: 110px;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-mist);
  }

  .gain-row span:last-child {
    color: var(--c-gold2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .gain-row.ready span:last-child {
    text-shadow: 0 0 10px rgba(222, 158, 65, 0.5);
  }

  .lists {
    display: flex;
    gap: 18px;
    margin: 0 0 14px;
  }

  .lists > div {
    flex: 1;
  }

  h3 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-mist);
    margin: 0 0 6px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 0.78rem;
    color: var(--c-cloud);
    line-height: 1.6;
  }

  .lists > div:last-child ul {
    color: var(--c-leaf4);
  }
</style>
