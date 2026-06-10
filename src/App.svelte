<script lang="ts">
  import { onMount } from 'svelte'
  import { PLANTS } from './lib/data/plants'
  import type { OfflineReport } from './lib/game/offline'
  import { gameStore } from './lib/game/state'
  import Garden from './lib/ui/Garden.svelte'
  import Header from './lib/ui/Header.svelte'
  import InventoryPanel from './lib/ui/InventoryPanel.svelte'
  import SeedPanel from './lib/ui/SeedPanel.svelte'
  import SettingsPanel from './lib/ui/SettingsPanel.svelte'
  import Toasts from './lib/ui/Toasts.svelte'
  import { pushToast } from './lib/ui/toasts'
  import { formatDuration } from './lib/util/format'

  let { offline }: { offline: OfflineReport | null } = $props()

  let settingsOpen = $state(false)

  onMount(() => {
    if (offline && offline.awaySeconds >= 60) {
      const grown =
        offline.ripened > 0
          ? ` — ${offline.ripened} ${offline.ripened === 1 ? 'Pflanze ist' : 'Pflanzen sind'} reif geworden!`
          : '.'
      pushToast(`Willkommen zurück! Du warst ${formatDuration(offline.awaySeconds)} weg${grown}`, '🌅', 9000)
    }
  })

  // Announce newly unlocked plants (transition detection, not game logic).
  let knownUnlocks: string[] | null = null
  $effect(() => {
    const unlocked = PLANTS.filter((p) => $gameStore.totalEarned >= p.unlockAtTotalEarned)
    if (knownUnlocks !== null) {
      for (const plant of unlocked) {
        if (!knownUnlocks.includes(plant.id)) {
          pushToast(`Neue Pflanze freigeschaltet: ${plant.name}!`, plant.emoji, 8000)
        }
      }
    }
    knownUnlocks = unlocked.map((p) => p.id)
  })
</script>

<div class="app">
  <Header onOpenSettings={() => (settingsOpen = true)} />
  <main>
    <section class="garden-col">
      <Garden />
    </section>
    <aside class="side-col">
      <SeedPanel />
      <InventoryPanel />
    </aside>
  </main>
  <footer>🌱 Phase 1 · Dein Garten wird automatisch gespeichert — auch wenn du weg bist, wächst alles weiter.</footer>
</div>

{#if settingsOpen}
  <SettingsPanel onClose={() => (settingsOpen = false)} />
{/if}
<Toasts />

<style>
  .app {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px 32px;
  }

  main {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-top: 20px;
  }

  .garden-col {
    flex: 1 1 60%;
    min-width: 0;
  }

  .side-col {
    flex: 1 1 40%;
    min-width: 280px;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  footer {
    margin-top: 28px;
    text-align: center;
    color: var(--muted);
    font-size: 0.8rem;
  }

  @media (max-width: 840px) {
    main {
      flex-direction: column;
    }

    .side-col {
      max-width: none;
      width: 100%;
    }
  }
</style>
