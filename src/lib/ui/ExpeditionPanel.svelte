<script lang="ts">
  import { EXPEDITIONS, expeditionById, isExpeditionUnlocked } from '../data/expeditions'
  import { RELICS, relicById, RARITY_COLOR } from '../data/relics'
  import { collectExpedition, sendExpedition } from '../game/actions'
  import { expeditionReady, expeditionRemainingMs, relicCount, totalRelics } from '../game/expeditions'
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

  const active = $derived($gameStore.activeExpedition)
  const activeDef = $derived(active ? expeditionById(active.id) : undefined)
  const remaining = $derived(expeditionRemainingMs($gameStore, now))
  const ready = $derived(expeditionReady($gameStore, now))
  const worlds = $derived($gameStore.worldResets ?? 0)

  let lastResult = $state<string | null>(null)

  function send(id: string) {
    if (sendExpedition(id)) {
      playSound('buy')
      lastResult = null
    }
  }

  function claim(choice: 'safe' | 'risky') {
    const r = collectExpedition(choice)
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

  {#if active && activeDef}
    <div class="active" class:ready>
      <div class="ahead">
        <span class="aemoji">{activeDef.emoji}</span>
        <span>
          <b>{activeDef.name}</b>
          <span class="asub num">{ready ? 'zurückgekehrt!' : `noch ${formatDuration(remaining / 1000)}`}</span>
        </span>
      </div>
      {#if ready}
        <div class="choices">
          <button class="pxbtn safe" onclick={() => claim('safe')}>
            🧺 Sicher
            <span class="cdesc num">garantiert 1 Relikt</span>
          </button>
          <button class="pxbtn risky" onclick={() => claim('risky')}>
            🎲 Wagnis
            <span class="cdesc num">{Math.round(activeDef.riskSuccess * 100)} % auf seltenes Relikt</span>
          </button>
        </div>
      {:else}
        <div class="progress"><span style:width="{100 - (remaining / (activeDef.durationSeconds * 1000)) * 100}%"></span></div>
        <span class="travel-hint num">🎁 Bei Rückkehr wählst du sicher/Wagnis und bekommst dein Relikt — läuft auch offline weiter.</span>
      {/if}
    </div>
  {/if}

  {#if lastResult}
    <p class="result">{lastResult}</p>
  {/if}

  <h3 class="sec">Reiseziele</h3>
  <ul class="exp-list">
    {#each EXPEDITIONS as e (e.id)}
      {@const unlocked = isExpeditionUnlocked(e, worlds)}
      {@const affordable = unlocked && $gameStore.money >= e.cost}
      <li class="row" class:locked={!unlocked} class:busy={!!active}>
        <span class="emoji">{e.emoji}</span>
        <span class="body">
          <span class="head"><b>{e.name}</b> <span class="dur num">⏱ {formatDuration(e.durationSeconds)}</span></span>
          <span class="desc">{unlocked ? e.desc : `🔒 Schaltet frei ab ${e.unlockWorlds} Welt(en) (Weltensaat)`}</span>
        </span>
        {#if !unlocked}
          <span class="lockchip num">ab {e.unlockWorlds} 🌌</span>
        {:else}
          <button class="pxbtn gold num send" disabled={!!active || !affordable} onclick={() => send(e.id)}>
            <PixelIcon name="coin" scale={1} />
            {formatNumber(e.cost)}
          </button>
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
