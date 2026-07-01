<script lang="ts">
  import { CONFIG } from '../data/config'
  import { BRANCH_LABEL, SKILLS, skillById, type SkillDef } from '../data/skills'
  import { buySkill, buySkillMax, respecSkills } from '../game/actions'
  import { availableSkillPoints, skillLevel, skillStatus, totalSkillPoints } from '../game/skills'
  import { gameStore } from '../game/state'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import { spriteUrl } from './pixel/render'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  const available = $derived(availableSkillPoints($gameStore))
  const total = $derived(totalSkillPoints($gameStore))
  const hasSkills = $derived(Object.keys($gameStore.skills).length > 0)
  const canRespec = $derived(hasSkills && $gameStore.compost >= CONFIG.skillRespecCompost)

  // a fitting pixel-plant sprite per node (named ones + an effect fallback)
  const SPRITE: Record<string, string> = {
    gartenplanung: 'eiche-3', erntefokus: 'erdbeere-3', ueppige_ernte: 'kuerbis-3', ahnenwissen: 'galaxieorchidee-3',
    haendlerblick: 'drachenfrucht-3', grosshandel: 'kometbeere-3', marktimperium: 'aeonenkern-3',
    schaugarten: 'feuerlilie-3', parkanlage: 'hortensie-3', zierkrone: 'ewigrose-3',
    tiefwurzel: 'goldahorn-3', kompostmeister: 'glyzinie-3', gluecksklee: 'himbeere-3',
    gluecksrausch: 'kristallbeere-3', saatgutforschung: 'kosmoshanf-3',
  }
  const SPRITE_BY_EFFECT: Record<string, string> = {
    yield: 'erdbeere-3', crit: 'kometbeere-3', growth: 'kosmoshanf-3', beauty: 'feuerlilie-3',
    questReward: 'drachenfrucht-3', sellPrice: 'aeonenkern-3', compostGain: 'glyzinie-3',
    offline: 'goldahorn-3', scratchLuck: 'himbeere-3', crossDiscount: 'galaxieorchidee-3',
  }
  const iconFor = (def: SkillDef) => SPRITE[def.id] ?? SPRITE_BY_EFFECT[def.effect] ?? 'erdbeere-3'

  // group skills by branch, ordered as a depth-first walk of each subtree so the
  // chains + splits read top-to-bottom; indent by depth so the structure shows.
  const KIDS = new Map<string, SkillDef[]>()
  for (const s of SKILLS) {
    if (s.prereq) {
      if (!KIDS.has(s.prereq)) KIDS.set(s.prereq, [])
      KIDS.get(s.prereq)!.push(s)
    }
  }
  const ROOT = SKILLS.find((s) => !s.prereq)!
  function walk(def: SkillDef, d: number, out: { def: SkillDef; d: number }[]) {
    out.push({ def, d })
    for (const c of KIDS.get(def.id) ?? []) walk(c, d + 1, out)
  }
  const BRANCHES: SkillDef['branch'][] = ['ernte', 'markt', 'zier', 'kompost', 'glueck', 'labor']
  const GROUPS = [
    { label: BRANCH_LABEL.wurzel, rows: [{ def: ROOT, d: 0 }] },
    ...BRANCHES.map((b) => {
      const head = (KIDS.get(ROOT.id) ?? []).find((c) => c.branch === b)
      const rows: { def: SkillDef; d: number }[] = []
      if (head) walk(head, 0, rows)
      return { label: BRANCH_LABEL[b], rows }
    }),
  ]

  function handleBuy(e: MouseEvent, id: string, max = false) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const ok = max ? buySkillMax(id) > 0 : buySkill(id)
    if (ok) {
      coinBurst(r.left + r.width / 2, r.top + r.height / 2, max ? 16 : 12)
      playSound('buy')
    } else playSound('error')
  }
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

  {#each GROUPS as group (group.label)}
    <h3 class="branch">{group.label}</h3>
    <ul class="skill-list">
      {#each group.rows as { def, d } (def.id)}
        {@const st = skillStatus($gameStore, def.id) ?? { level: 0, maxed: false, prereqMet: false, affordable: false, canBuy: false, cost: def.cost }}
        {@const lvl = skillLevel($gameStore, def.id)}
        <li class="skill" class:owned={lvl > 0} class:maxed={st.maxed} class:locked={!st.prereqMet} style:--ind="{Math.min(d, 5)}">
          <span class="branchline" aria-hidden="true"></span>
          <img class="ico" src={spriteUrl(iconFor(def))} alt="" />
          <span class="body">
            <span class="head">
              <b>{def.name}</b>
              <span class="lvl num">{lvl}/{def.maxLevel > 99 ? '∞' : def.maxLevel}</span>
            </span>
            <span class="desc">{def.desc}</span>
            {#if !st.prereqMet}
              <span class="req num">🔒 braucht zuerst „{skillById(def.prereq ?? '')?.name}"</span>
            {/if}
          </span>
          {#if st.maxed}
            <span class="state max num">MAX</span>
          {:else if !st.prereqMet}
            <span class="state lock num">gesperrt</span>
          {:else}
            <span class="buy">
              <button class="pxbtn small num" disabled={!st.canBuy} onclick={(e) => handleBuy(e, def.id)}>✦ {st.cost}</button>
              {#if def.maxLevel > 50}
                <button class="pxbtn small num" disabled={!st.canBuy} onclick={(e) => handleBuy(e, def.id, true)} title="So viele Stufen wie Punkte reichen">MAX</button>
              {/if}
            </span>
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
  }

  .branch {
    margin: 14px 0 6px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-gold2);
    border-bottom: 1px solid var(--c-edge);
    padding-bottom: 3px;
  }
  .skill-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .skill {
    display: flex;
    gap: 9px;
    align-items: center;
    padding: 6px 9px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    border-left: 3px solid var(--c-steel);
    /* indent by depth so the branching structure stays readable */
    margin-left: calc(var(--ind) * 16px);
    position: relative;
  }
  .branchline {
    position: absolute;
    left: -10px;
    top: 50%;
    width: 9px;
    height: 2px;
    background: var(--c-leaf2);
    opacity: 0.6;
  }
  .skill[style*='--ind:0'] .branchline {
    display: none;
  }
  .skill.owned {
    border-left-color: var(--c-leaf4);
  }
  .skill.maxed {
    border-left-color: var(--c-gold2);
  }
  .skill.locked {
    opacity: 0.6;
  }
  .ico {
    flex: none;
    width: 30px;
    height: 30px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.86rem;
    color: var(--c-white);
  }
  .lvl {
    font-size: 0.7rem;
    color: var(--c-leaf4);
  }
  .desc {
    font-size: 0.74rem;
    color: var(--c-cloud);
    line-height: 1.3;
  }
  .req {
    font-size: 0.7rem;
    color: var(--c-gold2);
  }
  .state {
    flex: none;
    font-weight: 700;
    font-size: 0.78rem;
  }
  .state.max {
    color: var(--c-gold2);
  }
  .state.lock {
    color: var(--c-mist);
    font-weight: 400;
  }
  .buy {
    flex: none;
    display: flex;
    gap: 4px;
  }
  .pxbtn.small {
    flex: none;
  }
</style>
