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
  // each vine carries a couple of leaf pairs and (on every other edge) a small
  // flower, for the lush look — all derived from the edge geometry.
  const EDGES = SKILLS.filter((d) => d.prereq).map((d, i) => {
    const a = pos(skillById(d.prereq!)!)
    const b = pos(d)
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    const leaves = [0.32, 0.6].map((t) => ({ cx: a.x + (b.x - a.x) * t, cy: a.y + (b.y - a.y) * t }))
    const flower = i % 2 === 0 ? { cx: a.x + (b.x - a.x) * 0.46, cy: a.y + (b.y - a.y) * 0.46 } : null
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: d.id, ang, leaves, flower }
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
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="vd" />
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="vm" />
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} class="vl" />
    {/each}
    {#each EDGES as e (e.key + '-a')}
      {#each e.leaves as lf}
        <ellipse cx={lf.cx} cy={lf.cy} rx="1.8" ry="0.9" class="leaf" transform="rotate({e.ang + 40} {lf.cx} {lf.cy})" />
        <ellipse cx={lf.cx} cy={lf.cy} rx="1.8" ry="0.9" class="leaf" transform="rotate({e.ang - 40} {lf.cx} {lf.cy})" />
      {/each}
      {#if e.flower}
        <circle cx={e.flower.cx} cy={e.flower.cy} r="1.5" class="fl" />
        <circle cx={e.flower.cx} cy={e.flower.cy} r="0.6" class="flc" />
      {/if}
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
    /* a soft glow behind the root makes the tree feel grown, not diagrammed */
    background: radial-gradient(circle at 50% 47%, #1d2d22 0%, #131b27 44%, var(--c-night0) 80%);
    box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.6);
  }
  .links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  /* three-layer vines (dark casing → green stem → bright core) + leaf/flower accents */
  .vd {
    stroke: #16331a;
    stroke-width: 4.6;
    stroke-linecap: round;
  }
  .vm {
    stroke: var(--c-leaf1);
    stroke-width: 2.9;
    stroke-linecap: round;
  }
  .vl {
    stroke: var(--c-leaf2);
    stroke-width: 1.2;
    stroke-linecap: round;
    opacity: 0.85;
  }
  .leaf {
    fill: var(--c-leaf2);
  }
  .fl {
    fill: #d98ab5;
  }
  .flc {
    fill: var(--c-gold2);
  }

  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 11.5%;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(#232d40, var(--c-night1));
    border: 2px solid var(--c-edge);
    cursor: pointer;
    padding: 0;
    line-height: 1;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 8px 10px rgba(255, 255, 255, 0.04);
  }
  .ico-sprite {
    width: 78%;
    height: 78%;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6));
  }
  .ico.q {
    font-size: clamp(0.8rem, 3.2vw, 1.2rem);
  }
  .lvl {
    position: absolute;
    bottom: -3px;
    right: -3px;
    font-size: 0.6rem;
    background: var(--c-night0);
    border: 1px solid var(--c-edge);
    color: var(--c-leaf4);
    padding: 0 3px;
    font-weight: 700;
  }

  /* states */
  .node.locked {
    border-color: var(--c-gold0);
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
    box-shadow: 0 0 11px 2px color-mix(in srgb, var(--c-leaf4) 47%, transparent), 0 3px 5px rgba(0, 0, 0, 0.6);
    animation: pulse 1.4s ease-in-out infinite;
  }
  .node.owned {
    border-color: var(--c-leaf4);
    box-shadow: 0 0 8px 1px color-mix(in srgb, var(--c-leaf4) 27%, transparent), 0 3px 5px rgba(0, 0, 0, 0.6),
      inset 0 0 0 1px color-mix(in srgb, var(--c-leaf4) 20%, transparent);
  }
  .node.maxed {
    border-color: var(--c-gold2);
    background: linear-gradient(#3a3320, #211a10);
    box-shadow: 0 0 13px 2px color-mix(in srgb, var(--c-gold2) 53%, transparent), 0 3px 5px rgba(0, 0, 0, 0.6);
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
