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

Phasen 1–4 (GAME_DESIGN.md §8), das Redesign „Mitternachts-
Pixelgarten" (§9, R1–R5) und die Erweiterungen §9.8–§9.10 sind
umgesetzt: 19 Sorten in 6 Kategorien (Beeren/Bäume/Magie mit
Wiederernte, Zier mit Schönheits-Multiplikator), Prestige mit
Parzellen & Kompost (Lifetime-Delta + Softcap, Balance-Audit via
scripts/balance.sim.mjs), permanenter
Level-Bonus, Shop mit 11 Items in 3 Rubriken inkl. Helfer-
Automatisierung (läuft offline, gechunkter Catch-up), gestufte
Aufträge mit Lieferserie, Pick-3-Rubbellose, aktives Gießen, Juice-
und Sound-Schicht sowie das Zehner-Paket aus §9.11: Marktwelle,
Tagesbonus-Serie, Glühwurm, Wetter-Events, Holz-Bäume, Achievements,
Cannabis + Lizenzen, Rekorde/Graph, Massen-Aktionen und generative
Musik/Ambience. Damit ist der §8-Phasenplan
vollständig umgesetzt. Feinschliff-Phasen (GAME_DESIGN §9.12) umgesetzt:
Los-Limit am Level (P0), Softlock/Roden (P1), Lager-Teilverkauf/
Auftragsschutz (P2), Auto-Saat-Pin & faire Auto-Ernte (P3), Desktop-Topbar/
Event-Feld (P4), Mobile/Touch (P5), Balancing-Sim (P6), Subsystem-Balance
(P7), Quests/Begriffe & Ernteprodukte (P8), Sorten-Verdopplung (P9),
kategoriespezifische Setzlinge (P10), Gesamt-QA & Softlock-Härtung (P11).
Endgame 2.0 (§9.13): Massenroden+Undo (kein Confirm), Pflanzen-Meisterschaft
und Kategorie-Spezialisierung (Gold-Sink) — beide überstehen Prestige.
Phase 12 (§9.14): Post-Prestige-Aufträge via maxUnlockEarned, Lager
reserviert/frei, Idle-Nutzen für Wasserfass/Sternenuhr, Touch-Tooltip,
Toasts unter Modals. Phase 13 (§9.15): faire Auftragsmengen, Auftragstypen
(Single/Kombi/Kategorie/Groß via items[]), Parzellen-Meilensteine und
Kompost-Garten (Kompost ausgebbar, compostSpent getrennt). Phase 14 (§9.16):
Meisterschaft präzisiert (manuell+Helfer geben XP, Zier/Holz keine), Kategorie-
Spezialisierung mit eigenem Zweitbonus pro Kategorie (data/specializations.ts),
Gold+Kompost-Kosten ab Stufe 8 und Parzellen-/Level-Gates, kompakte Shop-
Sektion. Phase 15 (§9.17): Late-Game-Rebalance nach harter Diagnose
(scripts/diagnose.mjs) — Spezialisierung eskaliert pro Tier + Meilensteine
(specPerkMultiplier), Kompostkosten geometrisch; drei endlose, wiederholbare
Kompost-Sinks (Urhumus/Tiefenkultur/Markt-Mykorrhiza, log-gedeckelt) ab
Parzelle 12/14/16; Pflanzenleiter-Spitze gestreckt; Kategorie-Akzentfarben im
Shop. Phase 16 (§9.18): UI-Overlay-Regel (Wetter-Banner in-flow in .notify-zone,
Toasts ans untere Ende über die Hotbar → keine verdeckten Hauptbuttons) und
Ziel-System (game/goals.ts + ui/GoalsPanel.svelte: mehrere gleichzeitige Ziele
über vier Horizonte mit Fortschritt/Belohnung, HUD-Button ✨ mit Ready-Badge,
keine Save-Änderung). Phase 17 (§9.19): Zier-Rework (data/beautyMilestones.ts —
Schönheit schaltet gartenweite Aura-Perks frei, solange gehalten; sichtbarer
✿-Chip + Ziel) macht Zier zu einem echten Build; erster Skill-Tree-Vertical-Slice
(data/skills.ts + game/skills.ts + ui/SkillsPanel.svelte: 5 Knoten, Skillpunkte
aus Parzellen/Erfolgen/Level statt Gold, Prereq-Gating, übersteht Prestige,
HUD-Button 🌱). Phase 18 (§9.20): Rubbellos-Rework (Gold-Preise skalieren mit
effektivem Ernte-Wert, neue Kompost-/Mastery-Preise), 4 Kategorie-Events
(Erntefest/Komposttag/Meistertag/Gartenschau via weather.ts), Skilltree-Ausbau
(4 Knoten + Glück-Pfad + Respec gegen Kompost), Zier-Softcap (beautySoftcap,
abnehmender Grenznutzen). Keine Save-Änderung. Phase 19 (§9.21): mehrstufiges
Erfolge-Tier-System (data/achievements.ts + game/achievements.ts — 11 Tracks ×
6 Stufen Bronze→Legendär; dauerhafte Boni + Skillpunkte aus beanspruchten Stufen
abgeleitet, Einmal-Belohnungen Booster/Lose ohne Kompost; achievementTiers ersetzt
achievements[], Migration initialisiert aus Stats ohne Reward-Flut). Phase 20
(§9.22): Saatlabor (data/variants.ts + game/seedlab.ts + ui/SeedLabPanel.svelte —
10 entdeckbare Pflanzenvarianten als permanente Sammel-Passivboni über alle
Spielweisen; deterministische Kreuzung zweier freigeschalteter Eltern gegen
Gold/Kompost mit Parzellen-/Meisterschafts-Gates, kein Plot/Sprite-Aufwand;
Lexikon + Ziel-/Erfolg-Anbindung „Saatforscher", discoveredVariants übersteht
Prestige). Phase 21 (§9.23): Saatlabor vertieft — Ernteprodukt-Kosten (nur freier
Überschuss via freeStock = Lager − questReserved), Kategorie-Rezept-Hinweise
statt Lösung, 5 Varianten-Event-Synergien (variantEventBonus), Skill „Saatgut-
Forschung" (−Gold), Ziel-Panel zeigt fehlende Produkte. Phase 22 (§9.24): erste
pflanzbare Spezialvariante (data/plants.ts SPECIAL_PLANTS — Prachtorchidee, reine
Zier-Utility, max 3, via discoveredVariants freigeschaltet; integriert allein über
plantById → Plot/Beauty/Save/Hotbar generisch, isPlantUnlocked+maxPlots als einzige
neue Logik), Basilikum-Sprite neu + dokumentierte Sprite-Stilregel. Phase 23
(§9.25): Late-Game-Leiter über Weltenrose hinaus — 4 neue Pflanzen mit Rollen
(Traumorchidee/Zier, Ewigrose/Magie-Wiederernte, Sternenzeder/Holz-passiv,
Dauerblütenhanf/Hanf-Wiederernte Lizenz III) jenseits von Weltenroses Unlock,
Invariante gehalten, Sprites aliasiert. Keine Save-Änderung. 46 Sorten (+1 Spezial)
in 8 Kategorien, Stand SAVE_VERSION 27.
