<script lang="ts">
  import { PLANTS } from '../data/plants'
  import { RARITY_ORDER, VARIANTS, type VariantDef, type VariantEffect } from '../data/variants'
  import { crossPlants, isPlantUnlocked } from '../game/actions'
  import { crossEligibility, effectiveGoldCost, isDiscovered, produceStatus, recipeHint } from '../game/seedlab'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { coinBurst } from './fx/particles'
  import { pushToast } from './toasts'
  import Overlay from './Overlay.svelte'

  let { onClose }: { onClose: () => void } = $props()

  let slotA = $state('')
  let slotB = $state('')

  const EFFECT_LABEL: Record<VariantEffect, string> = {
    yield: 'Ertrag',
    growth: 'Wachstum',
    questReward: 'Aufträge',
    ticketLuck: 'Lose',
    compostGain: 'Kompost',
    beauty: 'Schönheit',
    mastery: 'Meisterschaft',
    passive: 'Passiv/Offline',
  }

  function effectText(v: VariantDef): string {
    const val = v.effect === 'ticketLuck' ? `+${v.value.toFixed(2)}/Min` : `+${Math.round(v.value * 100)} %`
    return `${EFFECT_LABEL[v.effect]} ${val}`
  }

  const unlockedParents = $derived(PLANTS.filter((p) => isPlantUnlocked(p, $gameStore)))
  const discoveredCount = $derived($gameStore.discoveredVariants.length)
  const result = $derived(crossEligibility($gameStore, slotA, slotB))

  function handleCross(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const out = crossPlants(slotA, slotB)
    if (out.ok && out.variantId) {
      const v = VARIANTS.find((x) => x.id === out.variantId)
      coinBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 18)
      playSound('levelup')
      pushToast(`Neue Variante entdeckt: ${v?.emoji} ${v?.name}! (${v?.rarity})`, '🧬', 9000)
    } else {
      playSound('error')
    }
  }

  const sorted = $derived([...VARIANTS].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]))
</script>

<Overlay title="Saatlabor — Pflanzen kreuzen & sammeln" {onClose}>
  <p class="hint">
    Wähle zwei freigeschaltete Elternpflanzen und entdecke eine <b>Variante</b> mit eigenem Dauerbonus.
    Entdeckungen bleiben für immer (auch über Prestige). <b>{discoveredCount}/{VARIANTS.length}</b> gesammelt.
  </p>

  <div class="lab">
    <select class="slot num" bind:value={slotA} aria-label="Elternpflanze 1">
      <option value="">Elternpflanze 1…</option>
      {#each unlockedParents as p (p.id)}
        <option value={p.id}>{p.emoji} {p.name}</option>
      {/each}
    </select>
    <span class="plus">+</span>
    <select class="slot num" bind:value={slotB} aria-label="Elternpflanze 2">
      <option value="">Elternpflanze 2…</option>
      {#each unlockedParents as p (p.id)}
        <option value={p.id}>{p.emoji} {p.name}</option>
      {/each}
    </select>
  </div>

  <div class="outcome" class:ready={result.status === 'ok'}>
    {#if result.variant && result.status !== 'nomatch'}
      <span class="o-line">
        <b>{result.variant.emoji} {result.variant.name}</b>
        <span class="rar" data-r={result.variant.rarity}>{result.variant.rarity}</span>
      </span>
      <span class="o-eff num">{effectText(result.variant)} · {result.variant.role}</span>
      {@const gold = effectiveGoldCost($gameStore, result.variant)}
      <span class="o-cost num">
        Kosten: <span class:short={$gameStore.money < gold}>💰 {formatNumber(gold)}</span>
        {#if result.variant.compostCost > 0}· <span class:short={$gameStore.compost < result.variant.compostCost}>🌱 {result.variant.compostCost}</span>{/if}
      </span>
      {#each produceStatus($gameStore, result.variant) as line (line.plantId)}
        <span class="o-prod num" class:short={!line.ok}>
          📦 {line.name}: frei {line.free}/{line.need}{line.have > line.free ? ` (${line.have} im Lager, Aufträge reserviert)` : ''}
        </span>
      {/each}
      <span class="o-reason" class:ok={result.status === 'ok'}>{result.reason}</span>
    {:else}
      <span class="o-reason">{result.reason}</span>
    {/if}
  </div>

  <button class="pxbtn gold full num" disabled={result.status !== 'ok'} onclick={handleCross}>🧬 Kreuzen</button>

  <h3 class="section">Sammlung</h3>
  <ul class="lex">
    {#each sorted as v (v.id)}
      {@const found = isDiscovered($gameStore, v.id)}
      <li class="lex-row" class:found>
        <span class="lex-icon">{found ? v.emoji : '❔'}</span>
        <span class="lex-body">
          <span class="lex-head">
            <b>{found ? v.name : '???'}</b>
            <span class="rar" data-r={v.rarity}>{v.rarity}</span>
          </span>
          <span class="lex-desc num">
            {#if found}{effectText(v)} · {v.role}{:else}Hinweis: {recipeHint(v)} · {EFFECT_LABEL[v.effect]}{#if v.produceCost}· braucht Produkte{/if}{/if}
          </span>
        </span>
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .hint {
    font-size: 0.78rem;
    color: var(--c-cloud);
    line-height: 1.4;
    margin: 2px 0 8px;
  }

  .lab {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slot {
    flex: 1;
    min-width: 0;
    padding: 8px 6px;
    background: var(--c-night1);
    color: var(--c-white);
    border: 1px solid var(--c-edge);
    font-size: 0.82rem;
  }

  .plus {
    flex: none;
    font-weight: 700;
    color: var(--c-gold2);
  }

  .outcome {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 8px 0;
    padding: 8px 10px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    border-left: 3px solid var(--c-steel);
  }

  .outcome.ready {
    border-left-color: var(--c-leaf4);
  }

  .o-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.86rem;
    color: var(--c-white);
  }

  .o-eff {
    font-size: 0.74rem;
    color: var(--c-leaf4);
  }

  .o-cost {
    font-size: 0.74rem;
    color: var(--c-mist);
  }

  .o-cost .short {
    color: var(--c-rose, #e06c75);
  }

  .o-prod {
    font-size: 0.72rem;
    color: var(--c-cloud);
  }

  .o-prod.short {
    color: var(--c-rose, #e06c75);
  }

  .o-reason {
    font-size: 0.72rem;
    color: var(--c-gold2);
  }

  .o-reason.ok {
    color: var(--c-leaf4);
  }

  .section {
    margin: 14px 0 6px;
    font-size: 0.8rem;
    color: var(--c-gold2);
  }

  .lex {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .lex-row {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 6px 9px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    opacity: 0.6;
  }

  .lex-row.found {
    opacity: 1;
    border-left: 3px solid var(--c-leaf4);
  }

  .lex-icon {
    font-size: 1.2rem;
    flex: none;
  }

  .lex-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .lex-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--c-white);
  }

  .lex-desc {
    font-size: 0.7rem;
    color: var(--c-mist);
    line-height: 1.3;
  }

  .rar {
    flex: none;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 0 5px;
    border-radius: 4px;
    background: var(--c-edge);
    color: var(--c-cloud);
  }

  .rar[data-r='Gold'] {
    background: var(--c-gold1);
    color: var(--c-night1);
  }

  .rar[data-r='Platin'] {
    background: var(--c-blue2);
    color: var(--c-night1);
  }

  .rar[data-r='Legendär'] {
    background: var(--c-plum2);
    color: var(--c-white);
  }
</style>
