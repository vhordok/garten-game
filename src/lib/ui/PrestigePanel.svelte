<script lang="ts">
  import { CONFIG } from '../data/config'
  import { COMPOST_UPGRADES, compostUpgradeCost } from '../data/compostUpgrades'
  import { PARCEL_MILESTONES, nextMilestone } from '../data/milestones'
  import { buyCompostUpgrade, buyStarUpgrade, compostGain, leaseParcel, leaseRequirement, weltensaat } from '../game/actions'
  import { canWeltensaat, starseedGain, starUpgradeLevel, worldseedYieldFactor } from '../game/worldseed'
  import { STAR_UPGRADES, starUpgradeCost } from '../data/starUpgrades'
  import { effectiveCompost } from '../game/modifiers'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst, legendaryBurst } from './fx/particles'
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
  const upcoming = $derived(nextMilestone($gameStore.parcels))

  // PHASE 51 Weltensaat — the higher prestige
  const starGain = $derived(starseedGain($gameStore))
  const starFactor = $derived(worldseedYieldFactor($gameStore))
  const canSow = $derived(canWeltensaat($gameStore))

  function compostActive(effect: string, perLevel: number, level: number): string {
    if (level <= 0) return ''
    return effect === 'offline' ? `+${perLevel * level} h` : `+${Math.round(perLevel * level * 100)} %`
  }

  function handleBuyCompost(e: MouseEvent, id: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buyCompostUpgrade(id)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12)
      playSound('buy')
    } else {
      playSound('error')
    }
  }

  // PHASE 53: Sternenkammer — spend Sternensaat on permanent upgrades
  const seenWeltensaat = $derived($gameStore.starseed > 0 || $gameStore.worldResets > 0)

  function handleBuyStar(e: MouseEvent, id: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buyStarUpgrade(id)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12)
      playSound('buy')
    } else {
      playSound('error')
    }
  }

  function handleWeltensaat() {
    if (
      !window.confirm(
        'Weltensaat säen? Parzellen UND Kompost werden auf Anfang zurückgesetzt — Meisterschaft, ' +
          'Spezialisierungen, Skills, Sammlungen, Erfolge und Lizenzen bleiben. Dafür bekommst du ' +
          'dauerhafte Sternensaat (gartenweiter Ertrag für immer).'
      )
    ) {
      return
    }
    const gained = weltensaat()
    if (gained > 0) {
      playSound('legendary')
      screenShake(1.8)
      legendaryBurst(window.innerWidth / 2, window.innerHeight / 2)
      pushToast(`Weltensaat gesät! +${formatNumber(gained)} Sternensaat 🌌`, '🌌', 10000, { priority: 'critical' })
      onClose()
    }
  }

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
      pushToast(`Parzelle ${$gameStore.parcels} gepachtet! +${formatNumber(earned)} Kompost`, '🌱', 9000, { priority: 'important' })
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

  <h3 class="sec">Parzellen-Meilensteine</h3>
  <ul class="ms-list num">
    {#each PARCEL_MILESTONES as m (m.parcel)}
      {@const reached = $gameStore.parcels >= m.parcel}
      <li class="ms" class:reached>
        <span class="ms-icon">{reached ? '✓' : '🔒'}</span>
        <span class="ms-body">
          <span><b>Parzelle {m.parcel}</b> · {m.label}</span>
          <span class="ms-desc">{m.desc}</span>
        </span>
      </li>
    {/each}
  </ul>
  {#if upcoming}
    <p class="hint">Nächstes Ziel: <b>Parzelle {upcoming.parcel}</b> — {upcoming.desc}.</p>
  {/if}

  <h3 class="sec">Kompost-Garten <span class="sec-note num">· {formatNumber($gameStore.compost)} Kompost frei</span></h3>
  <p class="hint">Dauerhafte Boni für Kompost — das Ausgeben schwächt deinen Prestige-Bonus nicht.</p>
  <ul class="cu-list">
    {#each COMPOST_UPGRADES as u (u.id)}
      {@const level = $gameStore.compostUpgrades[u.id] ?? 0}
      {@const locked = $gameStore.parcels < u.unlockParcel}
      {@const cost = compostUpgradeCost(u, level)}
      {@const affordable = !locked && cost !== null && $gameStore.compost >= cost}
      <li class="cu" class:dimmed={locked} class:endless={u.repeatable}>
        <span class="cu-body">
          <span class="cu-head">
            <b>{u.name}</b>
            <span class="cu-lvl num">Stufe {level}{u.repeatable ? '' : `/${u.maxLevel}`}</span>
            {#if u.repeatable}<span class="cu-endless">∞</span>{/if}
          </span>
          <span class="cu-desc">
            {u.desc}{level > 0 ? ` · aktiv: ${compostActive(u.effect, u.perLevel, level)}` : ''}
          </span>
        </span>
        {#if locked}
          <span class="cu-lock">ab Parzelle {u.unlockParcel}</span>
        {:else if cost === null}
          <span class="cu-lock">MAX</span>
        {:else}
          <button class="pxbtn small num" disabled={!affordable} onclick={(e) => handleBuyCompost(e, u.id)}>
            <PixelIcon name="duenger" scale={1} /> {formatNumber(cost)}
          </button>
        {/if}
      </li>
    {/each}
  </ul>

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

  <!-- PHASE 51: Weltensaat — the higher prestige, gated behind deep parcels -->
  <div class="weltensaat" class:armed={canSow}>
    <h3 class="sec ws-title">🌌 Weltensaat — die höhere Prestige</h3>
    <p class="hint">
      Der ganz große Neuanfang: Du setzt <b>Parzellen und Kompost</b> komplett zurück und säst eine neue
      Welt. Meisterschaft, Spezialisierungen, Skills, Saatlabor, Galerie, Deko, Erfolge und Lizenzen
      <b>bleiben</b> — dafür erntest du <b>Sternensaat</b>, die für immer den gartenweiten Ertrag hebt.
    </p>
    <div class="rows num">
      <div class="row">
        <span class="label">Sternensaat</span>
        <span>
          {formatNumber($gameStore.starseed)} 🌌
          {#if $gameStore.starseed > 0}(+{Math.round((starFactor - 1) * 100)} % Ertrag, dauerhaft){/if}
          {#if $gameStore.worldResets > 0}· {$gameStore.worldResets}× gesät{/if}
        </span>
      </div>
      <div class="row gain-row" class:ready={canSow}>
        <span class="label">Beim Säen</span>
        <span>+{formatNumber(starGain)} Sternensaat (+{Math.round(starGain * CONFIG.starseedYieldPer * 100)} % Ertrag)</span>
      </div>
    </div>
    {#if seenWeltensaat}
      <h3 class="sec ws-sub">Sternenkammer <span class="sec-note num">· {formatNumber($gameStore.starseed)} 🌌 frei</span></h3>
      <p class="hint">Gib Sternensaat für dauerhafte Boni aus — das schwächt den festen Ertrags-Bonus nicht.</p>
      <ul class="cu-list">
        {#each STAR_UPGRADES as u (u.id)}
          {@const level = starUpgradeLevel($gameStore, u.id)}
          {@const cost = starUpgradeCost(u, level)}
          {@const affordable = cost !== null && $gameStore.starseed >= cost}
          <li class="cu" class:endless={u.repeatable}>
            <span class="cu-body">
              <span class="cu-head">
                <b>{u.name}</b>
                <span class="cu-lvl num">Stufe {level}{u.repeatable ? '' : `/${u.maxLevel}`}</span>
                {#if u.repeatable}<span class="cu-endless">∞</span>{/if}
              </span>
              <span class="cu-desc">{u.desc}</span>
            </span>
            {#if cost === null}
              <span class="cu-lock">MAX</span>
            {:else}
              <button class="pxbtn small num" disabled={!affordable} onclick={(e) => handleBuyStar(e, u.id)}>
                🌌 {formatNumber(cost)}
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <button class="pxbtn full num ws-btn" disabled={!canSow} onclick={handleWeltensaat}>
      {#if canSow}
        Weltensaat säen — +{formatNumber(starGain)} Sternensaat
      {:else}
        Freigeschaltet ab Parzelle {CONFIG.weltensaatMinParcels}
      {/if}
    </button>
  </div>
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

  .sec {
    margin: 16px 0 4px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-mist);
  }

  .sec-note {
    color: var(--c-gold2);
    text-transform: none;
    letter-spacing: 0;
  }

  .ms-list,
  .cu-list {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ms {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 0.8rem;
    opacity: 0.5;
  }

  .ms.reached {
    opacity: 1;
  }

  .ms-icon {
    flex: none;
    width: 16px;
  }

  .ms.reached .ms-icon {
    color: var(--c-leaf4);
  }

  .ms-body {
    display: flex;
    flex-direction: column;
  }

  .ms-desc {
    font-size: 0.72rem;
    color: var(--c-mist);
  }

  .cu {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cu.dimmed {
    opacity: 0.5;
  }

  .cu-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .cu-lvl {
    color: var(--c-mist);
    font-size: 0.7rem;
    margin-left: 6px;
  }

  .cu-desc {
    font-size: 0.72rem;
    color: var(--c-cloud);
    line-height: 1.35;
  }

  .cu-lock {
    flex: none;
    font-size: 0.72rem;
    color: var(--c-mist);
  }

  .cu-endless {
    margin-left: 4px;
    color: var(--c-gold2);
    font-weight: 700;
  }

  .cu.endless .cu-head b {
    color: var(--c-gold2);
  }

  /* PHASE 51: Weltensaat — the higher-prestige block, plum/cosmic accent */
  .weltensaat {
    margin-top: 18px;
    padding: 12px;
    border: 1px solid var(--c-plum1);
    background: linear-gradient(180deg, rgba(64, 39, 81, 0.35), transparent);
  }

  .ws-title {
    color: var(--c-plum3);
    margin-top: 0;
  }

  .ws-sub {
    color: var(--c-plum3);
  }

  .ws-btn {
    margin-top: 4px;
    background: var(--c-plum2);
    border-color: var(--c-plum3);
  }

  .weltensaat.armed .ws-btn {
    box-shadow: 0 0 14px rgba(223, 132, 165, 0.5);
  }

  .ws-btn:disabled {
    opacity: 0.6;
  }
</style>
