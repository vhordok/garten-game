<script lang="ts">
  import { onMount } from 'svelte'
  import { PLANTS } from './lib/data/plants'
  import type { OfflineReport } from './lib/game/offline'
  import { gameStore } from './lib/game/state'
  import { playSound, startAtmosphere } from './lib/ui/fx/audio'
  import AchievementsPanel from './lib/ui/AchievementsPanel.svelte'
  import { ACHIEVEMENTS, TIER_NAMES } from './lib/data/achievements'
  import { CAMPAIGN } from './lib/data/campaign'
  import DailyPanel from './lib/ui/DailyPanel.svelte'
  import FxLayer from './lib/ui/fx/FxLayer.svelte'
  import GalleryPanel from './lib/ui/GalleryPanel.svelte'
  import ExpeditionPanel from './lib/ui/ExpeditionPanel.svelte'
  import CreaturesPanel from './lib/ui/CreaturesPanel.svelte'
  import GoalsPanel from './lib/ui/GoalsPanel.svelte'
  import GoldenFirefly from './lib/ui/GoldenFirefly.svelte'
  import CreatureLayer from './lib/ui/CreatureLayer.svelte'
  import { registerShakeTarget } from './lib/ui/fx/shake'
  import Garden from './lib/ui/Garden.svelte'
  import Hotbar from './lib/ui/Hotbar.svelte'
  import Hud from './lib/ui/Hud.svelte'
  import PixelIcon from './lib/ui/PixelIcon.svelte'
  import InventoryPanel from './lib/ui/InventoryPanel.svelte'
  import PrestigePanel from './lib/ui/PrestigePanel.svelte'
  import QuestPanel from './lib/ui/QuestPanel.svelte'
  import Scene from './lib/ui/Scene.svelte'
  import ScratchPanel from './lib/ui/ScratchPanel.svelte'
  import SeedLabPanel from './lib/ui/SeedLabPanel.svelte'
  import SkillsPanel from './lib/ui/SkillsPanel.svelte'
  import SettingsPanel from './lib/ui/SettingsPanel.svelte'
  import ShopPanel from './lib/ui/ShopPanel.svelte'
  import Toasts from './lib/ui/Toasts.svelte'
  import ToastLogPanel from './lib/ui/ToastLogPanel.svelte'
  import WeatherEvents from './lib/ui/WeatherEvents.svelte'
  import { pushToast } from './lib/ui/toasts'
  import TutorialPanel from './lib/ui/TutorialPanel.svelte'
  import { formatDuration, formatNumber } from './lib/util/format'

  let { offline }: { offline: OfflineReport | null } = $props()

  let openPanel = $state<
    | 'inventory' | 'settings' | 'shop' | 'quests' | 'scratch' | 'prestige' | 'daily' | 'achievements' | 'goals' | 'skills' | 'seedlab' | 'gallery' | 'expeditions' | 'creatures' | 'toastlog' | 'tutorial' | null
  >(null)
  // the world stage is the shake target — fixed HUD/hotbar stay put
  let stageEl: HTMLElement

  const TUTORIAL_KEY = 'garten-imperium-tutorial'

  function closeTutorial() {
    try {
      localStorage.setItem(TUTORIAL_KEY, 'done')
    } catch {
      /* ignore */
    }
    openPanel = null
  }

  onMount(() => {
    registerShakeTarget(stageEl)
    // browsers gate audio behind a gesture — arm atmosphere on the first one
    window.addEventListener('pointerdown', startAtmosphere, { once: true })

    // first run only: short onboarding before anything was ever planted
    let tutorialSeen = true
    try {
      tutorialSeen = localStorage.getItem(TUTORIAL_KEY) === 'done'
    } catch {
      /* ignore */
    }
    if (!tutorialSeen && $gameStore.stats.planted === 0) openPanel = 'tutorial'
    if (offline && offline.awaySeconds >= 60) {
      const parts: string[] = []
      if (offline.ripened > 0) {
        parts.push(`${offline.ripened} ${offline.ripened === 1 ? 'Pflanze ist' : 'Pflanzen sind'} reif geworden`)
      }
      if (offline.autoHarvested > 0) parts.push(`Helfer ernteten ${formatNumber(offline.autoHarvested)}×`)
      if (offline.autoEarned > 0) parts.push(`+${formatNumber(offline.autoEarned)} Gold verdient`)
      const summary = parts.length > 0 ? ` — ${parts.join(', ')}!` : '.'
      pushToast(`Willkommen zurück! Du warst ${formatDuration(offline.awaySeconds)} weg${summary}`, '🌅', 10000, { priority: 'important' })
      playSound('welcome')
    }
  })

  // Announce freshly reached achievement TIERS (state change drives the toast).
  let knownTiers: Record<string, number> | null = null
  $effect(() => {
    const current = $gameStore.achievementTiers
    if (knownTiers !== null) {
      for (const def of ACHIEVEMENTS) {
        const now = current[def.id] ?? 0
        const before = knownTiers[def.id] ?? 0
        if (now > before) {
          const tier = TIER_NAMES[now - 1]
          pushToast(`${def.icon} ${def.name} — ${tier} erreicht!`, '🏆', 8000, { priority: 'critical', key: `ach-${def.id}` })
          playSound('levelup')
        }
      }
    }
    knownTiers = { ...current }
  })

  // Announce freshly completed campaign chapters (state change drives the toast).
  let knownCampaign: number | null = null
  $effect(() => {
    const now = $gameStore.campaign
    if (knownCampaign !== null && now > knownCampaign) {
      // the chapter we just finished is the step at index now-1
      const step = CAMPAIGN[now - 1]
      if (step) {
        pushToast(`Kapitel geschafft: ${step.title} — ${step.rewardDesc}!`, '🎯', 8000, { priority: 'important', key: 'campaign' })
        playSound('levelup')
      }
    }
    knownCampaign = now
  })

  // Announce newly unlocked plants (transition detection, not game logic).
  let knownUnlocks: string[] | null = null
  $effect(() => {
    const unlocked = PLANTS.filter((p) => $gameStore.totalEarned >= p.unlockAtTotalEarned)
    if (knownUnlocks !== null) {
      for (const plant of unlocked) {
        if (!knownUnlocks.includes(plant.id)) {
          pushToast(`Neue Pflanze freigeschaltet: ${plant.name}!`, plant.emoji, 8000, { priority: 'important', key: `unlock-${plant.id}` })
          playSound('unlock')
        }
      }
    }
    knownUnlocks = unlocked.map((p) => p.id)
  })
</script>

<Scene />

<div class="app">
  <Hud
    onOpenInventory={() => (openPanel = 'inventory')}
    onOpenSettings={() => (openPanel = 'settings')}
    onOpenShop={() => (openPanel = 'shop')}
    onOpenQuests={() => (openPanel = 'quests')}
    onOpenScratch={() => (openPanel = 'scratch')}
    onOpenPrestige={() => (openPanel = 'prestige')}
    onOpenDaily={() => (openPanel = 'daily')}
    onOpenAchievements={() => (openPanel = 'achievements')}
    onOpenGoals={() => (openPanel = 'goals')}
    onOpenSkills={() => (openPanel = 'skills')}
    onOpenSeedLab={() => (openPanel = 'seedlab')}
    onOpenGallery={() => (openPanel = 'gallery')}
    onOpenExpeditions={() => (openPanel = 'expeditions')}
    onOpenCreatures={() => (openPanel = 'creatures')}
    onOpenToastLog={() => (openPanel = 'toastlog')}
  />
  <main bind:this={stageEl}>
    <!-- PHASE 16: in-flow notification zone — event banners reserve space here,
         above the garden toolbar, so they can never overlap the main buttons -->
    <div class="notify-zone"><WeatherEvents /></div>
    <Garden />
  </main>
  <Hotbar />
</div>
<!-- PHASE 4: on roomy desktops the settings gear sits outside the topbar,
     in the corner; on narrower screens the in-HUD gear is used instead -->
<button
  class="settings-fab pxbtn"
  onclick={() => (openPanel = 'settings')}
  title="Einstellungen & Spielstand"
  aria-label="Einstellungen"
>
  <PixelIcon name="gear" scale={2} />
</button>
<GoldenFirefly />
<CreatureLayer />
<FxLayer />

{#if openPanel === 'inventory'}
  <InventoryPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'settings'}
  <SettingsPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'shop'}
  <ShopPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'quests'}
  <QuestPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'scratch'}
  <ScratchPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'prestige'}
  <PrestigePanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'daily'}
  <DailyPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'achievements'}
  <AchievementsPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'goals'}
  <GoalsPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'skills'}
  <SkillsPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'seedlab'}
  <SeedLabPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'gallery'}
  <GalleryPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'expeditions'}
  <ExpeditionPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'creatures'}
  <CreaturesPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'toastlog'}
  <ToastLogPanel onClose={() => (openPanel = null)} />
{:else if openPanel === 'tutorial'}
  <TutorialPanel onClose={closeTutorial} />
{/if}
<Toasts />

<style>
  .app {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* keep clear of the fixed HUD (top, real height via --hud-h) and the
       hotbar (bottom), plus device safe-areas. The fallback covers the first
       paint before --hud-h is measured (PHASE 4/5). */
    padding:
      calc(var(--safe-top, 0px) + 10px + var(--hud-h, 76px) + 16px)
      calc(var(--safe-right, 0px) + 16px)
      calc(var(--safe-bottom, 0px) + var(--hotbar-h, 130px) + 28px)
      calc(var(--safe-left, 0px) + 16px);
  }

  /* detached settings gear — hidden until there is room beside the topbar */
  .settings-fab {
    display: none;
    position: fixed;
    top: calc(var(--safe-top, 0px) + 14px);
    right: calc(var(--safe-right, 0px) + 16px);
    z-index: 30;
  }

  @media (min-width: 1100px) {
    .settings-fab {
      display: inline-flex;
    }
  }

  main {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 3vh;
  }

  /* PHASE 45: on phones the fixed HUD is tall, so the stacked breathing room
     (app clearance + main 3vh) left a big empty band under the topbar. Pull the
     garden up: tighter clearance, no extra main gap. */
  @media (max-width: 640px) {
    .app {
      padding-top: calc(var(--safe-top, 0px) + var(--hud-h, 76px) + 4px);
    }
    main {
      padding-top: 0;
    }
  }

  /* reserves vertical space only while an event banner is present; empty = 0px */
  .notify-zone {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .notify-zone:not(:empty) {
    margin-bottom: 12px;
  }
</style>
