<script lang="ts">
  import { gameStore } from '../game/state'
  import { formatNumber } from '../util/format'

  let { onOpenSettings }: { onOpenSettings: () => void } = $props()
</script>

<header>
  <div class="title">
    <span class="logo">🌿</span>
    <h1>Garten-Imperium</h1>
  </div>
  <div class="money">
    <div class="amount">🪙 {formatNumber($gameStore.money)}</div>
    <div class="total">insgesamt verdient: {formatNumber($gameStore.totalEarned)}</div>
  </div>
  <button class="icon-btn" title="Einstellungen & Spielstand" aria-label="Einstellungen" onclick={onOpenSettings}>
    ⚙️
  </button>
</header>

<style>
  header {
    position: sticky;
    top: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 18px;
    margin-top: 16px;
    background: color-mix(in srgb, var(--card-bg) 90%, transparent);
    backdrop-filter: blur(6px);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    font-size: 1.5rem;
  }

  h1 {
    font-size: 1.25rem;
    margin: 0;
    color: var(--green-800);
    letter-spacing: 0.3px;
  }

  .money {
    margin-left: auto;
    text-align: right;
  }

  .amount {
    font-weight: 800;
    font-size: 1.35rem;
    color: var(--gold);
  }

  .total {
    font-size: 0.72rem;
    color: var(--muted);
  }

  .icon-btn {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 6px;
    border-radius: 10px;
    line-height: 1;
  }

  .icon-btn:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  @media (max-width: 480px) {
    h1 {
      display: none;
    }
  }
</style>
