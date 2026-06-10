<script lang="ts">
  import { applyOfflineProgress } from '../game/offline'
  import { exportSave, importSave, resetSave, save } from '../game/save'
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'
  import { pushToast } from './toasts'

  let { onClose }: { onClose: () => void } = $props()

  let exportText = $state('')
  let importText = $state('')
  let message = $state('')

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

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') onClose()
  }}
/>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Einstellungen">
  <div class="modal card">
    <button class="close" onclick={onClose} aria-label="Schließen">✕</button>
    <h2>⚙️ Einstellungen</h2>

    <section>
      <h3>Statistik</h3>
      <div class="stats-row">
        <span>🌱 Gepflanzt: <b>{formatNumber($gameStore.stats.planted)}</b></span>
        <span>🧺 Geerntet: <b>{formatNumber($gameStore.stats.harvested)}</b></span>
        <span>💰 Verkauft: <b>{formatNumber($gameStore.stats.sold)}</b></span>
      </div>
    </section>

    <section>
      <h3>Spielstand</h3>
      <div class="row">
        <button class="btn small" onclick={handleSaveNow}>💾 Jetzt speichern</button>
        <button class="btn small" onclick={handleExport}>📤 Exportieren</button>
        <button class="btn small" onclick={copyExport}>📋 Kopieren</button>
      </div>
      {#if exportText}
        <textarea readonly rows="4" value={exportText} onclick={(e) => e.currentTarget.select()}></textarea>
      {/if}
    </section>

    <section>
      <h3>Import</h3>
      <textarea rows="4" placeholder="Export-Code hier einfügen …" bind:value={importText}></textarea>
      <button class="btn small" disabled={!importText.trim()} onclick={handleImport}>📥 Importieren</button>
    </section>

    <section>
      <h3>Gefahrenzone</h3>
      <button class="btn small danger" onclick={handleReset}>🗑️ Kompletten Spielstand löschen</button>
    </section>

    {#if message}<p class="msg">{message}</p>{/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(44, 58, 46, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 20px;
  }

  .modal {
    width: 100%;
    max-width: 520px;
    max-height: 85vh;
    overflow: auto;
    position: relative;
  }

  .close {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    padding: 6px 9px;
    border-radius: 8px;
    color: var(--muted);
  }

  .close:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  section {
    margin-top: 16px;
  }

  h3 {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    margin: 0 0 8px;
  }

  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .stats-row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 0.85rem;
  }

  textarea {
    width: 100%;
    min-height: 70px;
    margin: 8px 0;
    font-family: monospace;
    font-size: 0.7rem;
    border: 1px solid #ddd8c4;
    border-radius: 8px;
    padding: 8px;
    resize: vertical;
    background: #fffef9;
    color: var(--ink);
  }

  .msg {
    font-size: 0.8rem;
    color: var(--green-800);
    background: #eef7ec;
    padding: 8px 10px;
    border-radius: 8px;
    margin: 12px 0 0;
  }
</style>
