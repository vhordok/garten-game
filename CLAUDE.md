# CLAUDE.md

Browser-Idle-Game **„Garten-Imperium"**. Das komplette Spieldesign (Core-Loop,
Progression, Kostenkurven, Prestige, Offline-Regeln, Phasenplan) steht in
**[GAME_DESIGN.md](GAME_DESIGN.md)** — vor Gameplay-Änderungen lesen und bei
Design-Entscheidungen aktuell halten.

## Stack

- **Vite + TypeScript + Svelte 5** (Runes), kein zusätzliches State-Framework.
- Kein Backend — Persistenz ausschließlich über `localStorage`.

## Befehle

```bash
npm run dev      # Dev-Server
npm run check    # svelte-check + TS — vor jedem Commit ausführen
npm run build    # Produktions-Build
npm run preview  # gebauten Stand lokal serven
```

## Architektur-Regeln

1. **Core/UI-Trennung:** `src/lib/game/` ist pures TypeScript **ohne
   Svelte-Imports**. Die UI liest den State nur über den Store-Contract
   `gameStore` (liefert Snapshots) und verändert ihn ausschließlich über
   Funktionen aus `game/actions.ts`. UI-Komponenten mutieren niemals
   State-Objekte direkt.
2. **Eine Game-Loop:** `requestAnimationFrame` + Delta-Time in `game/loop.ts`.
   Sämtliche Zeit-/Wachstumslogik läuft durch `tick(state, dtSeconds)` in
   `game/tick.ts`. **Offline-Progress benutzt denselben Tick** (ein großer
   Delta beim Laden) — niemals separate Offline-Formeln bauen.
3. **Daten statt Hardcode:** Alle Inhalte und Balance-Werte (Pflanzen,
   Beet-Kosten, Caps, später Upgrades/Helfer) sind Definitionen in
   `src/lib/data/`. Spiellogik referenziert nur IDs/Definitionen — neuer
   Inhalt = neuer Dateneintrag, kein neuer Code-Pfad.
4. **Save-Versionierung:** Jede Änderung am Save-Format ⇒ `SAVE_VERSION` in
   `game/save.ts` erhöhen **und** Migrationsschritt in `migrate()` ergänzen.
   Saves nie stillschweigend verwerfen; kaputte/fremde Werte repariert
   `sanitize()` defensiv.
5. **Snapshots an die UI:** `notify()` publiziert Klone des States. Im Core
   wird mutiert, danach `notify()` — pro Aktion genau einmal.
6. **Zahlenanzeige** ausschließlich über `formatNumber()` / `formatDuration()`
   aus `src/lib/util/format.ts`.
7. **Sprache:** Code, Bezeichner und Kommentare Englisch; UI-Texte und
   Dokumentation Deutsch.

## Struktur

```
src/lib/game/   State, Tick, Loop, Actions, Save/Offline (pures TS)
src/lib/data/   Inhalts- & Balance-Definitionen (plants.ts, config.ts, …)
src/lib/ui/     Svelte-Komponenten + Toast-Store
src/lib/util/   Helfer (Zahlen-/Zeitformatierung)
```

## Stand

Phase 1 ist umgesetzt (siehe Phasenplan in GAME_DESIGN.md §8): 3 Kräuter,
manuelles Pflanzen/Ernten/Verkaufen, Beet-Kauf bis 16, Save/Load mit
Export/Import, Offline-Wachstum. Weitere Phasen nur nach Absprache beginnen.
