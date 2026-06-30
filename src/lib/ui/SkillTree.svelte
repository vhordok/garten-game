<script lang="ts">
  // PHASE 81: a VISUAL skill tree — the prereq graph (root + 6 branches) drawn as
  // nodes radiating from the centre, joined by vine connectors, like a classic
  // talent tree. Owned nodes glow, the next affordable ones pulse green, locked
  // ones show a "?". Click a node to inspect + buy. Reuses the existing skill
  // logic (skillStatus / buySkill / buySkillMax); no new game state.
  import { SKILLS, skillById, BRANCH_LABEL, type SkillDef } from '../data/skills'
  import { buySkill, buySkillMax } from '../game/actions'
  import { skillLevel, skillStatus } from '../game/skills'
  import { gameStore } from '../game/state'
  import { playSound } from './fx/audio'
  import { spriteUrl } from './pixel/render'

  // a distinct pixel-plant sprite per node, matching the game's art (like the
  // mockup). Decorative — the detail card carries the actual meaning.
  const SPRITE: Record<string, string> = {
    gartenplanung: 'eiche-3',
    erntefokus: 'erdbeere-3',
    ueppige_ernte: 'kuerbis-3',
    ahnenwissen: 'galaxieorchidee-3',
    haendlerblick: 'drachenfrucht-3',
    grosshandel: 'kometbeere-3',
    marktimperium: 'aeonenkern-3',
    schaugarten: 'feuerlilie-3',
    parkanlage: 'hortensie-3',
    zierkrone: 'ewigrose-3',
    tiefwurzel: 'goldahorn-3',
    kompostmeister: 'glyzinie-3',
    gluecksklee: 'himbeere-3',
    gluecksrausch: 'kristallbeere-3',
    saatgutforschung: 'kosmoshanf-3',
  }

  // each branch radiates at a fixed angle; chain depth = distance from the root
  // the three LONG branches (ernte/markt/zier, depth 3) sit 120° apart so the
  // tree spreads evenly; the shorter branches fill the gaps between them.
  const ANGLE: Record<SkillDef['branch'], number> = {
    wurzel: 0,
    ernte: -90, // up
    kompost: -30, // upper-right (depth 2)
    markt: 30, // lower-right
    glueck: 90, // down (depth 2)
    zier: 150, // lower-left
    labor: 210, // upper-left (depth 1)
  }
  const RING = 15 // % radius per depth step
  const CX = 50
  const CY = 50

  function depth(id: string): number {
    let d = 0
    let cur = skillById(id)
    while (cur && cur.prereq) {
      d++
      cur = skillById(cur.prereq)
    }
    return d
  }
  function pos(def: SkillDef): { x: number; y: number } {
    if (!def.prereq) return { x: CX, y: CY }
    const a = (ANGLE[def.branch] * Math.PI) / 180
    const r = depth(def.id) * RING
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
  }

  const NODES = SKILLS.map((def) => ({ def, ...pos(def) }))
  const EDGES = SKILLS.filter((d) => d.prereq).map((d) => {
    const a = pos(skillById(d.prereq!)!)
    const b = pos(d)
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: d.id }
  })

  let selected = $state<string | null>('gartenplanung')
  const selDef = $derived(selected ? skillById(selected) : undefined)
  const selStatus = $derived(selected ? skillStatus($gameStore, selected) : null)

  function nodeClass(id: string): string {
    const st = skillStatus($gameStore, id)
    if (!st) return ''
    if (st.maxed) return 'maxed'
    if (st.level > 0) return 'owned'
    if (st.canBuy) return 'avail'
    if (st.prereqMet) return 'ready' // next, but can't afford
    return 'locked'
  }

  function buy(id: string) {
    if (buySkill(id)) playSound('buy')
    else playSound('error')
  }
  function buyMax(id: string) {
    if (buySkillMax(id) > 0) playSound('buy')
    else playSound('error')
  }
</script>

<div class="tree">
  <svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {#each EDGES as e (e.key)}
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="vine-bg" />
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="vine-fg" />
    {/each}
  </svg>
  {#each NODES as n (n.def.id)}
    {@const lvl = skillLevel($gameStore, n.def.id)}
    <button
      class="node {nodeClass(n.def.id)}"
      class:sel={selected === n.def.id}
      style:left="{n.x}%"
      style:top="{n.y}%"
      title={n.def.name}
      onclick={() => (selected = n.def.id)}
    >
      {#if nodeClass(n.def.id) === 'locked'}
        <span class="ico q">?</span>
      {:else}
        <img class="ico-sprite" src={spriteUrl(SPRITE[n.def.id])} alt="" />
      {/if}
      {#if lvl > 0}<span class="lvl num">{lvl}{n.def.maxLevel > 1 ? `/${n.def.maxLevel}` : ''}</span>{/if}
    </button>
  {/each}
</div>

{#if selDef && selStatus}
  <div class="detail" class:lockd={!selStatus.prereqMet}>
    <div class="d-head">
      {#if !selStatus.prereqMet}
        <span class="d-ico">🔒</span>
      {:else}
        <img class="d-sprite" src={spriteUrl(SPRITE[selDef.id])} alt="" />
      {/if}
      <span>
        <b>{selDef.name}</b>
        <span class="d-branch num">{BRANCH_LABEL[selDef.branch]} · Stufe {selStatus.level}{selDef.maxLevel > 1 ? `/${selDef.maxLevel}` : ''}</span>
      </span>
    </div>
    <p class="d-desc">{selDef.desc}</p>
    {#if !selStatus.prereqMet}
      <p class="d-need num">🔒 Erst <b>{skillById(selDef.prereq ?? '')?.name}</b> freischalten.</p>
    {:else if selStatus.maxed}
      <p class="d-maxed num">✓ Voll ausgebaut</p>
    {:else}
      <div class="d-buy">
        <button class="pxbtn leaf num" disabled={!selStatus.canBuy} onclick={() => buy(selDef.id)}>
          Lernen · {selStatus.cost} ⭐
        </button>
        {#if selDef.maxLevel > 1}
          <button class="pxbtn num" disabled={!selStatus.canBuy} onclick={() => buyMax(selDef.id)}>MAX</button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .tree {
    position: relative;
    width: 100%;
    max-width: 560px;
    margin: 6px auto 0;
    aspect-ratio: 1;
  }
  .links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  /* bolder, clearly-visible vines (the backbone of the tree) */
  .vine-bg {
    stroke: var(--c-leaf1);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .vine-fg {
    stroke: var(--c-leaf4);
    stroke-width: 1.3;
    stroke-linecap: round;
  }

  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 10%;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--c-night1);
    border: 2px solid var(--c-edge);
    cursor: pointer;
    padding: 0;
    line-height: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  .ico-sprite {
    width: 78%;
    height: 78%;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .ico.q {
    font-size: clamp(0.7rem, 3vw, 1.1rem);
  }
  .lvl {
    position: absolute;
    bottom: -2px;
    right: -2px;
    font-size: 0.6rem;
    background: var(--c-night0);
    color: var(--c-leaf4);
    padding: 0 2px;
  }

  /* states */
  .node.locked {
    border-color: var(--c-gold0);
    opacity: 0.85;
  }
  .node.locked .ico {
    color: var(--c-gold2);
    font-weight: 700;
  }
  .node.ready {
    border-color: var(--c-mist);
  }
  .node.avail {
    border-color: var(--c-leaf4);
    box-shadow: 0 0 9px 1px color-mix(in srgb, var(--c-leaf4) 70%, transparent);
    animation: pulse 1.4s ease-in-out infinite;
  }
  .node.owned {
    border-color: var(--c-leaf4);
    background: color-mix(in srgb, var(--c-leaf2) 30%, var(--c-night1));
  }
  .node.maxed {
    border-color: var(--c-gold2);
    background: color-mix(in srgb, var(--c-gold1) 30%, var(--c-night1));
  }
  .node.sel {
    outline: 2px solid var(--c-cloud);
    outline-offset: 1px;
    z-index: 2;
  }
  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 8px 1px color-mix(in srgb, var(--c-leaf4) 55%, transparent);
    }
    50% {
      box-shadow: 0 0 13px 3px color-mix(in srgb, var(--c-leaf4) 85%, transparent);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .node.avail {
      animation: none;
    }
  }

  /* detail card */
  .detail {
    margin: 12px auto 0;
    max-width: 520px;
    border: 2px solid var(--c-leaf3);
    background: var(--c-night1);
    padding: 10px 12px;
  }
  .detail.lockd {
    border-color: var(--c-gold0);
  }
  .d-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .d-ico {
    font-size: 1.5rem;
  }
  .d-sprite {
    width: 34px;
    height: 34px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .d-branch {
    display: block;
    color: var(--c-mist);
    font-size: 0.74rem;
  }
  .d-desc {
    color: var(--c-cloud);
    font-size: 0.84rem;
    margin: 8px 0;
  }
  .d-need {
    color: var(--c-gold2);
    font-size: 0.8rem;
    margin: 4px 0 0;
  }
  .d-maxed {
    color: var(--c-gold2);
    font-weight: 700;
    margin: 4px 0 0;
  }
  .d-buy {
    display: flex;
    gap: 8px;
  }
</style>
