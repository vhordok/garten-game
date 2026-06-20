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
Invariante gehalten, Sprites aliasiert. Phase 24 (§9.26): Sprite-Qualitätsrework
(scripts/sprite-atlas.mjs rendert alle Pflanzen als PNG zur Sichtprüfung; eigene
distinkte Sprites für alle Endgame-Pflanzen — keine Aliase mehr; Hanf-Linie als
klare Cannabis-Fächerblätter) + Very-Late-Game-Leiter: 7 weitere Pflanzen von
1 Qi bis 300 Sx (Kometbeere/Nebelzeder/Himmelshanf/Galaxieorchidee/Schöpfungsrose/
Mondkristall/Urweltbaum) → bei 570 Qi bleiben 4 Pflanzenziele offen. Phase 25
(§9.27): Core-Progression — Quest-Mengen mit Fortschritt skaliert (questEffortScale:
frischer Lvl-1-Garten ~8–21 statt ~156 Basilikum → kein Reservierungs-Softlock,
rampt bis Lvl 30), Level-Wert (XP-Kurve spät viel steiler 20·level^1.5·(1+level/120)
→ kein Level-Durchrasen, Level-Ertragsdeckel +100 %→+300 %). Phase 26 (§9.28):
Prestige-Skip-Fix via Parzellen-Soft-Gate (PlantDef.unlockParcel — die 11 sehr
späten Pflanzen brauchen zusätzlich Mindest-Parzellen P6…P36; Parzellen wachsen
~1/Prestige + überstehen Reset → pacen die Spitze, während der Multiplikator
weiter beschleunigt; kein Nerf, greift nur beim Säen/Auswählen, bestehende Beete
laufen via plantById weiter, questPool/Hotbar/Ziel-Panel respektieren das Gate).
Keine Save-Änderung. Phase 27 (§9.29): Late-Game-Sinks vollständig umgesetzt —
7 parzellen-gegatete Shop-Stufen (UpgradeDef.unlockParcel) inkl. endlosem Gold-Sink
Edelkompost (repeatable), 2 weitere endlose Kompost-Sinks (Tiefenmoor/Ewighumus →
jeder Effekt hat einen Endlos-Pfad), Lizenz-Tiers IV/V (level:number+benefit, keine
neuen Pflanzen, licenseQuestBonus +20/+30 % Auftragsbelohnung, Cap 3→5),
fulfillQuest zahlt Lizenz-Bonus, Ziel-Panel shopGoal+licenseGoal & triviale ready-
Ziele sortieren hinter Fortschritt. Reiner Save-Passthrough. Phase 28 (§9.30):
diagnosegetriebener Politur-Durchlauf — End-to-End-Playtest (scripts/playtest.mjs,
20 Spielstände × 12 Fragen), Ziel-Panel-Kern-Fix (upgradeGoal zielt auf billigstes
noch-nicht-bezahlbares Upgrade statt „Gießkanne bereit"; Goal.chore-Flag entwertet
triviale Jederzeit-Ziele in Sortierung/Panel-Optik/HUD-Badge; goalBoard() deckelt
≤3 Ziele/Horizont), Fresh-Start/Shop-Kompost-Lizenz-UI/Zahlenformat geprüft & gesund.
Keine Save-Änderung. Phase 29 (§9.31): Toast-Spam-Fix & Goal-System 2.0 — Toasts
mit Priorität+Aggregation (key-basiert, pushAggregateToast bündelt 120-Beete-Ernte
auf ~2 Meldungen), Render-Deckel max 3, feste Ecke unten-rechts (fx/celebrate.ts +
Rubbellos-Emitter aggregieren); Auftragsziele wirtschaftlich gewichtet
(expectedQuestPayout geteilt mit fulfillQuest; questGoal nur stark bei fast-fertig
oder Prämie über Direktverkauf, faltet Lizenz/Mykorrhiza/Variante/Streak vs.
Marktstand/Welle ein); Build-Entdeckungsziele (buildGoal, discovery-Flag, rotiert
nach Parzelle); Ziele mit why-Begründung + Typ-Chip; goalBoard komponiert Vielfalt
(≤1 Chore, ≤1 Build, ≤3/Horizont). Keine Save-Änderung. Phase 30 (§9.32): Toast-
Verlauf (toastLog + ToastLogPanel, 🔔-HUD-Button mit unseen-Badge — Session-Historie
gedeckelt auf 40, aggregiert wie die Toasts, nie gespeichert) macht gebündelte/
verpasste Meldungen nachlesbar; Auftrags-Zeitschätzung (goals.ts questFulfillSeconds:
reale Anbauzeit der fehlenden Produkte) — lukrativ-aber-Dauergrind (>2 h) wird nur
leise gezeigt, schnelle Aufträge stark mit „~Xm" im why. Keine Save-Änderung. Phase
31 (§9.33): Topbar-Stabilität (Panel-Buttons in eigener .row.btns + feste Stat-
Breiten → kein Reflow/Springen bei Stat-Änderungen) und endlose Endgame-Auto-Ernte
(data/upgrades.ts erntedrohnen: repeatable autoHarvest, +3 Beete/s je Stufe, ab
Parzelle 16, Basis 1 Sp, costFactor 1.4 → erntet riesige Felder sofort + Gold-Sink;
greift über effectBonus, auch offline). Keine Save-Änderung. Phase 32 (§9.34):
Endgame-Tiefe — Wachstums-Boden (PlantDef.minGrowSeconds floort die Echtzeit-Reife,
tick.ts: maxInc = growTime·dt/minGrowSeconds → Endgame-Pflanzen brauchen wieder
30–120 s statt <1 s trotz Mio-%-Tempo), neue Hanf-Spitze (5 Sorten Sonnen-/Sternen-/
Nebel-/Kosmos-/Ewigkeitshanf, Lizenz III, regrow, ~3–5× Sprung/Tier, P40→P60, Unlock
1e24→1e28, Sprites aliasiert), endloser Skill-Capstone ahnenwissen + buySkillMax/MAX-
Button gegen den Skillpunkt-Überschuss (Glück-/Labor-Pfade jetzt im Panel sichtbar),
Zier-Relation neu skaliert (obere beautyBonus steiler + neue Sternenrose, irreführende
%-Texte qualitativ). Save-sicher (neue IDs→0, reine Daten). Phase 33 (§9.35): eigene
distinkte Reife-Sprites für die 5 Hanf-Endgame-Sorten (je eigene Blütenfarbe) +
Sternenrose; neue Pflanzen-Kategorie „Kosmisch" (kosmos) als finaler Build-Pfad —
3 Sorten (Sternensaat/Nebularblüte/Urknallfrucht, P64→P78, regrow+floored, Unlock
1e29→1e31), eigene Spezialisierung mit neuem SpecKind 'sell' (+5 %/Stufe Verkaufspreis
nur für die Kategorie, gewirkt in sellInternal/Auto-Verkauf/Vorschau), eigene
Akzentfarbe + Sprites; voll datengetrieben (Shop/Quest/Hotbar/Ziele ziehen mit).
Save-sicher. Phase 34 (§9.36): Reife-Zeit-Bug behoben (growTime-gegateter Echtzeit-
Boden CONFIG.minCycleFloorSeconds für Pflanzen ≥50000 growTime → keine <1s-Reife,
monoton steigende Kadenz; effectiveCycleSeconds + wahrhaftiger Hotbar-Tooltip statt
roher growTime), Holz-Rework (passives Gold ×yieldMultiplier + reife Bäume geben
separate multiplikative Ertrags-„Hain"-Aura via PlantDef.forestYield/forestBonus,
🌲-Chip), Bulk-Rubbeln (scratchAll + „Alle Lose"-Button gegen den 23k-Hort), Level-
Softcap (levelYieldBonus: √-Wachstum jenseits +300% → Lvl 44k ≈ +2390%), 4 neue
Skill-Knoten. Save-sicher (reine Daten/Logik). Phase 35 (§9.37): diagnosegetriebener
Check (playtest/diagnose zeigen kein Gameplay-Bug; „tote" spec/beauty/mastery sind
multiplikativ-gesund, nur synthetisch unbespielt) → reine Politur: eigene Kosmisch-
Frühstufen-Sprites (seedlingKosmos/kosmos1/kosmos2, blau-weiße Stern-Optik statt
Magie-/Kristallbeer-Aliasen). Save-sicher. Phase 36 (§9.38): Toast-Verlauf über
Reloads persistent (eigener localStorage-Key, vom Save entkoppelt, gedrosselt; Unseen-
Badge startet bei 0; Panel zeigt Tage). Keine Save-Änderung. Phase 37 (§9.39):
Endgame-Paket — Kadenz-Fix (alle Endgame-Pflanzen teilen den globalen 8-s-Boden, keine
Inversion mehr), bezahlbare Felder (piecewise Beetkurve, Beet 164 ~908B statt 2,5e30)
+ buyAllPlots/„Alle Felder kaufen", Zierpflanzen permanent (Alles-Roden überspringt
beautyBonus) + stärker (obere beautyBonus ×~2, Softcap-Exp 0,5→0,6), 4 neue Kosmos-
Spitzen (P83→P98, ~×10/Tier, ROI ~0,4) + Endgame-Saatpreise ROI ~0,4, eigene Kategorie
„Kreuzungen" für Saatlabor-Specials (eigener Hotbar-Tab, special-only). Save-sicher.
66 Sorten (+1 Spezial) in 9 Kategorien + Kreuzungen, Stand SAVE_VERSION 28.
