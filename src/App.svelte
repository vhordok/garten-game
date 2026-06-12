<script lang="ts">
  import { onMount } from 'svelte'
  import { PLANTS } from './lib/data/plants'
  import type { OfflineReport } from './lib/game/offline'
  import { gameStore } from './lib/game/state'
  import { playSound } from './lib/ui/fx/audio'
  import AchievementsPanel from './lib/ui/AchievementsPanel.svelte'
  import { achievementById } from './lib/data/achievements'
  import DailyPanel from './lib/ui/DailyPanel.svelte'
  import FxLayer from './lib/ui/fx/FxLayer.svelte'
  import GoldenFirefly from './lib/ui/GoldenFirefly.svelte'
  import { registerShakeTarget } from './lib/ui/fx/shake'
  import Garden from './lib/ui/Garden.svelte'
  import Hotbar from './lib/ui/Hotbar.svelte'
  import Hud from './lib/ui/Hud.svelte'
  import InventoryPanel from './lib/ui/InventoryPanel.svelte'
  import PrestigePanel from './lib/ui/PrestigePanel.svelte'
  import QuestPanel from './lib/ui/QuestPanel.svelte'
  import Scene from './lib/ui/Scene.svelte'
  import ScratchPanel from './lib/ui/ScratchPanel.svelte'
  import SettingsPanel from './lib/ui/SettingsPanel.svelte'
  import ShopPanel from './lib/ui/ShopPanel.svelte'
  import Toasts from './lib/ui/Toasts.svelte'
  import WeatherEvents from './lib/ui/WeatherEvents.svelte'
  import { pushToast } from './lib/ui/toasts'
  import TutorialPanel from './lib/ui/TutorialPanel.svelte'
  import { formatDuration, formatNumber } from './lib/util/format'

  let { offline }: { offline: OfflineReport | null } = $props()

  let openPanel = $state<
    'inventory' | 'settings' | 'shop' | 'quests' | 'scratch' | 'prestige' | 'daily' | 'achievements' | 'tutorial' | null
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
      pushToast(`Willkommen zurück! Du warst ${formatDuration(offline.awaySeconds)} weg${summary}`, '🌅', 10000)
      playSound('welcome')
    }
  })

  // Announce freshly earned achievements (state change drives the toast).
  let knownAchievements: string[] | null = null
  $effect(() => {
    const current = $gameStore.achievements
    if (knownAchievements !== null) {
      for (const id of current) {
        if (!knownAchievements.includes(id)) {
          const def = achievementById(id)
          if (def) {
            pushToast(`Erfolg freigeschaltet: ${def.name}! (+1 % Ertrag)`, '🏆', 8000)
            playSound('levelup')
          }
        }
      }
    }
    knownAchievements = [...current]
  })

  // Announce newly unlocked plants (transition detection, not game logic).
  let knownUnlocks: string[] | null = null
  $effect(() => {
    const unlocked = PLANTS.filter((p) => $gameStore.totalEarned >= p.unlockAtTotalEarned)
    if (knownUnlocks !== null) {
      for (const plant of unlocked) {
        if (!knownUnlocks.includes(plant.id)) {
          pushToast(`Neue Pflanze freigeschaltet: ${plant.name}!`, plant.emoji, 8000)
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
  />
  <main bind:this={stageEl}>
    <Garden />
  </main>
  <Hotbar />
</div>
<GoldenFirefly />
<WeatherEvents />
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
{:else if openPanel === 'tutorial'}
  <TutorialPanel onClose={closeTutorial} />
{/if}
<Toasts />

<style>
  .app {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* keep clear of the fixed HUD (top) and hotbar (bottom) */
    padding: 84px 16px 130px;
  }

  main {
    flex: 1;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 3vh;
  }
</style>
