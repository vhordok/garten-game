<script lang="ts">
  import { EXPEDITIONS, expeditionById, expeditionEvent, isExpeditionUnlocked, type ExpeditionMode } from '../data/expeditions'
  import { RELICS, relicById, RARITY_COLOR } from '../data/relics'
  import { RELIC_SETS } from '../data/relicSets'
  import { CREATURES, creatureById } from '../data/creatures'
  import { collectExpedition, sendExpedition } from '../game/actions'
  import { activeExpeditionCount, companionRiskBonus, expeditionInSlot, expeditionRemainingMs, expeditionReady, expeditionSlots, isRelicSetComplete, relicCount, relicSetOwned, totalRelics } from '../game/expeditions'
  import { creatureLevel } from '../game/creatures'
  import { gameStore } from '../game/state'
  import { formatDuration, formatNumber } from '../util/format'
  import { playSound } from './fx/audio'
  import { pushToast } from './toasts'
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()

  // a 1 Hz clock so the countdown ticks live, independent of the game loop
  let now = $state(Date.now())
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(t)
  })

  const worlds = $derived($gameStore.worldResets ?? 0)
  // PHASE 91: up to two parallel slots. One view per occupied slot (depends on
  // `now` so the countdown ticks live).
  const slots = $derived(expeditionSlots($gameStore))
  const slotViews = $derived(
    [0, 1]
      .filter((i) => i < slots && expeditionInSlot($gameStore, i))
      .map((i) => {
        const run = expeditionInSlot($gameStore, i)!
        return {
          i,
          run,
          def: expeditionById(run.id),
          remaining: expeditionRemainingMs($gameStore, now, i),
          ready: expeditionReady($gameStore, now, i),
        }
      })
  )
  const busy = $derived(activeExpeditionCount($gameStore))
  const allBusy = $derived(busy >= slots)

  let lastResult = $state<string | null>(null)
  let companion = $state<string | null>(null)

  // PHASE 78: befriended creatures that may come along as a companion
  const friends = $derived(CREATURES.filter((c) => creatureLevel($gameStore, c.id) > 0))

  function send(id: string) {
    if (sendExpedition(id, companion ?? undefined)) {
      playSound('buy')
      lastResult = null
    }
  }

  function claim(choice: ExpeditionMode, slot: number) {
    const r = collectExpedition(choice, slot)
    if (!r) return
    if (r.success && r.relicId) {
      const relic = relicById(r.relicId)
      lastResult = `Gefunden: ${relic?.emoji ?? ''} ${relic?.name ?? ''}${r.copies > 1 ? ` ×${r.copies}` : ''}!`
      pushToast(lastResult, relic?.emoji ?? '🧭', 6000, { key: 'expedition' })
      playSound('legendary')
    } else {
      lastResult = 'Das Wagnis ging schief — diesmal kein Fund.'
      pushToast(lastResult, '🎲', 6000, { key: 'expedition' })
      playSound('error')
    }
  }

  // owned relics, grouped for the collection strip
  const ownedRelics = $derived(RELICS.filter((r) => relicCount($gameStore, r.id) > 0))
</script>

<Overlay title="Expeditionen — schick deinen Gärtner los" {onClose}>
  <p class="hint">
    Schick deinen Gärtner auf Reisen, die in <b>Echtzeit</b> laufen (Minuten bis Stunden) — das
    kann keine Zahl beschleunigen. Bei der Rückkehr triffst du eine Entscheidung: den
    <b>sicheren</b> Fund nehmen oder es <b>riskieren</b>. Belohnung sind <b>Relikte</b>:
    dauerhafte Boni, die jede Prestige und Weltensaat überleben.
  </p>

  {#if slots > 1}
    <p class="slotcount num">🧭 Expeditions-Slots: {busy}/{slots} belegt{busy < slots ? ' — du kannst noch losschicken' : ''}</p>
  {/if}

  {#each slotViews as sv (sv.i)}
    {#if sv.def}
      <div class="active" class:ready={sv.ready}>
        <div class="ahead">
          <span class="aemoji">{sv.def.emoji}</span>
          <span>
            <b>{sv.def.name}</b>
            <span class="asub num">{sv.ready ? 'zurückgekehrt!' : `noch ${formatDuration(sv.remaining / 1000)}`}</span>
          </span>
          {#if sv.run.companion && creatureById(sv.run.companion)}
            <span class="companion num">{creatureById(sv.run.companion)?.emoji} +{Math.round(companionRiskBonus($gameStore, sv.run.companion) * 100)} % Wagnis</span>
          {/if}
        </div>
        {#if sv.ready}
          {@const event = expeditionEvent(sv.run.endsAt)}
          {@const riskPct = Math.round((sv.def.riskSuccess + companionRiskBonus($gameStore, sv.run.companion)) * 100)}
          <p class="event-text">{event.text}</p>
          <div class="choices">
            {#each event.options as opt (opt.label)}
              <button class="pxbtn" class:risky={opt.mode === 'risky'} onclick={() => claim(opt.mode, sv.i)}>
                {opt.label}
                <span class="cdesc num">{opt.mode === 'risky' ? `${riskPct} % auf seltenes Relikt` : opt.hint}</span>
              </button>
            {/each}
          </div>
        {:else}
          <div class="progress"><span style:width="{100 - (sv.remaining / (sv.def.durationSeconds * 1000)) * 100}%"></span></div>
          <span class="travel-hint num">🎁 Bei Rückkehr triffst du eine Entscheidung und bekommst dein Relikt — läuft auch offline weiter.</span>
        {/if}
      </div>
    {/if}
  {/each}

  {#if lastResult}
    <p class="result">{lastResult}</p>
  {/if}

  {#if !allBusy && friends.length > 0}
    <h3 class="sec">Begleiter <span class="sec-note num">· optional, hebt die Wagnis-Chance</span></h3>
    <div class="companions">
      <button class="comp" class:sel={companion === null} onclick={() => (companion = null)} title="ohne Begleiter">🚫</button>
      {#each friends as c (c.id)}
        <button
          class="comp"
          class:sel={companion === c.id}
          onclick={() => (companion = c.id)}
          title="{c.name} — +{Math.round(companionRiskBonus($gameStore, c.id) * 100)} % Wagnis-Erfolg"
        >
          {c.emoji}<span class="comp-b num">+{Math.round(companionRiskBonus($gameStore, c.id) * 100)}%</span>
        </button>
      {/each}
    </div>
  {/if}

  <h3 class="sec">Reiseziele</h3>
  <ul class="exp-list">
    {#each EXPEDITIONS as e (e.id)}
      {@const unlocked = isExpeditionUnlocked(e, worlds)}
      {@const affordable = unlocked && $gameStore.money >= e.cost}
      <li class="row" class:locked={!unlocked} class:busy={allBusy}>
        <span class="emoji">{e.emoji}</span>
        <span class="body">
          <span class="head"><b>{e.name}</b> <span class="dur num">⏱ {formatDuration(e.durationSeconds)}</span></span>
          <span class="desc">{unlocked ? e.desc : `🔒 Schaltet frei ab ${e.unlockWorlds} Welt(en) (Weltensaat)`}</span>
        </span>
        {#if !unlocked}
          <span class="lockchip num">ab {e.unlockWorlds} 🌌</span>
        {:else}
          <button class="pxbtn gold num send" disabled={allBusy || !affordable} onclick={() => send(e.id)}>
            <PixelIcon name="coin" scale={1} />
            {formatNumber(e.cost)}
          </button>
        {/if}
      </li>
    {/each}
  </ul>

  <h3 class="sec">Relikt-Bünde <span class="sec-note num">· sammle je 1× für einen dauerhaften Set-Bonus</span></h3>
  <ul class="set-list">
    {#each RELIC_SETS as s (s.id)}
      {@const complete = isRelicSetComplete($gameStore, s.id)}
      {@const owned = relicSetOwned($gameStore, s.id)}
      <li class="set" class:complete>
        <span class="semoji">{s.emoji}</span>
        <span class="sbody">
          <span class="shead">
            <b>{s.name}</b>
            <span class="sprog num">{owned}/{s.members.length}</span>
          </span>
          <span class="sdesc num">{s.desc}</span>
          <span class="smembers">
            {#each s.members as mid (mid)}
              {@const m = relicById(mid)}
              <span class="chip" class:have={relicCount($gameStore, mid) > 0} title={m?.name}>{m?.emoji}</span>
            {/each}
          </span>
        </span>
        {#if complete}
          <span class="sdone num">✓ aktiv</span>
        {/if}
      </li>
    {/each}
  </ul>

  <h3 class="sec">Relikt-Sammlung <span class="sec-note num">· {totalRelics($gameStore)} gefunden</span></h3>
  {#if ownedRelics.length === 0}
    <p class="hint">Noch keine Relikte — schick eine Expedition los!</p>
  {:else}
    <ul class="relic-list">
      {#each ownedRelics as r (r.id)}
        <li class="relic" style:--rarity={RARITY_COLOR[r.rarity]}>
          <span class="remoji">{r.emoji}</span>
          <span class="rbody">
            <span class="rhead"><b>{r.name}</b> <span class="rcount num">×{relicCount($gameStore, r.id)}</span></span>
            <span class="rdesc num">{r.desc}</span>
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</Overlay>

<style>
  .hint {
    color: var(--c-mist);
    font-size: 0.8rem;
    margin: 0 0 10px;
    line-height: 1.5;
  }
  .sec {
    margin: 16px 0 8px;
    color: var(--c-leaf3);
    font-size: 0.95rem;
  }
  .sec-note {
    color: var(--c-mist);
    font-weight: 400;
  }

  .slotcount {
    font-size: 0.78rem;
    color: var(--c-gold2);
    margin: 0 0 8px;
    font-weight: 700;
  }
  .active {
    border: 2px solid var(--c-blue1);
    background: color-mix(in srgb, var(--c-blue1) 12%, var(--c-night1));
    padding: 10px 12px;
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .active.ready {
    border-color: var(--c-gold2);
    background: color-mix(in srgb, var(--c-gold2) 14%, var(--c-night1));
  }
  .ahead {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .companion {
    margin-left: auto;
    color: var(--c-gold2);
    font-size: 0.74rem;
    white-space: nowrap;
  }
  .companions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 4px;
  }
  .comp {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--c-night1);
    border: 2px solid transparent;
    cursor: pointer;
    padding: 4px 6px;
    font-size: 1.1rem;
    line-height: 1.1;
    color: var(--c-cloud);
  }
  .comp.sel {
    border-color: var(--c-gold2);
    background: color-mix(in srgb, var(--c-gold2) 14%, var(--c-night1));
  }
  .comp-b {
    font-size: 0.6rem;
    color: var(--c-mist);
  }
  .aemoji {
    font-size: 1.6rem;
  }
  .asub {
    display: block;
    color: var(--c-mist);
    font-size: 0.78rem;
  }
  .progress {
    height: 7px;
    background: var(--c-night0);
    overflow: hidden;
  }
  .progress span {
    display: block;
    height: 100%;
    background: var(--c-blue1);
  }
  .travel-hint {
    display: block;
    font-size: 0.72rem;
    color: var(--c-mist);
    margin-top: 6px;
  }
  .event-text {
    margin: 2px 0 8px;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--c-cloud);
  }
  .choices {
    display: flex;
    gap: 8px;
  }
  .choices .pxbtn {
    flex: 1;
    flex-direction: column;
    padding: 6px;
    line-height: 1.3;
  }
  .choices .risky {
    color: var(--c-gold2);
  }
  .cdesc {
    display: block;
    font-size: 0.66rem;
    color: var(--c-mist);
    font-weight: 400;
  }
  .result {
    text-align: center;
    font-weight: 700;
    margin: 4px 0 10px;
    color: var(--c-gold2);
  }

  .exp-list,
  .relic-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .row.locked {
    opacity: 0.7;
  }
  .row.busy:not(.locked) {
    opacity: 0.85;
  }
  .emoji {
    font-size: 1.5rem;
    flex: none;
    width: 32px;
    text-align: center;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .dur {
    color: var(--c-mist);
    font-size: 0.72rem;
  }
  .desc {
    color: var(--c-mist);
    font-size: 0.74rem;
  }
  .send {
    flex: none;
  }
  .lockchip {
    flex: none;
    color: var(--c-plum2);
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .set-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .set {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: var(--c-night1);
    border: 1px solid var(--c-edge);
    border-left: 3px solid var(--c-steel);
    opacity: 0.85;
  }
  .set.complete {
    border-left-color: var(--c-gold2);
    background: color-mix(in srgb, var(--c-gold2) 12%, var(--c-night1));
    opacity: 1;
  }
  .semoji {
    font-size: 1.5rem;
    flex: none;
    width: 30px;
    text-align: center;
  }
  .sbody {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .shead {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--c-white);
    font-size: 0.86rem;
  }
  .sprog {
    color: var(--c-leaf4);
    font-size: 0.72rem;
  }
  .sdesc {
    color: var(--c-mist);
    font-size: 0.72rem;
  }
  .smembers {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }
  .chip {
    font-size: 0.9rem;
    filter: grayscale(1);
    opacity: 0.4;
  }
  .chip.have {
    filter: none;
    opacity: 1;
  }
  .sdone {
    flex: none;
    color: var(--c-gold2);
    font-weight: 700;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .relic {
    display: flex;
    align-items: center;
    gap: 10px;
    border-left: 3px solid var(--rarity);
    padding-left: 8px;
  }
  .remoji {
    font-size: 1.3rem;
  }
  .rbody {
    display: flex;
    flex-direction: column;
  }
  .rcount {
    color: var(--c-gold2);
  }
  .rdesc {
    color: var(--c-mist);
    font-size: 0.72rem;
  }
</style>
