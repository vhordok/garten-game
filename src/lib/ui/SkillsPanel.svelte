<script lang="ts">
  import { CONFIG } from '../data/config'
  import { BRANCH_LABEL, skillById, SKILLS, type SkillDef } from '../data/skills'
  import { buySkill } from '../game/actions'
  import { availableSkillPoints, skillStatus, totalSkillPoints } from '../game/skills'
  import { gameStore } from '../game/state'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const available = $derived(availableSkillPoints($gameStore))
  const total = $derived(totalSkillPoints($gameStore))

  const BRANCHES: SkillDef['branch'][] = ['wurzel', 'ernte', 'markt', 'zier', 'kompost']

  function handleBuy(e: MouseEvent, id: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (buySkill(id)) {
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12)
      playSound('buy')
    } else {
      playSound('error')
    }
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
  </div>

  {#each BRANCHES as branch (branch)}
    {@const list = SKILLS.filter((s) => s.branch === branch)}
    <h3 class="branch">{BRANCH_LABEL[branch]}</h3>
    <ul class="skill-list">
      {#each list as skill (skill.id)}
        {@const st = skillStatus($gameStore, skill.id) ?? { level: 0, maxed: false, prereqMet: false, affordable: false, canBuy: false, cost: skill.cost }}
        {@const prereq = skill.prereq ? skillById(skill.prereq) : null}
        <li class="skill" class:owned={st.level > 0} class:locked={!st.prereqMet}>
          <span class="s-body">
            <span class="s-head">
              <b>{skill.name}</b>
              <span class="s-lvl num">Stufe {st.level}/{skill.maxLevel}</span>
            </span>
            <span class="s-desc">{skill.desc}</span>
            {#if !st.prereqMet && prereq}
              <span class="s-req num">braucht zuerst „{prereq.name}"</span>
            {/if}
          </span>
          {#if st.maxed}
            <span class="s-max">MAX</span>
          {:else}
            <button class="pxbtn small num" disabled={!st.canBuy} onclick={(e) => handleBuy(e, skill.id)}>
              ✦ {st.cost}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/each}
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
  }

  .pts-badge {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 5px;
    background: var(--c-plum1);
    color: var(--c-white);
    font-weight: 700;
  }

  .branch {
    margin: 12px 0 6px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-gold2);
  }

  .skill-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .skill {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 7px 9px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    border-left: 3px solid var(--c-steel);
  }

  .skill.owned {
    border-left-color: var(--c-plum2);
  }

  .skill.locked {
    opacity: 0.55;
  }

  .s-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .s-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--c-white);
  }

  .s-lvl {
    font-size: 0.7rem;
    color: var(--c-mist);
  }

  .s-desc {
    font-size: 0.74rem;
    color: var(--c-cloud);
    line-height: 1.35;
  }

  .s-req {
    font-size: 0.7rem;
    color: var(--c-gold2);
  }

  .s-max {
    flex: none;
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--c-plum3);
  }

  .pxbtn.small {
    flex: none;
  }
</style>
