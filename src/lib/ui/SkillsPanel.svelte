<script lang="ts">
  import { CONFIG } from '../data/config'
  import { respecSkills } from '../game/actions'
  import { availableSkillPoints, totalSkillPoints } from '../game/skills'
  import { gameStore } from '../game/state'
  import { playSound } from './fx/audio'
  import Overlay from './Overlay.svelte'
  import SkillTree from './SkillTree.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const available = $derived(availableSkillPoints($gameStore))
  const total = $derived(totalSkillPoints($gameStore))

  const hasSkills = $derived(Object.keys($gameStore.skills).length > 0)
  const canRespec = $derived(hasSkills && $gameStore.compost >= CONFIG.skillRespecCompost)

  function handleRespec() {
    if (respecSkills()) playSound('sell')
    else playSound('error')
  }
</script>

<Overlay title="Fähigkeiten — dein langfristiger Build" {onClose}>
  <p class="hint">
    Skillpunkte kommen aus <b>Fortschritt</b>, nicht aus Gold: 1 pro Parzelle, 1 pro Erfolg, 1 je
    {CONFIG.skillPointPerLevels} Gärtner-Level. Du kannst nicht alles maxen — <b>wähle deinen Pfad</b>.
    Übersteht Prestige.
  </p>
  <div class="points num">
    <span class="pts-badge">{available}</span> frei · {total} insgesamt verdient
    {#if hasSkills}
      <button class="pxbtn small respec num" disabled={!canRespec} onclick={handleRespec} title="Alle Skills zurücksetzen — Punkte werden frei">
        ↺ Respec 🌱 {CONFIG.skillRespecCompost}
      </button>
    {/if}
  </div>

  <SkillTree />

  <p class="legend num">
    <span class="lg owned">●</span> gelernt · <span class="lg avail">●</span> lernbar ·
    <span class="lg ready">●</span> nächster · <span class="lg locked">?</span> gesperrt ·
    <span class="lg maxed">●</span> MAX
  </p>
</Overlay>

<style>
  .hint {
    font-size: 0.78rem;
    color: var(--c-cloud);
    line-height: 1.4;
    margin: 2px 0 8px;
  }

  .points {
    font-size: 0.8rem;
    color: var(--c-mist);
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .respec {
    margin-left: auto;
  }

  .pts-badge {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 5px;
    background: var(--c-plum1);
    color: var(--c-white);
    font-weight: 700;
  }

  .pxbtn.small {
    flex: none;
  }

  /* PHASE 81: legend for the visual tree node states */
  .legend {
    margin: 10px 0 0;
    font-size: 0.72rem;
    color: var(--c-mist);
    text-align: center;
    line-height: 1.6;
  }
  .lg {
    font-weight: 700;
  }
  .lg.owned {
    color: var(--c-leaf4);
  }
  .lg.avail {
    color: var(--c-leaf4);
    text-shadow: 0 0 6px var(--c-leaf4);
  }
  .lg.ready {
    color: var(--c-mist);
  }
  .lg.locked {
    color: var(--c-gold2);
  }
  .lg.maxed {
    color: var(--c-gold2);
  }
</style>
