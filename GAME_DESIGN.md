# 🌿 Garten-Imperium — Game Design

Browser-Idle-/Incremental-Game: Vom winzigen Kräuterbeet zum Garten-Imperium.
Inspiration: **Cookie Clicker** (Kostenkurven, exponentielles Wachstum, Prestige)
und **Melvor Idle** (Kategorien-Progression, Offline-Progress).

Dieses Dokument ist die Design-Wahrheit des Projekts. Konkrete Zahlen
(Preise, Wachszeiten, Erträge) leben als Daten in `src/lib/data/` und werden
dort balanciert — hier stehen Loop, Struktur und Kurven.

---

## 1. Core-Loop

1. **Pflanzen** — Samen kosten Geld und belegen ein Beet.
2. **Warten / Wachsen** — Wachstum läuft in Echtzeit, auch offline weiter.
3. **Ernten** — reife Pflanzen wandern als Ware ins Lager.
4. **Verkaufen** — Lagerware wird zu Geld.
5. **Reinvestieren** — mehr Beete, teurere Sorten, Upgrades, Helfer → größere Zyklen.

**Sekundär-Loop (Mid-Game):** Automatisierung übernimmt die Schritte 1–4,
der Spieler optimiert nur noch Sortenwahl, Allokation und Upgrade-Reihenfolge.

**Tertiär-Loop (Late-Game):** Prestige („Neue Parzelle pachten") setzt die Runde
zurück und beschleunigt alles Folgende permanent.

Gefühlsziel: In den ersten 5 Minuten drei spürbare Fortschritte (erste Ernte,
erste neue Sorte, erstes neues Beet). Danach verdoppeln sich die Zeiträume
zwischen Meilensteinen grob — klassische Incremental-Pacing-Kurve.

## 2. Ressourcen & Währungen

| Ressource | Zweck | Quelle |
|---|---|---|
| 🪙 **Geld** | Hauptwährung: Samen, Beete, Upgrades, Helfer, Lizenzen | Verkauf von Ernte |
| 🧺 **Ernte** (pro Sorte) | Zwischenressource im Lager | Ernten reifer Beete |
| 🟤 **Kompost** | Prestige-Währung, permanente Boni | Prestige-Reset (§6) |
| 📜 **Lizenzen** | Freischalt-Gate für Cannabis | Geld + Bedingungen (§3) |

- Geld wächst unbeschränkt exponentiell → Anzeige immer über Suffix-Formatierung
  (1.5K, 2.3M, 1.1B, …).
- `totalEarned` (Lifetime-Einnahmen) ist die zentrale Progressions-Metrik:
  Sie steuert Unlocks und ist später die Basis der Kompost-Formel.

## 3. Pflanzenkategorien & Progression

Unlock-Reihenfolge mit groben Gates (über `totalEarned` bzw. Prestige-Stufe).
Jede Kategorie bringt eine eigene Mechanik mit, nicht nur größere Zahlen:

| # | Kategorie | Unlock (grob) | Mechanische Identität |
|---|---|---|---|
| 1 | 🌿 Kräuter | Start | schnell, billig — Lernphase, hohe Klickdichte |
| 2 | 🥕 Gemüse | ~5K | längere Zyklen, höhere Margen, profitiert stark von Bewässerung |
| 3 | 🫐 Beerensträucher | ~100K | mehrjährig: einmal pflanzen, automatische Wiederernte ohne Neusäen |
| 4 | 🍎 Obstbäume | ~5M | sehr lange Reife, sehr hoher Stückwert — Offline-/Geduld-Sorte |
| 5 | 🌳 Bäume | ~250M | permanent, tröpfeln passiv Geld (Holz) statt Ernte-Zyklus |
| 6 | 🌸 Hecken & Zierpflanzen | ~10B | keine Ernte: „Gartenschönheit" = globaler Verkaufspreis-Multiplikator |
| 7 | 🌱 Cannabis | Late-Game | Lizenz-Gate, höchste Erträge, anspruchsvolle Pflege |

*(Beeren bewusst vor Obst: die Wiederernte-Mechanik ist der interessantere
Schritt und bereitet die Automatisierung gedanklich vor.)*

**Cannabis & Lizenz-Mechanik:** Thematisch „medizinischer Anbau mit Lizenz".
Lizenzen sind kein Grind, sondern harte einmalige Schwellen und große
Money-Sinks mit Zusatzbedingungen:

- **Lizenz I** (Kleinanbau): kostet z. B. 50B, erfordert Parzelle ≥ 2.
- **Lizenz II** (Gewächshaus): ×100 teurer, erfordert Gartenschönheit ≥ Schwelle.
- **Lizenz III** (Plantage): ×100 teurer, erfordert Parzelle ≥ 4.

Cannabis-Pflanzen haben Top-Profit/Sekunde, verlangen aber volle Infrastruktur
(höchste Bewässerungsstufe, sonst Wachstums-Malus) — Automatisierung wird zur
Voraussetzung statt Komfort.

### Kostenkurven

- **Wiederholbare Käufe** (Helfer-Stufen, Upgrade-Stufen):
  `cost(n) = base × 1.15^n` — genre-üblicher Faktor, ~5 Käufe pro Preisverdopplung.
- **Beete** innerhalb einer Parzelle: steiler, `cost(n) = base × 1.5^n` —
  Platz ist das harte Limit und soll sich knapp anfühlen.
- **Neue Sorten**: feste Preise/Unlock-Schwellen, grob ×8–×15 pro Stufe
  innerhalb einer Kategorie, Kategoriewechsel ≈ ×50.
- **Ertrags-Daumenregel**: langsamere Sorten haben den besseren Profit/Sekunde
  (Geduld wird belohnt), schnellere Sorten mehr Interaktion pro Minute.

## 4. Automatisierung

Erwerbsreihenfolge folgt den Schmerzpunkten des Spielers:

1. 💧 **Bewässerung** (Gießkanne → Sprinkler → Tropfsystem):
   globale Wachstumsgeschwindigkeit +25 % / +50 % / +100 %. Stufen-Upgrade pro Parzelle.
2. 🧺 **Erntehelfer**: erntet reife Beete automatisch (Basis 1 Beet/s,
   weitere Käufe erhöhen die Rate, 1.15er-Kurve).
3. 👩‍🌾 **Gärtner**: sät die pro Beet gewählte Sorte automatisch nach.
4. 🛒 **Marktstand**: verkauft Lagerbestand automatisch (% des Lagers pro Sekunde,
   Endstufe: sofortiger Verkauf).
5. 🧰 **Spezialisierungen** pro Kategorie (z. B. „Beeren-Spalier": Wiederernte −30 %,
   „Kompost-Tee": Kräuter-Ertrag ×2).

Voll ausgebaut spielt sich das Spiel selbst; der Spieler trifft nur noch
Allokations- und Kaufentscheidungen — klassisches Idle-Endstadium pro Runde.

## 5. Offline-Progress

- Beim Laden: `delta = now − savedAt` (Import eines Spielstands nutzt denselben Pfad).
- Simulation wird um `min(delta, Cap)` fortgeschrieben; **Cap initial 8 h**,
  später durch Upgrades erweiterbar.
- **Eine Wahrheit:** Offline-Progress läuft durch dieselbe `tick(state, dt)`-Funktion
  wie die Live-Loop (ein großer bzw. gechunkter Tick). Keine separaten
  Offline-Formeln — sonst divergieren online und offline zwangsläufig.
- „Willkommen zurück"-Meldung fasst zusammen: Abwesenheitsdauer, gereifte
  Pflanzen, später automatische Ernten/Verkäufe der Helfer.

## 6. Prestige: „Neue Parzelle pachten"

- **Reset:** Geld, Beete, Pflanzen, Lager, Helfer und Upgrades der Runde.
- **Bleibt:** Kompost, Lizenzen, Achievements, QoL-Freischaltungen
  (z. B. „Alle ernten"-Knopf, Schnellkauf).
- **Belohnung:** `Kompost = floor(√(totalEarned der Runde / 1e6))`
  → erstes Prestige lohnt ab ~1M Lifetime-Einnahmen.
- **Effekt:** pro Kompost **+5 % Ertrag** und **+2 % Wachstumstempo**
  (global, multiplikativ mit allem anderen).
- Jede Parzelle erhöht zusätzlich das Beet-Maximum und schaltet Inhalte frei
  (Parzelle 2: Bäume-Slots & Lizenz-I-Voraussetzung, Parzelle 3: …).

## 7. Zahlen & UX-Grundsätze

- **Zahlenformat:** ab 1000 mit Suffix und 1–2 Nachkommastellen:
  `1.5K, 23.4K, 156K, 2.3M, 1.1B, 4.7T, …` — zentral in `src/lib/util/format.ts`.
- Kein Klick darf bestrafen; destruktive Aktionen (Reset, Prestige) immer mit
  Bestätigung und klarer Vorschau dessen, was verloren geht / gewonnen wird.
- Immer sichtbar: Geldstand und das nächste erreichbare Ziel (nächstes Unlock).
- Speichern passiert automatisch (Intervall + beim Verlassen), Export/Import
  als kopierbarer Code.
- **Visuelle Identität:** seit dem Redesign Pixel-Art im „Mitternachtsgarten"-
  Stil — Details, Palette und Game-Feel-Regeln in §9. (Ursprünglich: helle
  Webseiten-Optik mit Emoji-Icons — abgelöst.)

## 8. Phasenplan

| Phase | Inhalt | Status |
|---|---|---|
| **1** | Beet-Grid (Start 4, kaufbar bis 16), 3 Kräuter, manuell pflanzen/ernten/verkaufen, Save/Load + Export/Import, Offline-Wachstum, Zahlenformat | ✅ umgesetzt |
| **2** | Gemüse-Kategorie, Unlock-UI, Bewässerungs-Upgrades | ✅ via §9.8 (Gemüse, aktives Gießen; Sprinkler/Kompost aus R4) |
| 3 | Helfer (Auto-Ernte, Auto-Aussaat, Auto-Verkauf) inkl. Offline-Simulation | offen |
| 4 | Prestige: Parzellen + Kompost | offen |
| 5 | Beerensträucher (Wiederernte), Obstbäume, Bäume (passives Einkommen) | offen |
| 6 | Hecken/Zier (Schönheits-Multiplikator), Cannabis + Lizenzen | offen |
| 7 | Achievements, Statistiken, Sound, Feinschliff & Balancing | offen |

### Phase-1-Balancing (Referenz, Werte in `data/plants.ts`)

| Sorte | Saat | Wachszeit | Ertrag | Profit/s/Beet | Unlock |
|---|---|---|---|---|---|
| 🌿 Basilikum | 1 | 8 s | 1 × 3 = 3 | 0.25 | Start |
| 🍃 Minze | 8 | 30 s | 2 × 9 = 18 | 0.33 | 75 verdient |
| 🪻 Lavendel | 40 | 120 s | 3 × 35 = 105 | 0.54 | 400 verdient |

Beete: Start 4, Kauf 5–16 nach `25 × 1.5^n` (25, 38, 56, … 2.2K; gesamt ≈ 6.4K).
Startgeld: 10. Ziel: Phase-1-Inhalt in 1–2 entspannten Stunden „durchgespielt".

---

## 9. Redesign „Mitternachts-Pixelgarten" (2026)

Komplettes visuelles + spielerisches Redesign in Richtung moderner
Indie-Steam-Games (Referenzen: Megabonk, Loot Loop, Oaken Tower, Coal LLC):
knackiges Game-Feel, satte Farben, Juice, echtes Game-HUD statt
Webseiten-Optik, dichte Belohnungsschleife. Tech-Stack bleibt unverändert
(Vite + Svelte 5, kein Canvas-Framework, keine neuen Runtime-Dependencies
außer gebundelten Fonts).

### 9.1 Art Direction: Pixel-Art bei Nacht

- **Stil:** 2D-Pixel-Art, Basisraster 16×16, nur ganzzahlige Skalierung
  (`image-rendering: pixelated`). Szene: Garten bei Nacht — dunkler
  Himmel mit Sternen/Mond, Silhouetten-Hecken in 2–3 Parallax-Ebenen,
  Glühwürmchen; Pflanzen und UI leuchten satt dagegen an.
- **Sprites als Code, keine Binär-Assets:** Alle Sprites (Pflanzen in 4
  Wuchsstufen, Bodenkacheln, Icons, 9-Slice-Panelrahmen) sind als
  Pixel-Grids (String-Arrays + Palettenindex) in `src/lib/ui/pixel/`
  definiert und werden einmalig auf Canvas gerendert und als Data-URL
  gecacht. Vorteile: diffbar, balancierbar, kein Asset-Pipeline-Zwang.
- **Palette** (zentral als CSS-Variablen und Sprite-Palette, Auszug):

  | Rolle | Werte |
  |---|---|
  | Nacht/Flächen | `#090a14`, `#10141f`, Panels `#151d28`, Kanten `#202e37` |
  | Himmel | `#172038` → `#253a5e` |
  | Pflanzgrün-Rampe | `#19332d`, `#25562e`, `#468232`, `#75a743`, `#a8ca58`, `#d0da91` |
  | Boden/Holz | `#341c27`, `#602c2c`, `#884b2b` |
  | Gold (Geld, Perfekt-Ernte) | `#be772b`, `#de9e41`, `#e8c170` |
  | Lila (XP, Legendär-Ernte) | `#402751`, `#7a367b`, `#c65197`, `#df84a5` |
  | Wasser/Selten | `#3c5e8b`, `#4f8fba`, `#73bed3` |
  | Text / gedämpft / Danger | `#ebede9` / `#819796` / `#cf573c` |

- **Typo:** Pixel-Font „Pixelify Sans" (über `@fontsource` gebundelt,
  kein CDN) für UI und Zahlen, Fallback Monospace. Schriftgrößen in
  festen Stufen, damit das Pixelraster ruhig bleibt.
- **UI-Chrome:** 9-Slice-Pixelrahmen für Panels und Buttons (gedrückte
  Buttons rutschen 2 px nach unten — Arcade-Kante), Progressbars mit
  Pixel-Schimmer, Icons als Sprites statt Emojis.

### 9.2 HUD-Layout statt Webseite

- **Top-HUD:** Geld (Coin-Sprite pulsiert, Zahl zählt hoch), Level-Badge
  mit XP-Bar, Combo-Meter, Settings-Knopf.
- **Bühne (Mitte):** der Garten als Spielfeld in der Nachtszene —
  Beetkacheln im Boden, kein Karten-Container.
- **Hotbar (unten):** Saatgut-Slots wie eine Item-Leiste (Tasten 1–9,
  Preis und Lock-Status sichtbar, aktiver Slot hervorgehoben).
- **Panel-Knöpfe im HUD** (statt separatem Seiten-Dock — kompakter,
  mobiltauglicher): Shop, Aufträge und Lager öffnen Overlays; Punkt-Badges
  signalisieren „etwas ist bezahlbar/lieferbar". Kein Footer.

### 9.3 Geschärfter Core-Loop

Säen → Wachsen (4 sichtbare Sprite-Stufen) → **Ernten mit Combo- und
Crit-Chance** → Verkaufen → Geld **+ XP** → Upgrades/Beete/Sorten →
**Aufträge** erfüllen → größere Zyklen. Kurzfristig knallt jeder Klick
(Partikel, fliegende Zahlen), mittelfristig belohnen Aufträge und
Level-Ups, langfristig Unlocks und Upgrade-Stufen. Idle-Kern unverändert:
Offline-Wachstum läuft weiter durch denselben `tick()`.

### 9.4 Neue Mechaniken (Startwerte leben in `src/lib/data/`)

1. **Combo-Ernte:** Jede Ernte ≤ 4 s nach der vorigen erhöht den Combo-
   Zähler; +5 % Ertrag pro Stufe, Cap bei 20 Stufen (×2.0). Combo ist
   transient (nicht im Save, offline = 0). Bruchteile werden
   probabilistisch gerundet, damit das Lager ganzzahlig bleibt.
2. **Goldene Ernten (Crits):** pro Ernte 8 % Chance „Perfekt" (×3 Ertrag,
   Gold-Effekt) und 1 % „Legendär" (×10, Lila-Effekt + Screenshake).
   Multipliziert sich mit der Combo.
3. **Aufträge:** rotierende Bestellungen („Liefere 12× Minze") über die
   freigeschalteten Sorten (6–14 Ernten), Belohnung = Marktwert ×1.5 plus
   Bonus-XP in Höhe der Menge; zählt als Einnahme (treibt Unlocks).
   Slots wachsen per Level (1/2/3 ab Level 1/3/5), Skip mit 60-s-Cooldown
   pro Slot. Belohnt Sortenvielfalt, gibt Richtung.
4. **Gärtner-Level:** 1 XP pro geernteter Einheit plus Auftrags-Boni;
   `xpToNext(level) ≈ 20 × level^1.4`, Überschuss trägt über. Level-Ups
   zahlen `≈ 20 × level²` Gold aus und gaten die Auftragsslots
   (später weitere QoL). Großer Fanfaren-Moment.
5. **Upgrade-Shop** (zieht §4 vor): kleine, gecappte Stufen-Upgrades —
   Gießkanne (+10 % Wachstumstempo/Stufe), Dünger (+10 % Ertrag/Stufe),
   Marktstand (+10 % Verkaufspreis/Stufe), je max. 10 Stufen,
   Kosten `base × 1.9^n`. Der bisher fehlende Money-Sink nach Beet 16.

### 9.5 Game-Feel-Regeln (Juice)

- Partikel (Canvas-Layer mit Pool/Cap): Blätter beim Säen, Coin- und
  Funken-Burst beim Ernten/Verkaufen, Gold-/Lila-Explosion bei Crits.
- Fliegende Zahlen mit Gewicht (Crits größer, fett, eigene Farbe).
- **Screenshake** nur bei Großereignissen (Legendär, Level-Up,
  Beet-/Upgrade-Kauf), kurz (< 250 ms) und gedeckelt.
- Tweens statt harter Wechsel: Geldzähler zählt, Bars gleiten,
  Panels sliden ein; Squash & Stretch beim Pflanzen-Pop.
- **Sound nur als Hook:** `audio.ts` mit `play(id)`-API, Platzhalter
  (stumm/Blip) — echte Sounds später austauschbar.
- `prefers-reduced-motion` deaktiviert Shake/Partikel, nie Information.

### 9.6 Technik-Leitplanken

- Core/UI-Trennung bleibt strikt: Combo/Crit/XP/Aufträge/Upgrades sind
  Core-Logik (`game/` + `data/`), Partikel/Shake/Tweens reine UI.
- Save-Format: Versionssprünge je Mechanik-Paket mit Migration
  (`SAVE_VERSION` 2+), `sanitize()` ergänzt fehlende Felder defensiv.
- Offline bleibt „ein großer Tick"; Upgrade-Multiplikatoren wirken
  dadurch automatisch auch offline. Combo/Crits sind bewusst nur live.

### 9.7 Redesign-Phasenplan

| R-Phase | Inhalt | Status |
|---|---|---|
| R1 | Konzept (dieses Kapitel) | ✅ |
| R2 | Visuelles Grundgerüst: Sprite-System, Palette/Fonts, Nachtszene, HUD-Layout | ✅ |
| R3 | Juice: Partikel, Screenshake, Tweens, Audio-Hooks | ✅ |
| R4 | Mechaniken einzeln: Upgrades → Crits → Combo → Level → Aufträge (Save v2–v6) | ✅ |
| R5 | Feinschliff: Balancing-Grundwerte, Onboarding-Panel (einmalig, localStorage), Performance | ✅ |

Der Core bleibt headless testbar: `npm test` fährt die Sanity-Suite
(`scripts/sanity.test.mjs`) über Tick, Aktionen, Migrationen und alle
fünf Mechaniken — vor jedem Commit zusammen mit `npm run check` ausführen.

### 9.8 Erweiterung „Gemüse, Gießen & Glück"

Nach R5 nachgelegt — Ziel: mehr Aktivität zwischen den Ernten und ein
Glücks-Kick im Stil von Rubbellosen.

1. **Gemüse-Kategorie** (damit ist §8 Phase 2 umgesetzt): Karotte
   (Unlock 2.5K), Tomate (12K), Kürbis (60K) — Werte in
   `data/plants.ts`; Profit/s steigt streng monoton über die gesamte
   Sortenreihe (testgesichert). Kürbis = ein Koloss pro Beet, auf
   Crits ausgelegt.
2. **Aktives Gießen:** wachsende Beete sind klickbar; jeder Guss
   überspringt 15 % der Wachszeit, 3 Ladungen pro Aussaat
   (Tropfen-Pips am Beet, Splash-FX). Bewusst als Aktion statt im
   Tick — Offline-Verhalten bleibt unverändert.
3. **Rubbellose:** 4 % Drop-Chance pro geerntetem Beet (Cap 5,
   HUD-Knopf wackelt). Rubbel-Overlay mit 9 Feldern, drei gleiche
   Symbole zeigen den Gewinn; der Preis ist beim Ziehen bereits
   verbucht (Abbruch verliert nichts). Gewichtete Preistabelle in
   `data/scratch.ts`, skaliert am Erntewert der besten
   freigeschalteten Sorte (Gold ×2/×6/×18, XP-Paket, Turbo-Dünger ×6,
   Jackpot ×80). Lotteriegewinne zählen **nicht** zu `totalEarned` —
   das Unlock-Pacing bleibt verkaufsgetrieben.
4. **Turbo-Dünger:** Los-Gewinn; jede Ladung verdoppelt genau eine
   Ernte (HUD-Chip zeigt den Vorrat). Das passive Ertrags-Upgrade
   heißt zur Abgrenzung jetzt „Kompost" (id unverändert).

Save-Format: v7 (`waterLeft` je Beet, Bestands-Crops erhalten volle
Ladungen) und v8 (`scratchTickets`, `fertilizerCharges`).

Der ursprüngliche Phasenplan (§8) läuft danach ab Phase 2 weiter;
der Upgrade-Shop aus R4 ersetzt die Bewässerungs-Upgrades aus Phase 2.
