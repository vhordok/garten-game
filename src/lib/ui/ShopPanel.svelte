<script lang="ts">
  import { LICENSES } from '../data/licenses'
  import { UPGRADES } from '../data/upgrades'
  import { buyLicense, buySpecialization, buyUpgrade, nextUpgradeCost, PLANT_CATEGORIES, upgradeLevel } from '../game/actions'
  import { nextSpecMilestone, specPerkMultiplier, specializationPurchase, specYieldSum } from '../game/modifiers'
  import { CONFIG } from '../data/config'
  import { categorySpecById } from '../data/specializations'
  import { gameStore } from '../game/state'
  import type { PlantCategory, UpgradeDef, UpgradeSection } from '../game/types'
  import { formatDuration, formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const SECTIONS: Array<{ id: UpgradeSection; label: string }> = [
    { id: 'boost', label: 'Boosts' },
    { id: 'glueck', label: 'Glück' },
    { id: 'helfer', label: 'Helfer — arbeiten auch offline' },
  ]

  const CATEGORY_LABEL: Record<PlantCategory, string> = {
    kraeuter: 'Kräuter',
    gemuese: 'Gemüse',
    beeren: 'Beeren',
    obst: 'Obst',
    baeume: 'Holz',
    zier: 'Zier',
    cannabis: 'Hanf',
    magie: 'Magie',
    kosmos: 'Kosmisch',
  }

  // PHASE 15 visual identity: a distinct palette accent per category so the
  // specialisation list reads at a glance (sprites alone are too similar).
  const CATEGORY_ACCENT: Record<PlantCategory, string> = {
    kraeuter: 'var(--c-leaf3)',
    gemuese: 'var(--c-gold1)',
    beeren: 'var(--c-plum2)',
    obst: 'var(--c-red1)',
    baeume: 'var(--c-soil2)',
    zier: 'var(--c-plum3)',
    cannabis: 'var(--c-leaf4)',
    magie: 'var(--c-blue2)',
    kosmos: 'var(--c-blue1)',
  }

  function handleBuySpec(e: MouseEvent, category: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buySpecialization(category)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 14)
      playSound('buy')
    } else {
      playSound('error')
    }
  }

  function effectText(u: UpgradeDef): string {
    switch (u.effect) {
      case 'growth':
        return `+${Math.round(u.perLevel * 100)} % Wachstumstempo pro Stufe`
      case 'yield':
        return `+${Math.round(u.perLevel * 100)} % Ertrag pro Stufe`
      case 'sellPrice':
        return `+${Math.round(u.perLevel * 100)} % Verkaufspreis pro Stufe`
      case 'waterCharges':
        return `+${u.perLevel} Gieß-Ladung · +${Math.round(CONFIG.wasserfassGrowthPerLevel * 100)} % Wachstum (offline) pro Stufe`
      case 'comboWindow':
        return `+${u.perLevel} s Combo-Fenster · +${CONFIG.sternenuhrOfflinePerLevel} h Offline pro Stufe`
      case 'critChance':
        return `+${Math.round(u.perLevel * 100)} % Perfekt-Chance (Legendär ein Fünftel davon) pro Stufe`
      case 'scratchLuck':
        return `+${Math.round(u.perLevel * 100)} % Los-Chance pro Stufe`
      case 'offlineCap':
        return `+${u.perLevel} h Offline-Wachstum pro Stufe`
      case 'autoHarvest':
        return `erntet +${u.perLevel} Beete/s pro Stufe`
      case 'autoSow':
        return `sät +${u.perLevel} Beete/s pro Stufe (gewählte Sorte)`
      case 'autoSell':
        return 'verkauft das Lager — pro Stufe öfter'
    }
  }

  function activeText(u: UpgradeDef, level: number): string {
    if (level === 0) return ''
    switch (u.effect) {
      case 'growth':
      case 'yield':
      case 'sellPrice':
        return `+${Math.round(u.perLevel * level * 100)} %`
      case 'waterCharges':
        return `+${u.perLevel * level} Ladungen`
      case 'comboWindow':
        return `+${(u.perLevel * level).toFixed(1)} s`
      case 'critChance':
      case 'scratchLuck':
        return `+${Math.round(u.perLevel * level * 100)} %`
      case 'offlineCap':
        return `${8 + u.perLevel * level} h Cap`
      case 'autoHarvest':
      case 'autoSow':
        return `${(u.perLevel * level).toFixed(1)} Beete/s`
      case 'autoSell':
        return `alle ${formatDuration(60 / level)}`
    }
  }

  function handleBuyLicense(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buyLicense()) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 20)
      playSound('levelup')
    } else {
      playSound('error')
    }
  }

  function handleBuy(e: MouseEvent, upgradeId: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buyUpgrade(upgradeId)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12)
      playSound('buy')
    } else {
      playSound('error')
    }
  }
</script>

<Overlay title="Shop" {onClose}>
  <p class="hint">
    Dauerhafte Upgrades für diese Parzelle — jede Stufe wirkt sofort. Ertrags-% sind eine Chance auf
    Extra-Einheiten: +30 % = im Schnitt 1,3 Einheiten statt 1 pro Ernte.
  </p>
  {#each SECTIONS as section (section.id)}
    <h3 class="section">{section.label}</h3>
    <ul class="shop-list">
      {#each UPGRADES.filter((u) => u.section === section.id) as upgrade (upgrade.id)}
        {@const level = upgradeLevel($gameStore, upgrade.id)}
        {@const cost = nextUpgradeCost(upgrade, $gameStore)}
        {@const unlocked = !upgrade.unlockParcel || $gameStore.parcels >= upgrade.unlockParcel}
        {@const affordable = unlocked && cost !== null && $gameStore.money >= cost}
        <li class="row" class:dimmed={!unlocked}>
          <span class="icon"><PixelIcon name={unlocked ? upgrade.sprite : 'lock'} scale={3} /></span>
          <span class="info">
            <span class="name">
              {upgrade.name}
              {#if upgrade.repeatable}
                <span class="level num">Stufe {level}</span>
              {:else}
                <span class="level num">Stufe {level}/{upgrade.maxLevel}</span>
              {/if}
            </span>
            <span class="desc">{upgrade.description}</span>
            <span class="effect num">
              {effectText(upgrade)}
              {#if level > 0}
                · aktiv: <b>{activeText(upgrade, level)}</b>
              {/if}
            </span>
          </span>
          {#if !unlocked}
            <span class="maxed lockmsg num">ab Parzelle {upgrade.unlockParcel}</span>
          {:else if cost === null}
            <span class="maxed">MAX</span>
          {:else}
            <button class="pxbtn gold num buy" disabled={!affordable} onclick={(e) => handleBuy(e, upgrade.id)}>
              <PixelIcon name="coin" scale={1} />
              {formatNumber(cost)}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/each}

  <h3 class="section">Spezialisierung — dauerhaft, übersteht Prestige</h3>
  <p class="hint spec-hint">
    Pro Kategorie: der Ertragsbonus <b>steigt mit jeder Stufe stärker</b>, und alle {CONFIG.specMilestoneEvery} Stufen
    verstärkt ein <b>Meilenstein</b> den eigenen Bonus der Kategorie. Hohe Stufen kosten Gold <b>und</b> Kompost —
    entscheide, worauf du dich spezialisierst.
  </p>
  <ul class="shop-list spec-list">
    {#each PLANT_CATEGORIES as category (category)}
      {@const p = specializationPurchase($gameStore, category)}
      {@const spec = categorySpecById(category)}
      {@const yieldPct = Math.round(specYieldSum(p.level) * 100)}
      {@const nextPct = Math.round(specYieldSum(p.level + 1) * 100)}
      {@const perkMult = specPerkMultiplier(p.level)}
      {@const ms = nextSpecMilestone(p.level)}
      <li
        class="row spec-row"
        class:dimmed={!p.maxed && (!p.parcelsMet || !p.gardenerMet)}
        style="--cat-accent: {CATEGORY_ACCENT[category as PlantCategory] ?? 'var(--c-leaf3)'}"
      >
        <span class="icon spec-icon num">+{yieldPct}%</span>
        <span class="info">
          <span class="name">
            {CATEGORY_LABEL[category as PlantCategory] ?? category}
            <span class="level num">Stufe {p.level}{p.maxed ? ' · MAX' : `/${CONFIG.specMaxLevel}`}</span>
          </span>
          {#if p.level > 0}
            <span class="effect num">
              aktiv: <b>+{yieldPct} % Ertrag</b>{#if spec} · <b>{spec.unique.format(p.level)}</b>{/if}{#if perkMult > 1}
                <span class="ms-tag">★{perkMult.toFixed(1)}×</span>{/if}
            </span>
          {:else if spec}
            <span class="desc">Ertrag steigt je Stufe · {spec.unique.desc}</span>
          {/if}
          {#if !p.maxed}
            <span class="desc next">nächste Stufe: +{nextPct - yieldPct} % Ertrag{#if ms} · Meilenstein bei Stufe {ms}{#if spec} ({spec.milestoneDesc}){/if}{/if}</span>
          {/if}
          {#if !p.maxed && (!p.parcelsMet || !p.gardenerMet)}
            <span class="req num">
              braucht{#if !p.parcelsMet} {p.req.parcels} Parzellen{/if}{#if !p.parcelsMet && !p.gardenerMet} ·{/if}{#if !p.gardenerMet}
                Level {p.req.gardener}{/if}
            </span>
          {/if}
        </span>
        {#if p.maxed}
          <span class="maxed">MAX</span>
        {:else}
          <button class="pxbtn gold num buy spec-buy" disabled={!p.canBuy} onclick={(e) => handleBuySpec(e, category)}>
            <span class="cost-line"><PixelIcon name="coin" scale={1} /> {formatNumber(p.gold)}</span>
            {#if p.compost > 0}
              <span class="cost-line compost" class:short={!p.affordableCompost}>🌱 {formatNumber(p.compost)}</span>
            {/if}
          </button>
        {/if}
      </li>
    {/each}
  </ul>

  <h3 class="section">Lizenzen — medizinischer Anbau</h3>
  <ul class="shop-list">
    {#each LICENSES as lic (lic.level)}
      {@const owned = $gameStore.licenses >= lic.level}
      {@const isNext = $gameStore.licenses + 1 === lic.level}
      {@const met = lic.requirementMet($gameStore)}
      <li class="row" class:dimmed={!owned && !isNext}>
        <span class="icon"><PixelIcon name={owned ? 'pokal' : 'lock'} scale={3} /></span>
        <span class="info">
          <span class="name">{lic.name}</span>
          <span class="desc">{lic.description}</span>
          {#if lic.benefit}
            <span class="effect num">Dauerhaft: <b>{lic.benefit}</b></span>
          {/if}
          <span class="effect num">Bedingung: {lic.requirementText} {met ? '✓' : '✗'}</span>
        </span>
        {#if owned}
          <span class="maxed">AKTIV</span>
        {:else if isNext}
          <button class="pxbtn gold num buy" disabled={!met || $gameStore.money < lic.cost} onclick={handleBuyLicense}>
            <PixelIcon name="coin" scale={1} />
            {formatNumber(lic.cost)}
          </button>
        {:else}
          <span class="maxed">—</span>
        {/if}
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .section {
    margin: 14px 0 0;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-mist);
  }

  .shop-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon {
    flex: none;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-night1);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .name {
    font-weight: 700;
    font-size: 0.92rem;
    color: var(--c-leaf5);
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .level {
    font-size: 0.7rem;
    color: var(--c-mist);
  }

  .desc {
    font-size: 0.74rem;
    color: var(--c-mist);
    line-height: 1.35;
  }

  .effect {
    font-size: 0.74rem;
    color: var(--c-cloud);
  }

  .effect b {
    color: var(--c-leaf4);
  }

  .buy {
    flex: none;
  }

  .dimmed {
    opacity: 0.5;
  }

  .maxed {
    flex: none;
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--c-gold2);
    text-shadow: 0 0 8px rgba(222, 158, 65, 0.5);
  }

  .lockmsg {
    color: var(--c-mist);
    text-shadow: none;
    font-size: 0.72rem;
    text-align: right;
  }

  .spec-hint {
    margin-top: 6px;
  }

  .spec-row {
    border-left: 3px solid var(--cat-accent, var(--c-leaf3));
    padding-left: 7px;
  }

  .spec-icon {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--cat-accent, var(--c-leaf4));
  }

  .req {
    font-size: 0.72rem;
    color: var(--c-gold2);
  }

  .desc.next {
    color: var(--c-leaf4);
    opacity: 0.85;
  }

  .ms-tag {
    display: inline-block;
    padding: 0 4px;
    border-radius: 4px;
    background: var(--c-gold2);
    color: var(--c-night1, #1a1830);
    font-weight: 700;
    font-size: 0.7rem;
  }

  .spec-buy {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    line-height: 1.15;
  }

  .cost-line {
    display: flex;
    align-items: center;
    gap: 3px;
    justify-content: center;
    white-space: nowrap;
  }

  .cost-line.compost {
    font-size: 0.72rem;
    color: var(--c-leaf4);
  }

  .cost-line.compost.short {
    color: var(--c-rose, #e06c75);
  }

  @media (max-width: 560px) {
    .spec-row .desc {
      font-size: 0.7rem;
    }
  }
</style>
