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
npm test         # Core-Sanity-Tests (scripts/sanity.test.mjs) — vor jedem Commit
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
src/lib/game/      State, Tick, Loop, Actions, Modifiers, Quests, Save/Offline (pures TS)
src/lib/data/      Inhalts- & Balance-Definitionen (plants, upgrades, progression, config)
src/lib/ui/        Svelte-Komponenten + Toast-Store
src/lib/ui/pixel/  Pixel-Art-System: Palette, Sprite-Grids, 9-Slice-Frames, Renderer
src/lib/ui/fx/     Juice: Partikel, Screenshake, Audio-Hooks, Level-Up-Fanfare
src/lib/util/      Helfer (Zahlen-/Zeitformatierung)
scripts/           sanity.test.mjs — Core-Tests ohne Browser (npm test)
```

Zusatzregeln seit dem Redesign: Sprites sind Code (Grids in
`ui/pixel/sprites.ts`, keine Binär-Assets); alle Farben kommen aus
`ui/pixel/palette.ts` (per `initPixelUi()` als `--c-*`-Variablen injiziert);
FX-Aufrufe gehören in die UI-Schicht (`ui/fx/`), niemals in den Core.

## Stand

Phasen 1–2 und 4 (GAME_DESIGN.md §8), das Redesign „Mitternachts-
Pixelgarten" (§9, R1–R5) und die Erweiterungen §9.8 + §9.9 sind
umgesetzt: 13 Sorten in 4 Kategorien (Beeren/Bäume mit Wiederernte),
Prestige mit Parzellen & Kompost, permanenter Level-Bonus, gestufte
Aufträge mit Lieferserie, Pick-3-Rubbellose, aktives Gießen, Juice- und
Sound-Schicht (SAVE_VERSION 11). Weitere Phasen aus §8 (v. a. Helfer/
Automatisierung, Phase 3) nur nach Absprache beginnen.
