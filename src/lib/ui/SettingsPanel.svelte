<script lang="ts">
  import { applyOfflineProgress } from '../game/offline'
  import { exportSave, importSave, resetSave, save } from '../game/save'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { playSound, setSoundEnabled, soundEnabled } from './fx/audio'
  import Overlay from './Overlay.svelte'
  import { pushToast } from './toasts'

  let { onClose }: { onClose: () => void } = $props()

  let exportText = $state('')
  let importText = $state('')
  let message = $state('')
  let sound = $state(soundEnabled())

  function toggleSound() {
    sound = !sound
    setSoundEnabled(sound)
    if (sound) playSound('click')
  }

  function handleSaveNow() {
    save()
    message = 'Gespeichert.'
  }

  function handleExport() {
    save()
    exportText = exportSave()
    message = 'Export-Code erstellt — kopieren und sicher aufbewahren.'
  }

  async function copyExport() {
    if (!exportText) handleExport()
    try {
      await navigator.clipboard.writeText(exportText)
      message = 'Code in die Zwischenablage kopiert.'
    } catch {
      message = 'Kopieren nicht möglich — bitte den Text manuell kopieren.'
    }
  }

  function handleImport() {
    const savedAt = importSave(importText)
    if (savedAt === null) {
      message = 'Import fehlgeschlagen — Code ungültig oder beschädigt.'
      return
    }
    applyOfflineProgress(savedAt)
    save()
    pushToast('Spielstand importiert!', '📦')
    onClose()
  }

  function handleReset() {
    if (window.confirm('Wirklich den kompletten Garten zurücksetzen? Das kann nicht rückgängig gemacht werden!')) {
      resetSave()
      pushToast('Garten zurückgesetzt — auf ein Neues!', '🌱')
      onClose()
    }
  }
</script>

<Overlay title="Einstellungen" {onClose}>
  <section>
    <h3>Statistik</h3>
    <div class="stats-row num">
      <span>Gepflanzt: <b>{formatNumber($gameStore.stats.planted)}</b></span>
      <span>Geerntet: <b>{formatNumber($gameStore.stats.harvested)}</b></span>
      <span>Verkauft: <b>{formatNumber($gameStore.stats.sold)}</b></span>
    </div>
  </section>

  <section>
    <h3>Audio</h3>
    <button class="pxbtn small" onclick={toggleSound}>Sound: {sound ? 'An' : 'Aus'}</button>
    <p class="hint">Platzhalter-Klänge — richtige Sounds folgen später.</p>
  </section>

  <section>
    <h3>Spielstand</h3>
    <div class="row">
      <button class="pxbtn small" onclick={handleSaveNow}>Jetzt speichern</button>
      <button class="pxbtn small" onclick={handleExport}>Exportieren</button>
      <button class="pxbtn small" onclick={copyExport}>Kopieren</button>
    </div>
    {#if exportText}
      <textarea readonly rows="4" value={exportText} onclick={(e) => e.currentTarget.select()}></textarea>
    {/if}
  </section>

  <section>
    <h3>Import</h3>
    <textarea rows="4" placeholder="Export-Code hier einfügen …" bind:value={importText}></textarea>
    <button class="pxbtn small" disabled={!importText.trim()} onclick={handleImport}>Importieren</button>
  </section>

  <section>
    <h3>Gefahrenzone</h3>
    <button class="pxbtn small danger" onclick={handleReset}>Kompletten Spielstand löschen</button>
  </section>

  {#if message}<p class="msg">{message}</p>{/if}
</Overlay>

<style>
  section {
    margin-top: 14px;
  }

  h3 {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-mist);
    margin: 0 0 8px;
  }

  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .stats-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 0.85rem;
    color: var(--c-cloud);
  }

  .stats-row b {
    color: var(--c-leaf5);
  }

  textarea {
    width: 100%;
    min-height: 70px;
    margin: 8px 0;
    font-family: monospace;
    font-size: 0.7rem;
    border: 2px solid var(--c-edge);
    padding: 8px;
    resize: vertical;
    background: var(--c-night1);
    color: var(--c-cloud);
  }

  textarea:focus {
    outline: none;
    border-color: var(--c-leaf2);
  }

  .msg {
    font-size: 0.8rem;
    color: var(--c-leaf5);
    background: var(--c-night1);
    padding: 8px 10px;
    margin: 12px 0 0;
  }
</style>
