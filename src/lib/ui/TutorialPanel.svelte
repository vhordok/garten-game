<script lang="ts">
  import Overlay from './Overlay.svelte'
  import PixelIcon from './PixelIcon.svelte'

  let { onClose }: { onClose: () => void } = $props()
</script>

<Overlay title="Willkommen im Garten!" {onClose}>
  <ol class="steps">
    <li>
      <span class="icon"><PixelIcon name="seedling" scale={2} /></span>
      <span>Wähle unten in der <b>Hotbar</b> dein Saatgut — auch per Taste <b>1–3</b>.</span>
    </li>
    <li>
      <span class="icon"><PixelIcon name="basilikum-3" scale={2} /></span>
      <span>Klicke ein leeres Beet zum <b>Säen</b>, wachsende Beete zum <b>Gießen</b> (3× pro Aussaat) — und die reife Pflanze zum <b>Ernten</b>.</span>
    </li>
    <li>
      <span class="icon"><PixelIcon name="sparkle" scale={2} /></span>
      <span>Schnell hintereinander ernten baut <b>Combos</b> auf, und mit etwas Glück gibt es <b>goldene Ernten</b>.</span>
    </li>
    <li>
      <span class="icon"><PixelIcon name="coin" scale={2} /></span>
      <span><b>Verkaufe</b> oben im HUD, kaufe <b>Upgrades</b> im Shop und liefere <b>Aufträge</b> für Extra-Gold und XP.</span>
    </li>
  </ol>
  <button class="pxbtn primary full" onclick={onClose}>Los geht's!</button>
  <p class="hint">Dein Garten wächst auch weiter, wenn du offline bist — alles wird automatisch gespeichert.</p>
</Overlay>

<style>
  .steps {
    list-style: none;
    margin: 10px 0 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.88rem;
    line-height: 1.45;
    color: var(--c-cloud);
  }

  li b {
    color: var(--c-leaf4);
  }

  .icon {
    flex: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-night1);
  }
</style>
