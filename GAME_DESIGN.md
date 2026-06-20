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
- **Belohnung:** `Kompost = floor(√(lifetimeEarned / 1e6)) − bereits
  besessener Kompost` — Mini-Runden-Farming bringt nichts extra;
  erstes Prestige lohnt ab ~1M Einnahmen.
- **Effekt:** pro **effektivem** Kompost-Punkt **+25 % Ertrag** und
  **+10 % Wachstumstempo**; effektive Punkte = `Kompost^0.5` (Softcap
  gegen die Prestige-Spirale, siehe Balance-Audit §9.11). Pachten
  erst, wenn der Gewinn ≥ Parzellenzahl ist — selten und wuchtig.
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
| **3** | Helfer (Auto-Ernte, Auto-Aussaat, Auto-Verkauf) inkl. Offline-Simulation | ✅ via §9.10 |
| **4** | Prestige: Parzellen + Kompost | ✅ via §9.9 |
| **5** | Beerensträucher (Wiederernte), Obstbäume, passive Holz-Bäume | ✅ via §9.9 + §9.12 |
| 6 | Hecken/Zier (Schönheits-Multiplikator), Cannabis + Lizenzen | Zier ✅ via §9.11; Cannabis offen |
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
- **Sound als prozeduraler WebAudio-Synth** (`ui/fx/audio.ts`): alle
  Effekte werden in Code synthetisiert (keine Audio-Assets), hinter der
  stabilen API `playSound(id, pitch?)` mit Master-Kompressor,
  Zufalls-Detune gegen Wiederholungsmüdigkeit und Pro-Event-Drosselung
  (16 gleichzeitig reifende Beete = ein Pling). Ernte-Sounds steigen
  mit der Combo-Kette im Pitch. Mute-Schalter in den Einstellungen
  (localStorage). Vertonte Events: Säen, Gießen, Reife, Ernte,
  Crits, Verkauf, Kauf, Klick/Fehler, Unlock, Level-Up, Los-Fund,
  Rubbeln, Overlay auf/zu, Willkommen-zurück.
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
3. **Rubbellose:** 4 % Drop-Chance pro geerntetem Beet (Vorrats-Limit = max(5, Gärtner-Level),
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

### 9.9 Endless-Update „Parzellen, Bäume & Pick-3"

Antwort auf das Feedback „zu schnell durchgespielt, Balance unlogisch,
Level/Aufträge/Lose zu beliebig":

1. **Balance-Regeln (testgesichert in `npm test`):** Steady-State-Gewinn/s
   verdoppelt sich grob mit jeder Sorte (0.25 → ~1000); Einmal-Pflanzen
   verdreifachen den Samenpreis pro Ernte mindestens; Wiederernte-Pflanzen
   amortisieren sich in ≤ 3 Ernten. Gewinn/s steht im Hotbar-Tooltip.
2. **13 Sorten in 4 Kategorien** (Hotbar mit Tabs, Tab-Taste wechselt):
   Kräuter (4), Gemüse (3), **Beeren** (3) und **Obstbäume** (3).
   Beeren/Bäume haben `regrowTime`: einmal pflanzen, kürzere Folgezyklen
   für immer (frische Gieß-Ladungen pro Zyklus, Shift-Klick rodet).
   Baum-Zyklen von 45 min bis 3 h tragen das Offline-Spiel über Tage.
3. **Prestige „Neue Parzelle"** (§6 umgesetzt): ab 1M Runden-Einnahmen
   Kompost = floor(√(verdient/1e6)); Reset von Geld/Beeten/Lager/
   Upgrades/Aufträgen, +4 Beete Maximum pro Parzelle, Kompost gibt
   permanent +5 % Ertrag und +2 % Tempo pro Punkt.
4. **Level ist permanent:** +1 % Ertrag pro Level über 1, übersteht
   Prestige — XP hat damit einen klaren, dauerhaften Zweck.
5. **Aufträge 2.0:** Bronze/Silber/Gold (×1.3/×1.6/×2.0, Gold legt ein
   Los bei), benannte Auftraggeber, Lieferserie +2 %/Lieferung (Cap
   +30 %), Skips brechen die Serie.
6. **Rubbellose 2.0:** verdecktes 3×3-Brett mit garantiert genau einem
   Drilling; der Spieler rubbelt 3 Felder — 3 Treffer voller Gewinn,
   2 Treffer 40 %, sonst Trostpreis. Abbruch erstattet das Los.

Save-Format: v9 (regrowing), v10 (parcels/compost/lifetimeEarned),
v11 (Auftrags-Stufen/Auftraggeber/questStreak).

### 9.10 Mega-Ausbau „Shop 2.0, Helfer & Magie"

1. **Shop in drei Rubriken** (`data/upgrades.ts`, 11 Items): Boosts
   (Tempo/Ertrag/Preis, Wasserfass: +1 Gieß-Ladung, Sternenuhr: +0.5 s
   Combo-Fenster), Glück (Glücksklee: Crit-Chance, Glückslos:
   Los-Chance, Nachteule: Offline-Cap 8→24 h) und **Helfer**.
2. **Helfer = Phase 3 (§4):** Erntehelfer (+0.4 Beete/s je Stufe),
   Sä-Gnom (sät die gewählte Sorte nach) und Marktkarren (verkauft das
   Lager, je Stufe öfter). Laufen vollständig in `tick()` → identisch
   live und offline; bewusst ohne Crits/Combo/Lose, damit aktives
   Spielen die Juice-Momente behält.
3. **Offline gechunkt:** Catch-up läuft in 60-s-Schritten durch
   denselben Tick — Wiederernte-Zyklen und Helfer produzieren über
   Nacht; der Willkommens-Toast beziffert Helfer-Ernte und Gold.
4. **Magie-Kategorie** (nach dem ersten Prestige, Unlocks 5B/25B/150B):
   Mondblume, Kristallbeere (Wiederernte), Weltenbaum (24-h-Erstwuchs)
   — die Gewinn/s-Kurve verdoppelt konsistent weiter bis ~8K/s.

Save-Format: v12 (`helperAcc`). XP-Vergabe liegt in `game/xp.ts`
(geteilt von Aktionen und Helfern).

### 9.11 Balance-Audit & Zierpflanzen

**Balance-Werkzeug:** `npx tsx scripts/balance.sim.mjs [h aktiv/Tag]`
spielt das Spiel mit dem echten Core durch und druckt Meilenstein-
Zeiten. Gefundene & behobene Probleme: Stack-Overflow bei Massen-
Level-Ups (Cap 50/Grant), Level-Ertragsbonus auf +100 % gedeckelt,
Prestige-Spirale entschärft (Lifetime-Delta-Formel + Kompost-Softcap
^0.7). Ziel-Pacing (2 h aktiv/Tag): Kürbis ~15 m, Prestige #1 ~45 m,
Bäume Tag 1, Mondblume Tag ~4, Weltenbaum Tag ~10, Prestige ~1×/Tag.

**Feedback-Runde (Spieler-Test):** Rubbellos wertet jetzt die drei
GERUBBELTEN Symbole: jedes Paar = Teilgewinn des jeweiligen Symbols,
der versteckte Drilling (1/84) = Hauptgewinn ×10; Abbruch erstattet.
Los-Drops skalieren mit der Wuchszeit (0.02/min, Cap 35 %) statt pro
Klick — Basilikum-Spam bringt nichts mehr. Kompost kräftiger
(+25 % Ertrag/+10 % Tempo je effektivem Punkt) bei härterem Softcap
(^0.5); Pachten erst ab Gewinn ≥ Parzellenzahl — selten und wuchtig
statt Mini-Prestiges. Ertrags-% überall erklärt (Chance auf
Extra-Einheiten). Ziffern größer/heller (Lesbarkeit).

**Zehner-Paket (alle vom Spieler bestätigt):** Massen-Aktionen
(»Alle säen/gießen«), Marktwelle ±30 % über ~10 min (Aufträge bleiben
Festpreise), Tagesbonus mit 7-Tage-Serie, Goldener Glühwurm
(Golden-Cookie-Moment), Wetter-Events (Regen/Sternschnuppen/Marktboom,
live-only), passive Holz-Bäume (Eiche 32/s, Mammutbaum 480/s — §3 #5),
22 Achievements à +1 % Ertrag, Cannabis hinter 3 Lizenzen mit
Pflege-Malus (§3 #7), Rekorde + 24-h-Einnahmen-Graph, generative
Chiptune-Musik + Nacht-Ambience. Save v13–v18. Seit Phase 9 (§9.12)
42 Sorten in 8 Kategorien.

**Zierpflanzen (§3 #6 umgesetzt):** Nachtrose (+5 %, 250K),
Leuchtlilie (+8 %, 8M), Sternenhecke (+12 %, 400M). Keine Ernte —
ausgewachsen heben sie den globalen Verkaufspreis, solange sie ein
Beet belegen (`beautyBonus`, wirkt über `sellMultiplier` auch für den
Marktkarren). Aufträge/Lose klammern Zier aus; Helfer ignorieren sie.

Der ursprüngliche Phasenplan (§8) läuft danach ab Phase 2 weiter;
der Upgrade-Shop aus R4 ersetzt die Bewässerungs-Upgrades aus Phase 2.

### 9.12 Feinschliff-Phasen (Spieler-Feedback 2.0)

Laufende Qualitätsrunde in kleinen, einzeln abgenommenen Phasen:

- **Phase 0 — Los-Limit:** Rubbellos-Vorrat hängt am Gärtner-Level
  (`max(5, Level)` via `maxScratchTickets()`), damit das Limit mitwächst.
- **Phase 1 — Softlock-Schutz & Feldkontrolle:** Roden ist touch-tauglich
  (Roden-Modus-Button im Garten-Kopf, Shift-Klick bleibt als Shortcut)
  und erstattet **50 % des Saatpreises**; bei dauerhaften Pflanzen
  (Wiederernte/Zier/Holz) fragt die UI nach. Zusätzlich Notgroschen-
  Garantie im Tick: wer mit < Startkapital, leeren Beeten und leerem
  Lager dasteht, bekommt das Startkapital zurück — ein Festfahren ist
  damit unmöglich.
- **Phase 2 — Lager-Teilverkauf & Auftragsschutz:** Verkaufsmenge im Lager
  wählbar (25/50/75 %/Alles oder genaue Stückzahl per Eingabefeld).
  **Auftragsschutz:** was offene Aufträge brauchen (`questReserved`),
  bleibt bei Schnellverkäufen, beim HUD-Verkaufen-Button und beim
  Marktkarren liegen — nur eine explizite Stückzahl verkauft auch
  Reserviertes. Der Marktkarren verkauft damit nur noch Überschuss
  (Mindestbestand = Auftragsbedarf), live wie offline.
- **Phase 3 — Auto-Aussaat entkoppelt & faire Auto-Ernte (Save v19):**
  Der Sä-Gnom hat eine eigene Sorte (`autoSowPlantId`, `autoSowChoice()`):
  null = folgt der Handauswahl (altes Verhalten), gepinnt = sät fest diese
  Sorte, egal was du gerade von Hand wählst. Umschalter im Garten-Kopf,
  nur sichtbar wenn der Gnom existiert. Auto-Ernte ist jetzt fair: im
  Live-Spiel wirft sie Rubbellose mit derselben zeitbasierten Chance ab
  wie das Ernten von Hand (Taschen-Cap gilt), der gechunkte Offline-Pass
  bleibt los-frei (`tick(state, dt, { offline: true })`), damit kein
  Heimkommen die Tasche flutet. Kombo bleibt bewusst reine Aktiv-Belohnung.
- **Phase 4 — Desktop-Topbar, Event-Feld & Overlays:** Die HUD misst ihre
  echte Höhe und legt sie als CSS-Variable `--hud-h` ab. Content-Padding,
  Wetter-Banner und Toasts richten sich daran aus — die Topbar darf jetzt
  umbrechen, ohne Spielfeld oder Banner zu überlappen (statt hartem
  `top: 86px`). Banner blockieren keine Buttons mehr: das Wetter-Banner ist
  `pointer-events: none`, der Toast-Container ebenso (einzelne Toasts bleiben
  klickbar). Das Settings-Zahnrad sitzt auf breiten Desktops (≥ 1100 px) als
  eigener Knopf optisch außerhalb der Topbar in der Ecke; auf schmalen
  Screens bleibt es — durch einen Trenner abgesetzt — in der HUD (kein
  Mobile-Regress). Reine UI/CSS-Phase, kein Save-Format-Change.
- **Phase 5 — Mobile-UI & Touch:** `viewport-fit=cover` + Safe-Area-Tokens
  (`--safe-top/bottom/left/right` aus `env(safe-area-inset-*)`); HUD,
  Hotbar, App-Padding, Overlays, Banner/Toasts halten jetzt Abstand zu
  Notch/Home-Indicator. Höhen auf `dvh` umgestellt (App, Body, Overlay) —
  kein abgeschnittenes Layout mehr hinter der mobilen URL-Leiste. Touch-
  Targets ≥ 44 px via `@media (pointer: coarse)` (Maus-Desktop behält die
  kompakten Buttons); `touch-action: manipulation` + entfernter Tap-Highlight.
  Gegen Überlauf: HUD-Zeile bricht um (gefahrlos dank `--hud-h`, Spacer auf
  Phones aus), Hotbar-Tabs/-Slots scrollen auf Phones horizontal mit
  Snap, Garten-Kopf bricht um. Geprüfte Breakpoints 360/390/430/667/768/
  1024 — mehrstufig statt Single-Breakpoint. Kein Save-Format-Change.
- **Phase 6 — Balancing-Simulation:** `scripts/balance.sim.mjs` bekommt einen
  zweiten Modus. Default = **Erste-Session-Pacing**: durchgehend aktives
  Greedy-Spiel mit Snapshots bei 5/15/30/60/120 min (Geld, verdient, Level,
  Beete, freie Sorten, Prestige-Bereitschaft, beste Sorte) plus Unlock- und
  Prestige-Zeitpunkten. `node scripts/balance.sim.mjs day [h]` fährt weiter
  den 14-Tage-Langzeit-Audit. Befund: Früh-Pacing liegt auf den
  GAME_DESIGN-Zielwerten — Kürbis ~12–14 min (Ziel 15), Prestige #1 ~23 min
  durchgehend bzw. ~38 min bei 2 h/Tag (Ziel 45), Bäume Tag 1, stetiger
  Unlock-Drip ohne Totzonen oder Raketenstart, kein Softlock. **Bewusst
  keine Balance-Werte geändert** — die Kurve ist gesund; Subsystem-Tuning
  (Shop/Gießen/Tagesbonus) gehört in Phase 7, die Sorten-Verteilung über
  die Spielphasen in Phase 9. Reine Tooling-/Verifikationsphase, kein
  Code-Pfad und kein Save-Format berührt.
- **Phase 7 — Shop/Passiv/Tagesbonus/Gießen-Balance:** Subsystem-Audit als
  `node scripts/balance.sim.mjs subsystems` (Passiv-Bäume vs. beste aktive
  Sorte derselben Stufe in Gold/s, Tagesbonus-Summe, Gieß-Mechanik). Befund:
  Tagesbonus/Glühwurm skalieren linear mit der besten Sorte und zählen nicht
  als Einnahme (kein Runaway); Gießen ist pro Sorte gedeckelt und aktiv-
  belohnend; der Shop folgt sauberen Idle-Kurven. Einzige Justierung:
  **Eiche 28 → 32 Gold/s** — der frühe Passiv-Baum lag mit ×0,88 knapp unter
  dem gesunden Band, jetzt ×1,01 (Parität mit Erdbeere bei null Aufwand +
  Offline-Lauf). Mammutbaum (×1,86) bleibt — die Spanne kauft die fehlenden
  Crit/Kombo/Auftrags/Lose-Boni der Bäume ein. Offen für Phase 9: ein
  mittlerer Passiv-Baum zwischen Eiche (800K) und Mammutbaum (120M). Save-
  Format unverändert (Passiv-Wert ist Pflanzen-Definition, keine Migration).
- **Phase 8 — Quests & Begriffe:** Neues optionales Feld `produce` je Sorte
  (Ernteprodukt im Plural) + Helfer `produceName()` (Fallback = Pflanzenname).
  Aufträge liefern jetzt das **Produkt** statt der Pflanze („Liefere 80×
  Äpfel" statt „… Apfelbaum"), genauso das Lager-Panel. 15 erntbare Sorten
  bekamen ein Produkt (Äpfel, Kirschen, Erdbeeren, Kürbisse, Mondblüten,
  CBD-Blüten …); Kräuter fallen auf den Namen zurück. Kategorien geschärft:
  die Passiv-Holzbäume heißen jetzt **„Holz"** (statt „Bäume"), klar getrennt
  von den Obstbäumen unter **„Obst"**. Reine Daten/Text-Phase, kein
  Save-Format-Change (`produce` ist Definition, kein gespeichertes Feld).
- **Phase 9 — Sorten-Verdopplung (24 → 42):** 18 neue Sorten, über alle
  Spielphasen verteilt. Harte Randbedingung: die testgesicherte Profit-Kette
  (jede erntbare Sorte > 1,5× der vorigen) ist mit ~2×-Schritten zu dicht zum
  Einschieben — neue **erntbare** Sorten erweitern daher die Endgame-Decke
  (5 Magie-Früchte: Sternfrucht, Nebelbeere, Phönixfrucht, Ewigkeitsblüte,
  Weltenrose, bis ~2,4 M Gold/s). **Zier** und **Holz** sind kettenfrei und
  füllen Früh-/Mittelspiel: 9 neue Zierpflanzen (Veilchen → Himmelsorchidee,
  Schönheit 2 → 18 %) und 4 neue Passiv-Bäume. Die Passiv-Leiter ist jetzt
  lückenlos (Phase-7-Notiz erledigt): Eiche 32 → **Walnussbaum 150** →
  Mammutbaum 480 → **Goldahorn 1700** → **Ebenholz 16000** → **Mondzeder
  150000** Gold/s, alle im 0,9–1,9×-Band (Audit `… subsystems`). Sprites sind
  Code: jede neue Sorte erbt ihre frühen Wachstumsstufen (wie
  `medizinalhanf1 = cbdhanf1`) und bekommt ein eigenes 16×16-Reife-Grid; ein
  Validierungsskript prüft 16×16 + Legenden-Zeichen + drei Stufen je Sorte.
  Additive Daten, kein Save-Format-Change (neue IDs entstehen unlock-gegated).
- **Phase 10 — Sprites & Wachstumsstufen:** Der gemeinsame Einheits-Setzling
  der frühesten Stufe wird durch **kategoriespezifische Sprouts** ersetzt:
  Kräuter, Gemüse (mit Wurzelansatz), Beeren (erste rote Knospe), Obst &
  Holz (kleiner Stamm), Zier (Blütenknospe), Magie (Funkeln), Cannabis
  (gezacktes Blatt) — `seedling-<category>` in `ui/pixel/sprites.ts`, gewählt
  in `Plot.svelte` über die Kategorie. Frisch gesäte Beete sprießen jetzt „in
  character" statt alle gleich; Wiederernte-Pflanzen überspringen den Sprout
  (starten bei Stufe 1) wie bisher. Reine UI/Sprite-Phase, kein Save-Format-
  Change; das Sprite-Validierungsskript deckt auch die 8 neuen Sprouts ab.
- **Phase 11 — Gesamt-Review & QA:** Vollständiger Durchgang (Core, UI,
  Save/Migration, Balance über alle Phasen, Mobile). Befunde & Fixes:
  (1) Der Langzeit-Audit der Sim stallte nach dem ersten Prestige — Ursache:
  der Greedy erfüllt nie Aufträge, und der Phase-2-Auftragsschutz hielt das
  gesamte Lager reserviert → `sellAll()` verkaufte nichts. **Fix:** der
  Greedy verkauft per exakter Menge (umgeht die Reservierung); der Audit läuft
  wieder bis Tag 14 und bestätigt gesunde Verteilung aller 42 Sorten.
  (2) Dasselbe deckte ein latentes Softlock-Risiko auf: 0 Geld + leere Beete +
  Lager komplett auftragsreserviert. **Fix:** der Notgroschen ist jetzt
  reservierungs-bewusst (auftragsgebundenes Lager zählt als nicht frei
  verfügbar). (3) Der Sä-Gnom sät keine Zier-/Passiv-Pflanzen mehr automatisch
  (Geld-Drain-Foot-Gun). (4) UI-Politur: aria-labels auf allen HUD-Icon-Buttons,
  Hotbar-Tooltip auf Mobil breitenbegrenzt. Regressionstest ergänzt (38 Tests).
  Keine Save-Format-Änderung.

### 9.13 Endgame 2.0 — Tiefe, Entscheidungen, Gold-Sink, Bedienkomfort (Save v20)

Antwort auf „Endgame läuft zu schnell leer, Fortschritt zu linear, beste
Pflanze überall". Drei Systeme, robust und testgesichert:

- **Massenroden + Undo (Endgame-QoL):** „Alles roden" rodet alle bepflanzten
  Beete auf einmal (50 % Saatpreis zurück). **Keine blockierende Bestätigung
  mehr** — auch das Einzel-Roden fragt nicht mehr nach; stattdessen erscheint
  nach dem Massenroden 8 s lang „X Pflanzen gerodet · Rückgängig" (`clearAllPlots`/
  `restorePlots`, Undo nur über noch leere Beete, Geld wird zurückgebucht).
  Undo ist Session-State → kein Save-Format-Risiko.
- **Pflanzen-Meisterschaft (`mastery`, übersteht Prestige):** jede geerntete
  Einheit zählt als Meisterschafts-XP der Sorte; Level =
  `floor(log2(harvested/120 + 1))`, gedeckelt bei 10 → bis **+100 % Ertrag**
  für genau diese Sorte. Belohnt das Dranbleiben an / Zurückkommen zu einer
  Sorte: eine voll gemeisterte Sorte schlägt die nächste ungemeisterte Stufe
  → „immer die neueste" ist nicht mehr automatisch optimal. Anzeige im Hotbar-
  Tooltip.
- **Kategorie-Spezialisierung (`specializations`, Gold-Sink, übersteht
  Prestige):** pro Kategorie mit **Gold** kaufbar, +8 % Ertrag/Stufe für alle
  Sorten der Kategorie; Kosten ×3,4/Stufe (5 M Basis) — man kann nicht alles
  maxen, sondern muss wählen, worauf man sich spezialisiert. Gibt Endgame-Gold
  echten Wert. Sektion im Shop.

Save v19 → v20: `mastery`/`specializations` als leere Maps ergänzt (alte
Saves unbetroffen, `leaseParcel` setzt beide bewusst NICHT zurück). Ertrag
wird jetzt aus `… × masteryYieldBonus × specializationYieldBonus` gerollt
(beide ×1 ohne Investition → Baseline unverändert). Sim erweitert: Level-
Meilensteine 50/100/250/500/1000, Parzelle 5/10/20/40, erste Endgame-Pflanze,
„Beete voll", „alle 42 Sorten", plus Gold-Sink- und Meisterschafts-Bilanz.

**Ehrliche Einordnung:** Diese Systeme schaffen Tiefe, Entscheidungen, einen
Gold-Sink und Dauerziele — sie bremsen die Roh-Pacing aber nicht künstlich
(Mastery/Spez. sind Power-Layer). Echte Pacing-Bremsen (steilere Spät-
Kostenkurven, straffere Prestige-Spirale) und weitere Endgame-Systeme
(Parzellen-Meilensteine, Endgame-Auftragstypen, Achievement-Ziele) sind als
nächste Phasen vorgesehen.

### 9.14 Phase 12 — Quest-Qualität, Bedienkomfort, Idle-Upgrades (Save v21)

Gezielte QA-Nachbesserungen, keine neuen großen Systeme:

- **Post-Prestige-Aufträge (`maxUnlockEarned`, übersteht Prestige):** neuer
  persistenter Höchststand des Runden-Verdienstes. `generateQuest` zieht aus
  einem Tier-Band `[reach / questBandWidth, reach]` mit
  `reach = max(totalEarned, maxUnlockEarned × questReachFactor)`. Nach Prestige
  kippen Aufträge nicht mehr auf Basilikum zurück, bleiben aber ≤ dem je
  erreichten Niveau → immer (bald) erfüllbar; das Band lässt triviale Frühsorten
  weg, sobald man fortgeschritten ist. Frischer Start fragt weiter Basilikum.
- **Lager: reserviert vs. frei** — jede Zeile zeigt „🔒 X reserviert · Y frei",
  der Hinweis erklärt, dass Schnellverkauf/„Lager verkaufen"/Marktkarren nur den
  **freien** Überschuss verkaufen; der Bulk-Button ergänzt „· nur Überschuss".
- **Wasserfass & Sternenuhr bekommen Idle-Nutzen** (vorher reine Aktiv-Upgrades):
  Wasserfass gibt zusätzlich +3 % Wachstum/Stufe (wirkt offline) und zählt zur
  Cannabis-Bewässerungsstufe; Sternenuhr gibt +1 h Offline-Cap/Stufe. Modest,
  keine Breakpoints — Sim bestätigt kein Runaway (beide maxed gekauft, Zahlen
  finit, Pacing nahezu unverändert).
- **Touch-Info:** Hotbar-Tooltip öffnet jetzt auch bei `:focus` (Tap auf Touch
  zeigt die Sorten-Info), `pointer-events:none` bleibt → blockiert nichts.
- **Toasts unter Modals:** z-index 60 → 45 (unter Modal-Backdrop 50), damit
  Panels lesbar bleiben; Toasts erscheinen weiter im normalen Spiel.
- **Massenroden + Undo** (bereits in §9.13 ausgeliefert): „Alles roden" +
  8-s-Undo, keine Confirm-Dialoge — erfüllt Phase-12-Punkt C.

Save v20 → v21: `maxUnlockEarned` ergänzt (alte Saves: aus `totalEarned`
geseedet). Sonst keine Format-Änderung.

### 9.15 Phase 13 — Auftrags-Vielfalt, faire Mengen, Parzellen & Kompost (Save v22)

Mehr Endgame-Entscheidungen ohne neue Pflanzen/Preise:

- **Faire Auftragsmengen:** Menge = was ein (auf 24 Beete gedeckeltes) volles
  Feld in `questEffort` Sekunden produziert → langsame Endgame-Sorten verlangen
  kleine Mengen (oft nur eine Ernte), schnelle größere. Auftragsschwierigkeit =
  Zeit × Wert, nicht nur Preis.
- **Auftragstypen (generalisiertes `items[]`):** **Single**, **Kombi**
  (2 Sorten), **Kategorie** („X aus Beeren", Belohnung nach der günstigsten
  Sorte der Kategorie → kein Exploit), **Groß** (×4 Menge, ×2,2 Belohnung,
  +1 Los). Kombi/Kategorie motivieren Sortenvielfalt. Reservierung ist
  kategorie-bewusst (`questReserved`), Erfüllung verbraucht aus der ganzen
  Kategorie.
- **Belohnung skaliert** mit Schwierigkeit (Wert × Tier × Typ-Bonus) und
  Fortschritt (Parzellen-/Kompost-Auftragsbonus); Mehrteilig: Gold + XP + Lose.
- **Parzellen-Meilensteine** (`data/milestones.ts`, überstehen Prestige):
  Parzelle 2 +5 % Ertrag, 3 +5 % Tempo, 5 +1 Auftragsslot, 8 +5 % Los-Chance,
  10 +25 % Auftragsbelohnung, 15 +4 h Offline, 20 +15 % Ertrag. Sichtbar im
  Prestige-Panel mit nächstem Ziel.
- **Kompost-Garten** (`data/compostUpgrades.ts`): Kompost wird ausgebbar für
  dauerhafte Boni (Fruchtbarer/Lockerer Boden, Wurzelnetz, Nährstoffspeicher,
  Auftragshumus), teils ab Parzelle X. **Ausgeben schwächt den Prestige-Bonus
  nicht** — `compostSpent` wird getrennt geführt, `compost+compostSpent`
  (= je verdient) treibt Flat-Bonus und nächsten Gewinn (`compostClaimed`),
  kein Double-Dip. Panel-Sektion mit Kosten/Stufen.

Save v21 → v22: Aufträge aufs `items[]`-Modell migriert (alte Einzel-Aufträge
konvertiert), `compostSpent`/`compostUpgrades` ergänzt. Sim-Audit: Level-,
Parzellen-(5/10/20/40) und Endgame-Meilensteine, kein Runaway/NaN.

### 9.16 Phase 14 — Meisterschaft & Kategorie-Spezialisierung vertieft (Save v23)

Baut die Endgame-2.0-Systeme aus (keine neuen Pflanzen, keine Economy-
Neufassung):

- **Pflanzen-Meisterschaft (Bestand, präzisiert):** jede geerntete Einheit
  zählt als Meister-XP der Sorte — manuell **und** per Helfer (`tick`). Nicht-
  erntbare Sorten (Zier mit `yield 0`, passive Holz-Bäume) geben **keine** XP,
  weil `units` dort 0 ist. Anzeige von Level + Bonus im Hotbar-Tooltip
  („🏅 Meisterschaft Lv X/10 · +Y % Ertrag"). Übersteht Prestige.
- **Kategorie-Spezialisierung mit eigenem Bonus pro Kategorie
  (`data/specializations.ts`):** jede Stufe gibt weiterhin den geteilten
  +8 % Ertrag — **plus** einen kleinen, kategorie-eigenen Zweitbonus:
  Kräuter +5 % Wuchs, Gemüse +1 % Gold-Ernte, Beeren/Obst +6 % Nachreife,
  Holz +8 % Holz-Gold, Zier +8 % Schönheit, Hanf +0,04 Lose/Min,
  Magie +20 % Meister-XP. Jeder Bonus hängt an genau einem Core-Hook
  (Wachstums-Tick, Nachreife, Crit-Roll, Los-Glück, Holz-Einkommen,
  Schönheit, Meister-XP) → klein, additiv, offline-konsistent.
- **Gold + Kompost als Kosten, Fortschritts-Gates:** Goldkurve ×3,4/Stufe wie
  bisher; ab Stufe `specCompostFromLevel` (8) zusätzlich Kompost
  (`compost`/`compostSpent` getrennt → Prestige-Bonus bleibt heil). Spätere
  Stufen verlangen Parzellen (`1 + ⌊level/4⌋`) und Gärtner-Level
  (`1 + level×2`). `specializationPurchase()` bündelt Kosten/Gates für die UI.
- **Kompakte Shop-Sektion (Desktop/Mobile):** pro Kategorie Stufe, Zweitbonus-
  Beschreibung + aktiver Wert, Gold- **und** Kompostkosten am Button, und eine
  „braucht … Parzellen/Level"-Zeile bei nicht erfüllten Gates (abgedimmt).

Save v22 → v23: keine neuen persistenten Felder — die Zweitboni leiten sich aus
den vorhandenen `specializations`-Stufen ab, der Kompost-Abzug läuft über
`compost`/`compostSpent`. Alte Saves laufen unverändert weiter; `sanitize()`
deckelt Spezialisierungs-Stufen weiterhin auf `specMaxLevel`. Sim-Audit
(14 d / 277 Prestiges): Spezialisierung kauft mit Gold+Kompost ohne Runaway.

### 9.17 Phase 15 — Late-Game-Rebalance: Spezialisierung, Kompost-Sinks, Pflanzenleiter (Save v24)

**Harte Diagnose zuerst** (`scripts/diagnose.mjs`, modelliert den gemeldeten
Spielstand Lvl 886 / 326K Kompost / +14664 % Ertrag): drei kaputte Verhältnisse
gefunden — (1) **Kompost-Sink ~18× zu klein**: alle gedeckelten Kompost-Upgrades
zusammen kosten 18,2K Kompost, ein Prestige zahlt ~935K → riesiger Überschuss
ohne Ziel; (2) **Spezialisierung Kosten×3,4/Stufe vs. Nutzen flach +8 %/Stufe**
→ ab ~Stufe 15 sinnloser Kauf; (3) **Prestige überspringt die Leiter** — mit dem
persistenten ×416-Ertragsmultiplikator sind nach 5 min 36/42 Sorten wieder frei.

Behoben (zwei Systeme gezielt + Leiter-Kosmetik):

- **Spezialisierung eskaliert + Meilensteine (`data/specializations.ts`,
  `modifiers.ts`):** der Ertragsbonus wächst pro 5er-Stufe (`specTierStep`),
  Stufe 25 ≈ +225 % statt linear +200 % bei viel besserer Spät-ROI; alle
  5 Stufen ein **Meilenstein**, der den kategorieeigenen Zweitbonus verstärkt
  (`specPerkMultiplier`: ×1 → ×3,5 bei Stufe 25). Kostenfaktor 3,4 → 2,5
  (hohe Stufen erreichbar), Kompostkosten ab Stufe 8 jetzt **geometrisch**
  (Stufe 24 ≈ 74K Kompost) → echter Kompost-Sink + Entscheidung.
- **Endlose Kompost-Sinks (`data/compostUpgrades.ts`):** drei **wiederholbare**
  Upgrades (Urhumus/Ertrag, Tiefenkultur/Tempo, Markt-Mykorrhiza/Aufträge),
  freigeschaltet ab Parzelle 12/14/16. Geometrische Kosten ⇒ **log-gedeckelter
  Effekt** (kein Runaway), aber Kompost hat dauerhaft ein sinnvolles nächstes
  Ziel und einen Pfad-Entscheid. Die fünf gedeckelten Upgrades bleiben der
  Frühphasen-Sink.
- **Pflanzenleiter-Spitze gestreckt:** die letzten Unlocks weiter auseinander
  (Phönixfrucht 120T→150T, Ewigkeitsblüte 500T→1Qa, Weltenrose 2Qa→8Qa) →
  längerer End-Climb. Nur Unlock-Schwellen, Erträge/ROI unangetastet (Invarianten-
  Test grün). Die echte Prestige-Skip-Reparatur (Unlock-Gating skaliert mit dem
  Kompost-Multiplikator) ist als **Phase 16** vorgemerkt — zu risikoreich für
  einen blinden Schnellschuss.
- **UI:** Shop-Spezialisierung zeigt eskalierenden Ertrag, nächste-Stufe-Vorschau,
  Meilenstein-Ziel + ★-Multiplikator-Tag und Kategorie-Akzentfarben (visuelle
  Identität trotz ähnlicher Sprites); Prestige-Panel markiert endlose Sinks mit ∞.

Save v23 → v24: keine neuen persistenten Felder — Spezialisierungs- und Kompost-
Upgrade-Stufen behalten die `Record<string,number>`-Form (neue Kompost-IDs
defaulten auf 0), umpreiste künftige Käufe berühren gespeicherte Werte nicht;
`compostSpent`-Sanitize-Deckel auf 1e15 angehoben. Sim-Audit (14 d): kein
Runaway/NaN, Kompost wird jetzt **ausgegeben** (Sink wirkt), Spezialisierung
geht tiefer (magie 17→21).

### 9.18 Phase 16 — Core Loop, Motivation & UI-Overlay-Regel (keine Save-Änderung)

Fokus auf Spielgefühl statt Zahlen: zwei Systeme gezielt, plus die harte
Overlay-Regel. **Loop-Diagnose:** das Spiel hat viele Systeme, aber kein
sichtbares „nächstes Ziel" — der Spieler sieht Multiplikatoren, aber nicht,
*worauf* er hinarbeitet. Event-Banner und Toasts lagen zudem über der Garten-
Aktionsleiste.

- **UI-Grundregel „nichts verdeckt Hauptaktionen" (B):** der Wetter-Event-Banner
  rendert jetzt **im Layout-Fluss** in einer Notification-Zone oben im Stage
  (`App.svelte` `.notify-zone`), oberhalb der Garten-Toolbar — er **reserviert
  Platz** statt zu überlagern, kann also „Alle säen/gießen/ernten/roden" nie
  verdecken (bleibt `pointer-events: none`). Toasts sind ans **untere Ende über
  die Hotbar** verschoben (`bottom: safe-bottom + 134px`), weg von der oberen
  Toolbar; Z-Index unter dem Modal-Backdrop bleibt (Phase 12). Damit blockiert
  keine temporäre Meldung mehr einen Hauptbutton — Desktop wie Mobile.
- **Ziel-System (C, `game/goals.ts` + `ui/GoalsPanel.svelte`):** ein reiner,
  testbarer Generator projiziert aus dem State mehrere **gleichzeitige Ziele**
  über vier Horizonte — kurz (nächste Sorte, nächstes Upgrade), mittel (Auftrag,
  Spezialisierungs-Meilenstein), lang (Parzelle, Parzellen-Meilenstein,
  Meisterschaft) und Endgame (Kompost-Sink, alle Sorten). Jedes Ziel hat
  Fortschrittsbalken, klare Belohnung und „✓ bereit"-Markierung. Erreichbar
  über einen HUD-Button (✨) mit Badge = Anzahl sofort einlösbarer Ziele.
  Keine neuen persistenten Daten — read-only Sicht auf den State.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 24): das Ziel-System leitet
alles aus vorhandenem State ab, der Overlay-Fix ist reine UI/Layout-Änderung.
Achievements-Tiers, Rubbellos-Spannung und ein Event-Ausbau sind als spätere
Phase vorgemerkt (bewusst nicht halbgar mitgenommen).

### 9.19 Phase 17 — Kategorie-Identität, Zier-Rework & Skill-Tree-Vertical-Slice (Save v25)

**Kategorie-Diagnose** (`scripts/diagnose.mjs`): die meisten Kategorien sind
Direktertrag (aktiv ernten), Holz ist Passiv/Offline, **Zier ist Aura** — kein
Direktertrag, dafür globale Boni. Problem: die Aura war stark, aber unsichtbar
und ohne Identität, daher fühlte sie sich wie Beetverlust an.

- **Zier-Rework — Schönheit als Build (`data/beautyMilestones.ts`):** reife
  Zierpflanzen erzeugen „Schönheit"; Schwellen schalten **garten­weite Aura-
  Perks** frei, die aktiv bleiben *solange die Schönheit gehalten wird* —
  +Auftragsbelohnung (0,15), +Los-Glück (0,4), +Wuchs (0,8), +Gold-Ernte (1,5),
  +12 % Ertrag (3,0). Damit wird Zier eine echte Strategie: Beete für Schönheit
  opfern → den ganzen Garten auf neuen Achsen stärken. Boni sind nicht-Gold →
  skalieren mit dem eigenen Output, kein Runaway. Sichtbar als „✿ Schönheit"-
  Chip im Garten + als Ziel im Ziel-Panel. Diagnose: 6 Zier + 50 Gold schlägt
  56 Gold deutlich (Aura > Beetverlust) → Build ist konkurrenzfähig.
- **Skill-Tree-Vertical-Slice (`data/skills.ts` + `game/skills.ts` +
  `ui/SkillsPanel.svelte`):** ein kleines **Meta-System**, kein zweiter Shop.
  Skillpunkte kommen aus **Fortschritt** (1/Parzelle + 1/Erfolg + 1 je 20 Level),
  nie aus Gold. Fünf Knoten: Gartenplanung (Wurzel, +Ertrag, öffnet die Pfade) →
  Erntefokus (+Crit), Händlerblick (+Auftrag), Schaugarten (+Schönheits-Wirkung,
  bindet den Zier-Build an), Tiefwurzel (+Kompost-Gewinn). Prereq-Gating, max-
  Level, übersteht Prestige. HUD-Button 🌱 mit Punkte-Badge, Ziel-Panel zeigt
  freie Punkte. Bewusst klein & datengetrieben erweiterbar.
- **Spezialisierungen passen schon zur Kategorie** (Phase 14/15): Zier→Schönheit,
  Holz→Holz-Gold, Kräuter→Wuchs, Beeren/Obst→Nachreife, Magie→Meister-XP,
  Hanf→Lose, Gemüse→Gold-Ernte — der Zier-Spec verstärkt jetzt einen echten Build.

Save v24 → v25: neues `skills`-Map (Record<string,number>), `sanitize()` defaultet
auf {} → alte Saves unbetroffen, Punkte werden aus vorhandenem Fortschritt
abgeleitet. Beauty-Milestones leiten sich aus den Beeten ab (keine Persistenz).
Tests 46/46, check/build grün, 14-d-Sim ohne Runaway/NaN. Tiefere Pflanzen-
rollen-Retunings, Kategorie-Events/Aufträge und ein größerer Skill-Tree → Phase 18.

### 9.20 Phase 18 — Belohnungen: Rubbellos-Rework, Events, Skilltree-Ausbau, Zier-Softcap (Save v25, kompatibel)

Fokus auf Belohnungsgefühl; zwei Systeme gezielt ausgebaut, zwei justiert. Das
schwere Erfolge-Tier-System bewusst auf Phase 19 verschoben (nicht halbgar).

- **Zier-Softcap (Balance-Check):** Diagnose zeigte, dass der Zier-Build bei
  hohem Zier-Spec dominierte (497 % Schönheit aus 6 Zier). `gardenBeauty` ist
  jetzt **weich gedeckelt** (linear bis `beautySoftcap` 0,8, darüber `^0,5`):
  6 Zier → 284 %, 12 ≈ 20 Zier (abnehmender Grenznutzen). Keine Bestrafung,
  keine Entwertung — Zier bleibt ein starker Build, ist aber nicht mehr
  automatisch beste Strategie.
- **Rubbellos-Rework (`data/scratch.ts`):** Gold-Preise skalieren jetzt mit dem
  **effektiven** Ernte-Wert (roh × Ertrags- × Verkaufs-Multiplikator) statt mit
  dem rohen Pflanzenwert → ein Jackpot ist im Qi-Endgame ~5–6 min Einkommen
  statt Sekundenkleinkram, früh unverändert. Zwei neue Nicht-Gold-Preise:
  **Kompost** (skaliert mit Parzellen) und **Meisterschafts-XP** (für die
  gewählte Sorte). Weights ausbalanciert, kein Runaway (Lose sind knapp/zeit-
  gedeckelt).
- **Kategorie-Events (`data/weather.ts`):** vier neue Chancen-Events über das
  bestehende (in-flow, nicht verdeckende) Banner-System — **Erntefest** (+50 %
  Ertrag), **Komposttag** (+50 % nächster Kompost), **Meistertag** (×2 Meister-XP),
  **Gartenschau** (+50 % Schönheits-Wirkung). Keine Strafen, mobil, sichtbar.
- **Skilltree-Ausbau (`data/skills.ts`):** vier weitere Knoten + neuer **Glück**-
  Pfad — Üppige Ernte (Ernte), Großhandel (Markt), Parkanlage (Zier), Glücksklee
  (Los-Chance, koppelt an das Rubbellos-Rework). **Respec** (`respecSkills`) gegen
  eine Kompost-Gebühr (`skillRespecCompost` 100) → kein Lock-in, nicht spammbar.
- **Ziel-Panel-Anbindung:** neues „Rubbellose einlösen"-Ziel (wenn Lose offen);
  Skill-/Schönheits-Ziele aus Phase 16/17 bleiben.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 25): Rubbellos/Events/Softcap
sind reine Logik, der Skilltree nutzt das vorhandene `skills`-Map. Tests 47/47,
check/build grün, 14-d-Sim ohne Runaway/NaN. **Erfolge-Tier-System** (mehrstufige
Achievements mit Belohnungen + Migration) → Phase 19.

### 9.21 Phase 19 — Mehrstufiges Erfolge-Tier-System (Save v26)

Das alte 22/22-System (jeder Badge +1 % Ertrag, schnell fertig) ist durch ein
**mehrstufiges** ersetzt: 11 Tracks × 6 Stufen (Bronze → Legendär) =
**66 Stufen** als Langzeitziele.

- **Daten (`data/achievements.ts`):** jeder Track hat eine `metric(state)` und
  sechs aufsteigende Schwellen mit Belohnungen. Metriken nutzen vorhandenen
  State + drei neue Zähler (`stats.questsDone`, `stats.scratchesDone`,
  `records.bestBeauty`). Werte an der Economy ausgerichtet (Gold 1K→1Qi,
  Aufträge 1→5000, Parzellen 2→100, Schönheit 5 %→400 % …).
- **Logik (`game/achievements.ts`):** `achievementTiers[id]` = höchste
  **beanspruchte** Stufe. **Dauerhafte** Boni (Ertrag/Tempo/Auftrag/Los-Glück)
  und Skillpunkte werden aus den beanspruchten Stufen **abgeleitet** (migrations-
  sicher, kein Doppelzählen). **Einmal-Belohnungen** (Booster + Lose, bewusst
  **kein Kompost** — das würde via `compostClaimed` den nächsten Prestige-Gewinn
  drücken) werden in `claimAchievements()` im Tick **genau einmal** gezahlt.
  Skillpunkte aus Erfolgen: +1 ab Gold, +1 ab Legendär pro Track (gedeckelt 2×).
- **UI:** `AchievementsPanel` zeigt pro Track Stufe, Fortschrittsbalken, aktuelle
  Metrik/Schwelle und die nächste Belohnung; Tier-Up-Toast (nicht blockierend);
  das Ziel-Panel surft den nächstgelegenen Erfolg als Ziel an.
- **Belohnungsvergabe:** automatisch bei Erreichen (kein Claim-Klickzwang), mit
  Toast-Feedback.

Save v25 → v26: das alte `achievements: string[]` entfällt; `achievementTiers`
wird in `sanitize()` für Saves ohne das Feld **aus den geladenen Stats
initialisiert** (beansprucht = erreicht, **ohne** Einmal-Belohnungen → kein
retroaktiver Flut-Bug, aber dauerhafte Boni gelten sofort). Neue Stats/Records
defaulten auf 0. Diagnose: ein Endgame-Stand erreicht 41/66 Stufen, **9 Tracks
bleiben offen** (Erfolg-Ertragsbonus +37 %, vgl. alt fix +22 %). Tests 48/48,
check/build grün, 14-d-Sim ohne Runaway/NaN (Prestige unbeeinträchtigt).

### 9.22 Phase 20 — Saatlabor, Kreuzungen & Pflanzenvarianten (Save v27)

Ein neues Sammel-/Suchtloop-System, bewusst **klein, sauber, erweiterbar**.

- **Varianten als entdeckbare Sammel-Boni (`data/variants.ts`):** 10 Varianten
  über alle Spielweisen (Ertrag/Wachstum/Aufträge/Kompost/Lose/Zier/Meisterschaft/
  Offline-Passiv), je 1 früh/mid + mehrere Endgame. Eine Variante ist **keine
  pflanzbare Pflanze** (kein Plot/Sprite-Aufwand), sondern ein **permanenter,
  kleiner Passivbonus** + Sammlungseintrag. Gesamt-Ertragsbonus aller 10 = +8 %
  → keine Economy-Explosion, keine Entwertung der Pflanzenleiter.
- **Kreuzungslogik (`game/seedlab.ts`):** zwei freigeschaltete Elternpflanzen +
  passendes Rezept → **deterministische** Entdeckung (keine frustrierenden
  Sub-1%-Rolls). Kosten Gold (+ Kompost ab Mid/Late), manche Rezepte mit
  Parzellen-/Meisterschafts-Gate. `crossEligibility()` liefert klare Status/
  Gründe für die UI; `crossPlants()` zahlt einmalig und schaltet frei (übersteht
  Prestige). Effekte hängen an denselben Modifier-Hooks wie Skills/Erfolge
  (yield/growth/quest/luck/compost/beauty/mastery/passive).
- **Sammlung/Lexikon (`ui/SeedLabPanel.svelte`):** zwei Eltern-Slots (Selects,
  touch-freundlich), Kosten-/Hinweis-/Ergebnisanzeige, Kreuzen-Button, und ein
  Lexikon mit entdeckten Varianten (voll) + unentdeckten (❔ + Eltern-Emoji +
  Effekt-Typ + Seltenheit) und Fortschritt X/10. HUD-Button 🧬 mit Punkt, wenn
  etwas kreuzbar ist; nichts verdeckt Hauptbuttons.
- **Einbindung:** Ziel-Panel (nächste kreuzbare/entdeckbare Variante), Erfolge
  (neuer „Saatforscher"-Track: 1→10 Varianten), Meisterschaft/Parzelle als Gates,
  Kompost als Kostenanteil.

Save v26 → v27: neues `discoveredVariants` (id-Liste); `sanitize()` defaultet auf
[] und behält nur bekannte IDs → alte Saves laden mit leerer Sammlung, keine
Doppel-Belohnung. Tests 49/49, check/build grün, 14-d-Sim ohne Runaway/NaN.
Produkt-/Lose-Kosten, Skill-/Event-Synergien und „angebaut"-Tracking → Phase 21.

### 9.23 Phase 21 — Saatlabor vertieft: Produktkosten, Hinweise, Synergien (keine Save-Änderung)

Das Saatlabor wird ein echtes Spielsystem statt nur Gold-Sink — ohne neue
Pflanzen/Varianten/Ressource.

- **Ernteprodukte als Kreuzungskosten (`data/variants.ts` `produceCost`):** 7 der
  10 Rezepte verlangen jetzt zusätzlich Ernteprodukte ihrer Eltern (z. B. Med.
  Tomate = 20 Basilikum + 10 Tomaten) → alte Pflanzen müssen wieder **angebaut &
  geerntet** werden. Es wird **nur freier Überschuss** verbraucht: `freeStock =
  Lager − questReserved` (für offene Aufträge reservierte Ware bleibt unangetastet,
  kein Softlock). Die UI zeigt frei/Lager/benötigt; `crossEligibility` liefert den
  Status `missing-produce` mit Fehlmengen.
- **Rezept-Hinweise statt Lösung (`recipeHint`):** unentdeckte Rezepte zeigen nur
  noch eine **Kategorie-Paar-Andeutung** („Kräuter + Gemüse") + Effekt-Typ +
  „braucht Produkte", nicht die exakten Eltern → echtes Experimentieren, aber nie
  frustrierend (deterministisch, kein RNG).
- **Varianten-Gameplay-Synergien (`eventSynergy`):** 5 Varianten **verstärken ihr
  Themen-Event** (Humusveilchen→Komposttag, Prachtorchidee→Gartenschau,
  Sternenblume→Sternennacht, Meisterhanf→Meistertag, Weltenhybride→Erntefest) über
  `variantEventBonus()`, verdrahtet an denselben Event-Hooks. Varianten wirken so
  spürbar in mehreren Systemen, nicht nur als stiller %-Bonus.
- **Skilltree-Anbindung:** neuer Knoten **Saatgut-Forschung** (Labor-Pfad) −15 %
  Gold-Kosten/Stufe (gedeckelt) im Saatlabor (`effectiveGoldCost`).
- **Ziel-Anbindung:** das Ziel-Panel zeigt jetzt „Variante X braucht Produkte"
  inkl. frei/benötigt-Fortschritt; der Saatforscher-Erfolg bleibt.
- **Pflanzbare Variante (D): bewusst auf Phase 22 verschoben** — eine pflanzbare
  Variante braucht Sprite- (`ui/pixel/sprites.ts`), Plot- und Hotbar-Integration
  + eigenes Unlock-Gating; das ist eine eigene Phase wert statt halbgar.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 27): alle neuen Felder sind
Daten/Logik, `discoveredVariants` unverändert. Tests 50/50, check/build grün,
14-d-Sim ohne Runaway/NaN.

### 9.24 Phase 22 — Pflanzbare Spezialvariante & Sprite-Politur (keine Save-Änderung)

Fokus auf zwei der drei offenen Schwächen; die Late-Game-Pflanzenleiter + Hanf-
Ausbau bewusst → Phase 23 (eigener Daten-/Sprite-/Balance-Aufwand, nicht halbgar).

- **Erste pflanzbare Spezialvariante (`data/plants.ts` `SPECIAL_PLANTS`):** die im
  Saatlabor entdeckte **Prachtorchidee** wird pflanzbar — eine reine **Utility-
  Zierpflanze** (Ertrag 0, Schönheit 0,2), **max. 3 gleichzeitig**, freigeschaltet
  durch `discoveredVariants.includes('prachtorchidee')` statt durch Einnahmen.
  Architektur-Trick: Spezialpflanzen hängen nur an **`plantById`** (das jetzt aus
  PLANTS + SPECIAL_PLANTS baut) — dadurch funktionieren Plot-Render, Beauty-Aura
  (`gardenBeauty` iteriert Beete), Auto-Saat/-Ernte, Roden, Save/Load und Hotbar
  **automatisch generisch**. Neue Logik nur: Discovery-Gate in `isPlantUnlocked`,
  `maxPlots`-Cap in `sowPlot`, Hotbar listet entdeckte Spezialpflanzen, Sprite-
  Alias. Quests/Sammlung iterieren weiter PLANTS → Spezialpflanzen bleiben außen
  vor (keine Balance-/Invariantenstörung). Ziel-Panel: „Prachtorchidee anpflanzen".
- **Sprite-Politur (A):** Basilikum neu gezeichnet (klarere, rundere Paarblätter
  mit Top-Highlight + definiertem dunklem Stiel-Sockel) — deutlich lesbarere
  Silhouette. Spezialpflanze nutzt die leuchtende Leuchtlilien-Sprite.
- **Sprite-Stilregel (dokumentiert, A.10):** neue Pflanzen folgen: klare
  Silhouette vor Detailfülle; eine erkennbare Grundform pro Kategorie (Kräuter =
  Paarblätter, Gemüse = Fruchtform, Beeren = Cluster, Zier = Blüte, Holz =
  Stamm+Krone, Obst = Fruchtkrone, Magie = Glühen/Sternakzente, Hanf =
  gefiederte Fingerblätter); dunkler Stiel-/Sockelkontrast unten, hellster
  Ton (L) als Top-Highlight; 16×16, lesbar in Kleinansicht, kein matschiges
  Vollflächen-Grün.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 27): `SPECIAL_PLANTS` ist Daten,
Plots referenzieren sie über `plantById` (Sanitize akzeptiert sie). Tests 51/51,
check/build grün, 14-d-Sim ohne Runaway/NaN. **Late-Game-Leiter über Weltenrose
hinaus + Hanf-Kategorie-Ausbau → Phase 23.**

### 9.25 Phase 23 — Late-Game-Pflanzenleiter über Weltenrose & Hanf-Endgame (keine Save-Änderung)

Die Leiter endete faktisch bei Weltenrose (Unlock 8 Qa); sehr späte Spieler
hatten danach kein Pflanzenziel mehr. **Vier neue Pflanzen jenseits von
Weltenrose** mit klar verschiedenen Rollen (statt nur „teurer"):

- **Traumorchidee** (Zier, Schönheit 0,2 — Unlock 1,5e16): Endgame-Aura-Pflanze
  für den Schönheits-Build, kein Ertrag.
- **Ewigrose** (Magie, Wiederernte — Unlock 4e16): Direktgewinn-Spitze, schlägt
  Weltenroses Dauerertrag deutlich.
- **Sternenzeder** (Holz, passiv 900k/s — Unlock 1e17): Offline/Passiv-Endgame.
- **Dauerblütenhanf** (Hanf, Wiederernte, Lizenz III, Gießen 10 — Unlock 2e17):
  **macht Hanf endgame-relevant** — der erste *nachwachsende* Hanf, hoher
  Dauerertrag statt einmaliger Lange-Wuchs-Ernte.

Balance: alle vier liegen **strikt über Weltenroses Unlock** (echte neue Ziele,
nicht überspringbar wie die alten billigen Spitzen), und die Erntepflanzen halten
die Invariante (Profit/s pro Stufe ×1,5+, ROI ok) — die Leiterkurve wird nur
sauber verlängert, keine Explosion. Sprites sind vorerst auf thematisch passende
Sprites aliasiert (distinkte Endgame-Sprites = spätere optische Politur). Quests,
Sammlung („alle Sorten") und Erfolge skalieren automatisch mit (mehr Late-Game-
Ziele). Tests 52/52, check/build grün, 14-d-Sim ohne Runaway/NaN. Keine
Save-Format-Änderung (reine Daten; Plots/Quests referenzieren Pflanzen über IDs).

### 9.26 Phase 24 — Sprite-Qualität & Very-Late-Game-Progression (keine Save-Änderung)

Zwei Probleme behoben: Phase-23-Pflanzen nutzten Alias-Sprites, und bei ~570 Qi
war die Leiter sofort leer.

- **Sprite-Atlas (`scripts/sprite-atlas.mjs`):** rendert **alle** reifen Pflanzen-
  Sprites in eine echte PNG (`sprite-atlas.png`, eigener minimaler PNG-Encoder via
  `zlib`) — die Pixel-Arbeit ist damit **sichtbar prüfbar** (kein Blind-Editieren
  mehr) und die Audit-Übersicht selbst (Deliverable). Reihenfolge wird gelistet.
- **Distinkte Endgame-Sprites (keine Aliase mehr):** Ewigrose (Plum-Rose mit
  weißem Kern), Traumorchidee (violette Orchidee), Sternenzeder (Konifere mit
  Goldstern), Dauerblütenhanf (Cannabis-Fächerblatt + Goldknospen), Prachtorchidee
  (weiß-blaue Orchidee) — jeweils eigene Stufe-3-Grids (Stufen 1-2 nutzen eine
  thematische Basis). Plus eigene Sprites für alle neuen Pflanzen.
- **Hanf-Linie überarbeitet:** CBD/Medizinal/Gold/Dauerblüten/Himmel sind jetzt
  klare **Cannabis-Fächerblätter** mit eigenen Akzenten (blass / weiß-medizinisch /
  goldgespitzt / Goldknospen / Cyan) und wachsender Größe — die Kategorie liest
  sich endlich als echtes Cannabis. Basilikum (Phase 22) bestätigt klarer.
- **Very-Late-Game-Leiter (`diagnose.mjs`-Szenarien):** Diagnose zeigte, dass die
  Phase-23-Pflanzen (≤200 Qa) bei 570 Qi sofort trivial sind. **Sieben neue
  Pflanzen** spannen jetzt von 1 Qi bis 300 Sx (Kometbeere/Magie, Nebelzeder/
  Offline, Himmelshanf/Hanf, Galaxieorchidee/Zier, Schöpfungsrose/Magie,
  Mondkristall/Magie-Direkt, Urweltbaum/Offline-Finale). Bei **570 Qi bleiben
  4 echte Ziele offen** (statt vorher 0), bei 1 Sx noch 3 — Erntepflanzen halten
  die Profit/ROI-Invariante.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 27): reine Daten/Sprites; Plots/
Quests referenzieren Pflanzen über IDs. Tests 53/53, check/build grün, 14-d-Sim
ohne Runaway/NaN. Breitere Sprite-Politur der älteren Mittelfeld-Pflanzen bleibt
optionaler Feinschliff.

### 9.27 Phase 25 — Core-Progression: Quest-Skalierung, Level-Wert (keine Save-Änderung)

Gezielt die konkretesten Progressions-Schwächen behoben; die tiefe Prestige-
Gating-Reparatur + Shop/Kompost/Lizenz-Sinks bewusst → Phase 26 (eigener,
risikoreicher Eingriff — nicht halbgar neben drei anderen Reworks).

- **Start-Softlock behoben + Quest-Skalierung (`game/quests.ts`):** `fairAmount`
  wird jetzt mit dem Fortschritt skaliert (`questEffortScale` = Level + Parzellen).
  Ein frischer Lvl-1-Garten bekommt **~8–21 Basilikum** statt der alten ~156 →
  kein Reservierungs-/Verkaufs-Softlock mehr (man überproduziert die kleine
  Reservierung sofort, freier Überschuss bleibt verkaufbar; Notgroschen wird
  nicht mehr als Krücke gebraucht). Mengen rampen bis Lvl ~30 auf das volle
  Fenster; späte Aufträge bleiben über den `sellValue`-getriebenen Reward lukrativ.
- **Level-Wert (`data/progression.ts`, `data/config.ts`):** die XP-Kurve ist
  spät **deutlich steiler** (`20·level^1.5·(1+level/120)`) — Lvl 1000 kostet ~19×,
  Lvl 11300 ~240× mehr XP → kein 5–10-Level/Sekunde-Durchrasen mehr, jedes Level
  ist verdient. Der Level-Ertragsbonus-Deckel wurde von +100 % (Lvl 101) auf
  **+300 %** (Lvl ~301) angehoben, damit Level tiefer hinein echten Wert behalten;
  der Deckel verhindert weiterhin Runaway. Reine Kurven-/Cap-Änderung → kein
  Save-Bruch (ein hochstufiger Stand levelt nur langsamer weiter, nie zurück).
- **Diagnose (`scripts/diagnose.mjs`):** Quest-Größe nach Fortschritt (frisch
  klein → voll), Level-Kurve (XP bei Lvl 1/10/100/1000/5000/11300). Belegt den
  Fix.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 27): alles reine Logik/Balance.
Tests 54/54, check/build grün, 14-d-Sim ohne Runaway/NaN (Leveln spürbar
langsamer, Ökonomie gesund). **Offen → Phase 26:** Prestige-Skip-Grundursache
(Unlock-Gating am Multiplikator skalieren), Shop-/Kompost-Late-Sinks, Lizenz-
Tiers, Ziel-Panel-Priorisierung.

### 9.28 Phase 26 — Prestige-Soft-Gate gegen den Leiter-Skip (keine Save-Änderung)

Die seit Phase 15 bekannte Grundursache gezielt entschärft; Shop-/Kompost-/
Lizenz-Late-Sinks bewusst → Phase 27 (eigene Inhalts-Reworks, nicht halbgar).

- **Prestige-Skip-Fix (Parzellen-Soft-Gate, `PlantDef.unlockParcel`):** die elf
  sehr späten Pflanzen (Phase 23/24) brauchen jetzt **zusätzlich zur Einnahmen-
  schwelle eine Mindest-Parzellenzahl** (Traumorchidee P6 … Urweltbaum P36).
  Parzellen wachsen ~1/Prestige und überstehen den Reset — also **pacet der
  langsame, persistente Parzellen-Fortschritt die Spitze, während der schnelle
  Ertrags-Multiplikator weiter beschleunigt**. Diagnose: bei totalEarned = 1 Sx
  (Multiplikator rast) sind bei Parzelle 12 noch 6 Spitzen-Pflanzen gesperrt,
  die sich erst mit weiteren Prestiges (Parzelle 16/22/30/40) öffnen → kein
  Sofort-Skip der ganzen Leiter mehr, aber spürbare Beschleunigung bleibt.
  **Kein Nerf, keine Strafe:** der Multiplikator wird nicht angetastet; das Gate
  greift nur beim *neuen* Säen/Auswählen — bereits gepflanzte Beete laufen
  unberührt weiter (über `plantById`, nie ein Brick), und ältere Pflanzen haben
  kein Gate.
- **Soft, transparent, save-safe:** `isPlantUnlocked` prüft das Gate (Hotbar zeigt
  „Parz. N" statt „???"), `questPool` fragt nie nach einer noch nicht säbaren
  Pflanze (kein neuer Softlock), und das Ziel-Panel macht aus einer einnahmen-
  erreichten-aber-parzellen-gegateten Sorte ein **Parzellen-Ziel** („Parzelle N
  für X"). `unlockParcel` ist reines Daten-Feld → keine Save-Migration.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 27). Tests 55/55, check/build grün,
14-d-Sim ohne Runaway/NaN/Stall. **Offen → Phase 27:** Shop-Late-Tiers,
Kompost-/Prestige-Sinks, Lizenz-Tiers, breitere Ziel-Panel-Priorisierung,
Auftrags-Wirtschaftlichkeit.

### 9.29 Phase 27 — Late-Game-Sinks, Lizenz-Tiers & Auftrags-Wirtschaft (SAVE 28)

Die in 9.27/9.28 bewusst aufgeschobenen Inhalts-Sinks **vollständig umgesetzt**
(nicht erneut diagnostiziert-und-verschoben). Alle neuen Inhalte sind reine
Datendefinitionen über bestehende Modifier-Hooks — keine neuen Effekt-Pfade,
Save-sicher.

- **B — Shop-Late-Tiers (`UpgradeDef.unlockParcel` + `repeatable`):** sieben neue
  Werkstatt-Stufen hinter **Parzellen-Gates** (pacen via Prestige, kein reiner
  %-Kosmetik-Klon): Wasserwerk (P7), Erntegilde (P8), Saatgilde (P9), Sternwarte
  (P10), Handelsflotte (P12), Goldenes Los (P14) — alle nutzen vorhandene Utility-
  Effekte (Wasser/Automation/Offline/Glück) auf höherem Niveau. **Edelkompost**
  (P16, `repeatable`) ist ein **endloser Gold-Sink** (+2 %/Stufe, costFactor 1.35):
  570 Qi gestautes Gold kauft ~Stufe 40 und die nächste Stufe kostet wieder mehr,
  also nie „leergekauft". `buyUpgrade`/`anyUpgradeAffordable` respektieren das Gate
  (`isUpgradeUnlocked`), die UI zeigt „ab Parzelle N" + Schloss-Sprite und für
  `repeatable` „Stufe N" ohne `/max`.
- **C — Kompost-Spät-Sinks:** zwei weitere endlose Sinks (`Tiefenmoor` passive P18,
  `Ewighumus` offline P20), damit **jeder** Compost-Effekt (yield/growth/questReward/
  passive/offline) einen Endlos-Pfad hat — vorher fehlten passive & offline. Greifen
  generisch über `compostUpgradeBonus`.
- **D — Lizenz-Tiers (`LicenseDef.level: number` + `benefit`):** Lizenz IV — Hanf-
  Export (80 Qa, P12, +20 % Auftragsbelohnung) und V — Welthandel (50 Qi, P22,
  +30 % obendrauf) — **keine neuen Pflanzen**, sondern dauerhafte Auftrags-Boni
  (`licenseQuestBonus`). Lizenz-Cap im `sanitize()` von 3 → 5 angehoben.
- **E — Auftrags-Wirtschaftlichkeit:** `fulfillQuest` addiert `licenseQuestBonus`
  in den `rewardBonus` → mit IV+V zahlen Aufträge dauerhaft +50 %, sodass Liefern
  neben dem reinen Farmen konkurrenzfähig bleibt.
- **F — Ziel-Panel-Priorisierung:** neue Generatoren `shopGoal` (nächste parzellen-
  gegatete Werkstatt-Stufe) und `licenseGoal` (nächste Lizenz inkl. Bedingung/
  Benefit); `upgradeGoal` überspringt gegatete Tiers. Sortierung: triviale Dauer-
  „ready"-Ziele (Lose/Skill) sortieren **innerhalb ihres Horizonts hinter**
  substanzielle Fortschritts-Ziele, statt sie zu verdrängen.

Save: **SAVE_VERSION 27 → 28** (reiner Passthrough — neue Upgrade-/Kompost-IDs
defaulten auf Stufe 0, Lizenz-Cap-Anhebung). Alte Saves laden unverändert. Tests
56/56, check/build grün, 14-d-Sim & `scripts/diagnose.mjs` (Vorher/Nachher) ohne
Runaway/NaN/Stall.

### 9.30 Phase 28 — End-to-End-Playtest, Ziel-Politur & UX-Feinschliff (keine Save-Änderung)

Nach den vielen Systemen der Phasen 11–27 ein **diagnosegetriebener Politur-Durchlauf**
statt neuer Feature-Schicht: erst messen, dann gezielt fixen (keine Großumbauten).

- **A — End-to-End-Playtest (`scripts/playtest.mjs`, neu):** baut **20 repräsentative
  Spielstände** (frischer Start → Very Late 1 Sx, Parzelle 12/20/36, Shop/Kompost
  maxed, Lizenz III/IV/V, Hanf/Zier/Magie/Holz/Saatlabor/Achievement-Builds) und
  prüft pro Stand durch die **echten** Core-Funktionen zwölf Fragen: nächste
  sinnvolle Pflanze/Shop/Kompost/Lizenz/Auftrag/Erfolg, Zeit bis Fortschritt,
  relevante/tote/dominante Systeme, Ziel-Panel-Güte und ob mehrere echte Optionen
  bestehen. Ergebnis: **alle 22 Szenarien haben ≥3 offene Optionen**; „tote" Systeme
  (mastery/spec/beauty) sind **kontextuell korrekt** (Build-Opt-in, leuchten sobald
  man sie bespielt — verifiziert).
- **C — Ziel-Panel kritisch verbessert (Kern-Fix):** Die Diagnose zeigte EIN klares
  Problem — das Ziel-Panel headlinte in **fast jedem** Stand das triviale „Gießkanne
  kaufen, bereit" (auch bei 570 Qi Gold). Ursache: `upgradeGoal` zeigte stets das
  *billigste* Upgrade, das bei viel Gold sofort „bereit" (Fraction 1) war und oben
  klebte. Fix: `upgradeGoal` zielt jetzt auf das **billigste noch nicht bezahlbare**
  Upgrade (echte Sparleiste); ist alles bezahlbar, wird es ein **Chore-Hinweis**
  (bevorzugt den endlosen Edelkompost-Sink) statt Headline. Neues `Goal.chore`-Flag:
  triviale „jederzeit"-Ziele (billiges Upgrade, Los einlösen, Skillpunkt) sortieren
  **innerhalb ihres Horizonts hinter** echte Fortschrittsziele, sind im Panel optisch
  ruhiger (Opacity) und zählen **nicht** mehr in den HUD-„bereit"-Badge. Neuer
  `goalBoard()`-Export **deckelt das Panel auf ≤3 Ziele je Horizont** (war ~12) →
  scannbar auf Mobile. Resultat laut Playtest: dominantes Ziel ist nun durchweg
  substanziell (Pflanze/echtes Spar-Upgrade/Parzelle), nie mehr der 150-Gold-Klick.
- **B/D/H — geprüft, gesund:** Fresh Start (Szenario 1) gibt klare erste Ziele
  (Gießkanne sparen, Schnittlauch, Parzelle, Auftrag) ohne Quest-Softlock (Phase-25-
  Skalierung greift); Shop/Kompost/Lizenz-UI stellt gesperrte Tiers („ab Parzelle N"),
  `repeatable` (∞-Badge, „Stufe N") und Lizenz-Benefit bereits klar dar (Phase 27);
  Zahlenformat (`format.ts`) sauber, Goal-Fractions NaN-gehärtet (`clamp01`).
- **J — Regression-Schutz:** Phase-28-Test deckt ab: Upgrade-Ziel ist echtes Spar-
  Ziel (nicht „bereit"), Chores dominieren nie, Chore-Sortierung, `goalBoard`-
  Deckelung, Very-Late hat ≥3 substanzielle Optionen über ≥3 Horizonte, keine
  NaN/Infinity-Fractions.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 28). Tests 57/57, check/build grün,
14-d-Sim ohne Runaway/NaN/Stall, `playtest.mjs`/`diagnose.mjs` sauber. **Offen →
Phase 29:** echte Inventar-Fülle in Auftrags-Ziel-Wirtschaftlichkeit modellieren,
optionale „Build-Entdeck"-Ziele für noch nicht begonnene Spielweisen.

### 9.31 Phase 29 — Toast-Spam-Fix & Goal-System 2.0 (keine Save-Änderung)

Zwei Probleme adressiert: der kritische Meldungs-Spam im Late Game, dann ein
intelligenteres Ziel-Panel. Alles UI-/Logik-Politur, keine neue Save-Struktur.

- **A0 — Toast-Spam behoben (`ui/toasts.ts` + `Toasts.svelte`):** Das Toast-System
  ist von „jedes Event ein Toast" auf **Aggregation + Priorität + Render-Deckel**
  umgebaut. Toasts tragen `priority` (low/normal/important/critical) und einen
  `key`; gleiche Schlüssel **aktualisieren** einen lebenden Toast (Zähler/Summe)
  statt zu stapeln. `pushAggregateToast` bündelt Bursts: ein 120-Beete-„Alle
  ernten" erzeugt **genau 2** Toasts („+120 Level · +X Goldbonus" / „+40 Rubbellose
  gefunden") statt 160. Der Renderer zeigt **max. 3** gleichzeitig, nach Priorität
  sortiert → seltene Meldungen (Jackpot/neue Variante = critical) werden nie von
  Spam verdrängt. Position: **feste Ecke unten-rechts**, `pointer-events:none` am
  Container (klar von Hotbar/Hauptbuttons, die mittig sitzen), kompakter auf Mobile.
  Level-Up-Fanfare (`fx/celebrate.ts`) und beide Rubbellos-Emitter nutzen jetzt die
  Aggregation; der Goldbonus wird unverändert im Core vergeben.
- **A/B — Auftragsziele wirtschaftlich bewertet:** geteilter `expectedQuestPayout`
  (auch von `fulfillQuest` genutzt) erlaubt dem Ziel-Panel, einen Auftrag exakt wie
  bei der Erfüllung zu bewerten. `questGoal` zeigt eine Lieferung nur **stark**,
  wenn sie *fast fertig* ist ODER eine echte **Prämie über dem Direktverkauf** zahlt
  (`payout / (Produktwert × Verkaufs-Multiplikator)`). Diese eine Kennzahl faltet
  automatisch alle Synergien ein: Lizenz IV/V, Mykorrhiza/Auftragshumus, Varianten
  und Streak heben den Payout, Marktstand/Markt-Welle heben die Verkaufs-Basis.
  Aufträge klar schlechter als Farmen (und kaum begonnen) werden gar nicht gezeigt;
  parzellen-gegatete/unsäbare Aufträge nie. Diagnose: ohne Lizenz ~1.6×, mit IV+V
  ~7.7×, bei starkem Marktstand sinkt die Prämie (Verkauf lohnt mehr).
- **C — Build-Entdeckungsziele (`buildGoal`):** ein **rotierender** weicher Hinweis
  (Zier / Holz-Offline / Spezialisierung / Glück) für eine noch nicht genutzte,
  *realistisch spielbare* Spielweise. `discovery`-Flag → eigene Optik, verdrängt nie
  echte Progression, verschwindet sobald der Build läuft, rotiert nach Parzellenzahl
  (stabil je Prestige). Keine neue Save-Struktur.
- **D/E/F — Horizonte, Begründungen, Diversität:** Ziele tragen jetzt ein kurzes
  `why` (z. B. „Zahlt ~7.7× über Direktverkauf · Lizenz-Bonus", „Bester Langzeit-
  Sink für gestauten Kompost") und im Panel einen **Typ-Chip** (Pflanze/Shop/
  Auftrag/Lizenz/Build…). `goalBoard` komponiert für Vielfalt: **≤1 Chore, ≤1
  Build-Nudge**, ≤3 je Horizont, mehrere Horizonte sichtbar.
- **G/I — Diagnose & Tests:** `diagnose.mjs` um Ziel-Qualität (Horizonte/Why/Build/
  Auftrags-Stärke) und eine Toast-Spam-Simulation erweitert; zwei Phase-29-Tests
  (Toast-Aggregation/Deckel/Priorität; Auftrags-Ökonomie/Build/Diversität) → 59/59.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 28). check/build grün, 14-d-Sim
sauber. **Offen → Phase 30:** Toast-Historie/„Log"-Panel zum Nachlesen verpasster
Meldungen; Auftrags-Zeitschätzung anhand realer Produktionsrate.

### 9.32 Phase 30 — Toast-Verlauf & Auftrags-Zeitschätzung (keine Save-Änderung)

Die in 9.31 offengelassenen Folgepunkte umgesetzt; reine UI-/Logik-Politur.

- **Toast-Verlauf/„Log" (`ui/toasts.ts` + `ToastLogPanel.svelte`):** Da die
  Aggregation Details bewusst auf dem Spielfeld versteckt, hält der Store jetzt
  eine **kurze Session-Historie** (`toastLog`, gedeckelt auf 40, nie gespeichert).
  Keyed/aggregierte Toasts aktualisieren **einen** Log-Eintrag → ein 120-Beete-Burst
  ergibt 2 Zeilen, nicht 120. Ein **🔔-HUD-Button** öffnet den Verlauf (Icon, Text,
  ×Anzahl, „vor Xm", Priorität); ein `toastLogUnseen`-Zähler treibt ein kleines
  Badge, das beim Öffnen (`markToastLogSeen`) verschwindet; „Verlauf leeren" räumt
  auf. Wichtige App-Toasts (neuer Erfolg = critical, neue Pflanze/Willkommen-zurück
  = important) sind jetzt korrekt priorisiert + keyed.
- **Auftrags-Zeitschätzung (`goals.ts` `questFulfillSeconds`):** das Ziel-Panel
  schätzt nun die **reale Anbauzeit** der noch fehlenden Produkte (Ertrag ×
  Ertrags-Mult × Beete / Wuchszeit, Linien summiert) und faltet sie in die
  Auftrags-Empfehlung: ein lukrativer Auftrag, der einen **unrealistischen Grind**
  (> 2 h Vollanbau) bräuchte, wird nur noch *leise* gezeigt; schnelle Aufträge
  stark, mit „~Xm"-Hinweis im `why`. Diagnose: 20 Stück/50 Beete → „STARK · <1m",
  5 Mio/2 Beete → „leise · langer Anbau ~2983 h", 5 000/12 Beete → „STARK · ~30m".
- **G/I:** `diagnose.mjs` um Zeitschätzung + Verlaufs-Bündelung erweitert; zwei
  Phase-30-Tests (Log-Aggregation/Deckel/Unseen-Badge; Auftrags-Zeit-Gating) → 61/61.

Keine Save-Format-Änderung (SAVE_VERSION bleibt 28). check/build grün, 14-d-Sim
sauber. **Offen → Phase 31:** Toast-Log optional persistent (letzte Sitzung);
feinere Build-Empfehlung nach tatsächlich gespieltem Stil.

### 9.33 Phase 31 — Topbar-Stabilität & Endgame-Auto-Ernte (keine Save-Änderung)

Zwei gezielte Fixes aus dem Live-Feedback.

- **Topbar verschiebt sich nicht mehr (`Hud.svelte`):** Die Panel-Icon-Buttons
  liegen jetzt in einer **eigenen Zeile** (`.row.btns`, rechtsbündig) — wenn sich
  links die Stats ändern (Geld zählt hoch, Marktwert wechselt das Vorzeichen,
  Ernte-Kette taucht auf), reflowt/springt das Button-Menü nicht mehr. Zusätzlich
  feste Footprints für die volatilen Stat-Elemente: `.amount` (min-width + rechts,
  tabular-nums), `.market` (feste Breite, zentriert), `.sell` (min-width), sodass
  auch die Stats-Zeile selbst kaum noch zittert.
- **Erntedrohnen — endlose Endgame-Auto-Ernte (`data/upgrades.ts`):** Im späten
  Prestige reifen die Beete so schnell, dass die gedeckelten Erntehelfer/Erntegilde
  nicht hinterherkommen (es wurden nur ~3 Beete bedient). Neuer **repeatable**
  Helfer-Tier `erntedrohnen`: +3 reife Beete/s je Stufe, `unlockParcel` 16, Basis
  **1e21 (1 Sp)**, `costFactor` 1.4 → wenige Stufen ernten selbst riesige Felder
  sofort ab (der Tick erntet bis zu `plots.length` reife Beete je Durchlauf), und
  die geometrischen Kosten machen es zu einem **endlosen Sp-Gold-Sink**. Greift über
  `effectBonus('autoHarvest')` automatisch — auch offline; reine Daten, kein neuer
  Code-Pfad. Save-sicher (neue Upgrade-ID defaultet auf Stufe 0).

Keine Save-Format-Änderung (SAVE_VERSION bleibt 28). Tests 62/62, check/build grün.
**Offen → Phase 32:** Toast-Log optional persistent; feinere Build-Empfehlung.

### 9.34 Phase 32 — Endgame-Tiefe: Wachstums-Boden, Hanf-Spitze, Skill-Sink, Zier-Relation (keine Save-Änderung)

Aus konkretem Live-Feedback eines Parzelle-39-Spielstands (1B Kompost, +3,4 Mio %
Tempo): Pflanzen reifen in Sekundenbruchteilen, Helfer kommen nicht hinterher, die
letzte Pflanze bringt kaum Sprung, Skills sind längst max, Zier-Schritte sind
unverhältnismäßig.

- **Wachstums-Boden (`PlantDef.minGrowSeconds`, tick.ts):** der wichtigste Fix.
  Der davongelaufene Tempo-Multiplikator macht sonst jede Pflanze instant. Ein
  per-Pflanze **Echtzeit-Boden** begrenzt, wie schnell sich `growTime` füllen kann
  (`maxInc = growTime·dt/minGrowSeconds`), Regrow-Zyklen skalieren proportional mit.
  Damit brauchen Endgame-Pflanzen wieder **spürbar Zeit** (30–120 s statt <1 s) —
  hoher Ertrag lohnt, Erntehelfer/-drohnen kommen mit, jede Ernte ist ein echter
  Brocken. Greift nur, wenn der Multiplikator den Boden übersteigt (früh wirkungslos).
- **Neue Hanf-Endgame-Leiter (5 Sorten):** Sonnenhanf (P40) → Sternenhanf (P44) →
  Nebelhanf (P48) → Kosmoshanf (P54) → Ewigkeitshanf (P60), alle Lizenz III, regrow,
  `minGrowSeconds` 30→120, jenseits des Urweltbaums (Unlock 1e24→1e28). Pro Tier
  **~3–5× Einkommenssprung** (Diagnose @1B Kompost: Sonnenhanf 237 Qa/Ernte →
  Ewigkeitshanf 142 Qi/Ernte). Parzellen-Gates (≈1/Prestige) pacen die Spitze;
  Sprites vorerst auf die Cannabis-Linie aliasiert (eigene Pixel-Art später).
- **Endloser Skill-Sink + versteckte Pfade (`ahnenwissen`):** Tief-Prestige häuft
  weit mehr Skillpunkte an, als der endliche Baum fasst (Spieler: 1961 frei). Neuer
  endloser Capstone „Ahnenwissen" (+5 % Ertrag/Stufe, maxLevel 99999) absorbiert den
  Überschuss; additiv → übertrumpft den Prestige-Multiplikator nie (keine Explosion).
  Neue **`buySkillMax`**-Aktion + „MAX"-Button leeren den Punkte-Berg in einem Klick.
  Außerdem: die Glück-/Labor-Pfade waren definiert, aber nie gerendert — jetzt im
  Skill-Panel sichtbar (mehr zum Investieren).
- **Zier-Verhältnismäßigkeit:** die Schönheits-Schritte wuchsen kaum (0,02→0,25)
  bei Mrd.-fachem Kosten-Sprung. Obere Zierpflanzen steil neu skaliert
  (Galaxieorchidee 0,25→0,70 usw.) + neue Endgame-Zier **Sternenrose** (0,9, P42),
  sodass ein Zier-Feld jetzt die Spitzen-Meilenstein-Schwelle erreicht
  (Softcap deckelt → keine Explosion). Irreführende „+X %"-Beschreibungen durch
  qualitative Texte ersetzt (genau die Zahlen, die der Spieler als unverhältnismäßig
  empfand).

Save-sicher (SAVE_VERSION bleibt 28): neue Pflanzen-/Skill-IDs defaulten auf 0,
`minGrowSeconds`/Beauty-Rescale sind reine Daten. Tests 63/63, check/build grün,
14-d-Sim ohne Runaway. 59 Sorten (+1 Spezial) in 8 Kategorien. **Offen → Phase 33:**
eigene Sprites für die Hanf-Spitze; optional eine echte neue Kategorie; Toast-Log
optional persistent.

### 9.35 Phase 33 — Eigene Hanf-Sprites & neue Endgame-Kategorie „Kosmisch" (keine Save-Änderung)

Beide Folgevorschläge aus Phase 32 umgesetzt.

- **Eigene Sprites für die Hanf-Spitze (sprites.ts):** die fünf Phase-32-Hanfsorten
  hatten nur aliasierte Goldhanf-Optik. Jetzt **distinkte Reife-Sprites** — dieselbe
  Cannabis-Fächersilhouette, aber je Sorte eine eigene Blütenfarbe (Sonnenhanf gold,
  Sternenhanf blau-weiß, Nebelhanf silber, Kosmoshanf violett, Ewigkeitshanf
  gold-plum) + eigene Sternenrose. Validiert via `scripts/sprite-atlas.mjs`
  (alle 16×16, gültige Legend-Chars).
- **Neue Kategorie „Kosmisch" (`kosmos`):** eine echte neue Pflanzen-Kategorie
  jenseits der Hanf-Linie als finaler Build-Pfad. 3 kosmische Sorten (Sternensaat
  P64 → Nebularblüte P70 → Urknallfrucht P78, regrow, `minGrowSeconds` 60–90, Unlock
  1e29→1e31), eigene **Spezialisierung** mit neuem Perk-Typ **`sell`** (+5 %/Stufe
  Verkaufspreis NUR für diese Kategorie — frischer Build-Axis, gewirkt in
  `sellInternal`, Auto-Verkauf-Tick und Verkaufsvorschau), eigene **Akzentfarbe**
  (blau) und eigene Sprites (distinkte Reife-Grids + kosmischer Setzling). Voll
  datengetrieben: Spezialisierungs-Shop, Quest-Kategorien, Hotbar und Ziel-Panel
  ziehen die Kategorie automatisch mit; `PlantCategory` + `Record<PlantCategory>`-
  UI-Maps ergänzt.

Save-sicher (SAVE_VERSION bleibt 28): neue Pflanzen-/Kategorie-IDs defaulten auf 0/
unbespielt, neuer SpecKind nur additiv. Tests 64/64, check/build grün, 14-d-Sim ohne
Runaway. **62 Sorten (+1 Spezial) in 9 Kategorien.** **Offen → Phase 34:** Toast-Log
optional persistent; ggf. eigene Sprites für die Kosmisch-Frühstufen.

### 9.36 Phase 34 — Reife-Zeit-Bug, Holz-Rework, Bulk-Rubbeln, Level-Softcap (keine Save-Änderung)

Vier Endgame-Schmerzpunkte aus dem Live-Feedback (Parzelle 39, +Mio % Tempo).

- **Reife-Zeit-„Bug" (Wahrnehmung) behoben:** Der Hotbar-Tooltip zeigte die ROHE
  `growTime`/`regrowTime` (z. B. „12 h 46 m"), während das Beet die echte (Mio-fach
  beschleunigte) Zeit herunterzählte — und die ALTEN Very-Late-Pflanzen hatten gar
  keinen Boden, reiften also in <1 s (Helfer kamen nicht mit, wirkten „schneller"
  als die neuen Sorten). Fix: (1) ein **growTime-gegateter Echtzeit-Boden**
  (`CONFIG.minCycleFloorSeconds` 8 s für Pflanzen mit `growTime ≥ 50000`; schnelle
  Früh-/Mid-Pflanzen bleiben unberührt, ihre Tempo-Upgrades wirken weiter), sodass
  ALLE Endgame-Pflanzen eine echte Kadenz haben (8–32 s, monoton steigend, keine
  Inversion). (2) `effectiveCycleSeconds` + ein **wahrhaftiger Tooltip**, der die
  reale Reifezeit beim aktuellen Multiplikator zeigt. Per-Pflanze-Böden auf
  nicht-skalierte Kadenz umgestellt (Hanf 10–20 s, Kosmos 24–32 s).
- **Holz-Rework — „Hain"-Aura:** passives Holz-Gold war chancenlos (kein
  Ertrags-Multiplikator). Jetzt skaliert es mit `yieldMultiplier` UND reife Bäume
  geben eine **separate, multiplikative Ertrags-Aura** für den ganzen Garten
  (`PlantDef.forestYield`, `forestBonus()`, von der Holz-Spezialisierung verstärkt).
  Holz wird so ein echter Build (ein paar Beete opfern → ~×1,5 Ertrag im Optimum),
  statt nutzlos. Sichtbar als 🌲-Chip im Garten-Kopf.
- **Bulk-Rubbeln:** `scratchAll()` + „Alle Lose auf einmal rubbeln"-Button — der
  Endgame-Hort (23 000+ Lose) wird in einem Klick zu einem Gold-/Kompost-/Dünger-/
  XP-Bündel eingelöst (jedes Los zum Nominalwert), statt 23 000-mal Pick-3.
- **Level-Softcap:** der Level-Ertragsbonus hart bei +300 % gedeckelt → ab ~Lvl 300
  wertlos. Jetzt **Wurzel-Softcap** (`levelYieldBonus`): jenseits des Caps wächst er
  per √ weiter (Lvl 44 000 ≈ +2390 %, endlos abnehmend) → hohe Level zählen wieder.
- **Skills erweitert:** vier neue Zweittier-Knoten (Kompostmeister/Marktimperium/
  Glücksrausch/Zierkrone) — mehr sinnvolle Ziele für den Skillpunkt-Überschuss.

Save-sicher (SAVE_VERSION bleibt 28): neue Felder/IDs defaulten, reine Daten/Logik.
Tests 65/65, check/build grün, 14-d-Sim ohne Runaway. **Offen → Phase 35:** Toast-Log
optional persistent; eigene Sprites für die Kosmisch-Frühstufen.

### 9.37 Phase 35 — Diagnose-Check + Kosmisch-Frühstufen-Sprites (keine Save-Änderung)

Diagnosegetriebener Mini-Durchlauf: erst `playtest.mjs`/`diagnose.mjs` am aktuellen
Stand laufen lassen. Befund: **kein Gameplay-Bug** — alle 22 Szenarien haben ≥3
offene Optionen über mehrere Horizonte; die im Tally „toten" Systeme (spec/beauty/
mastery) sind **multiplikativ und gesund**, nur in den synthetischen Ständen nicht
bespielt (und die Build-Entdeckungsziele nudgen ohnehin dorthin). Also reine Politur:

- **Eigene Kosmisch-Frühstufen-Sprites:** die in Phase 33 versprochene visuelle
  Konsequenz. Setzling und beide Jungstufen der Kosmisch-Kategorie (Sternensaat/
  Nebularblüte/Urknallfrucht) waren auf den Magie-Setzling bzw. Kristallbeeren-
  Jungstufen aliasiert; jetzt eine eigene **blau-weiße Stern-Optik** (seedlingKosmos
  → kosmos1 → kosmos2), sodass die Kategorie von Sprössling bis Reife kohärent
  kosmisch aussieht. Sprite-Validator (16×16, gültige Legend-Chars) + check/build grün.

Keine Save-Änderung (SAVE_VERSION bleibt 28). Tests 65/65. **Offen → Phase 36:**
Toast-Log optional persistent; weitere Politur nach Spieler-Feedback.

### 9.38 Phase 36 — Toast-Log über Reloads persistent (keine Save-Änderung)

Der Toast-Verlauf (Phase 30) war session-only. Jetzt überlebt er ein Neuladen:
gespeichert unter **eigenem localStorage-Key** (`garten-imperium-toastlog`),
komplett vom Spielsave entkoppelt (kein SAVE_VERSION-Bezug). Schreiben ist
gedrosselt (ein 120-Event-Burst → ein Write), der Unseen-Badge startet beim Laden
bei 0 (Alt-Einträge sind zum Nachlesen, nicht zum Nerven). `ToastLogPanel` zeigt
relative Zeiten jetzt auch in Tagen. Test deckt den Reload-Roundtrip ab (66/66).
Keine Save-Änderung (SAVE_VERSION bleibt 28).

### 9.39 Phase 37 — Endgame-Paket: Kadenz-Fix, bezahlbare/Massen-Felder, Zier permanent, neue Sorten, Kreuzungen (keine Save-Änderung)

Großes Spieler-Feedback-Paket aus dem Very-Late-Game.

- **Kadenz-Bug behoben:** die neuen Endgame-Pflanzen liefen viel langsamer als die
  alten (Phase-34-Eskalation 10–32 s vs. 8 s). Jetzt teilen sich ALLE Endgame-Pflanzen
  den **einen globalen 8-s-Boden** (per-Pflanze-`minGrowSeconds` entfernt) → höhere
  Sorten sind nie langsamer, nur ertragreicher. Keine Inversion mehr.
- **Bezahlbare Felder + „Alle Felder kaufen":** die 1,5×-Beetkurve explodierte über
  die 150+ Beete eines Tief-Prestige-Gartens (Beet 164 ≈ 2,5e30 → unkaufbar). Neue
  **piecewise-Kurve** (steil bis Beet 20, danach 1,12× sanft) → bei Parzelle 39
  kostet das letzte Beet jetzt ~908 B statt 2,5e30. Plus `buyAllPlots()` +
  **„Alle Felder kaufen"-Button** — kein ewiges Klick-für-Klick nach jedem Prestige.
- **Zierpflanzen permanent + stärker:** „Alles roden" lässt Zierpflanzen jetzt stehen
  (nur Einzel-Roden entfernt sie) → das Schönheitsfeld bleibt beim Crop-Wechsel
  erhalten. Obere Zier-`beautyBonus` deutlich angehoben (Sternenrose 0,9→1,8 u. a.)
  + Beauty-Softcap-Exp 0,5→0,6 → spürbar höherer Verkaufspreis-Boost.
- **Mehr/teurere Sorten:** 4 neue kosmische Spitzen (Singularitätsblume P83 →
  Quasarkern P88 → Leerenblüte P93 → Schöpfungskern P98, Unlock 3e32→1e37) mit
  **~×10 Ertragssprung je Sorte** und **ROI ~0,4** (Saat = 2,5× pro-Ernte), sodass
  ein volles Feld eine echte Investition ist statt sofort gekauft; auch die
  bestehenden Endgame-Saatpreise auf ROI ~0,4 angehoben.
- **Eigene Kategorie „Kreuzungen":** Saatlabor-Spezialpflanzen (Prachtorchidee)
  bekommen einen **eigenen Hotbar-Tab** statt unten in einer Fremdkategorie zu
  hängen. Special-only (nicht im Spezialisierungs-Shop), erscheint erst nach
  Entdeckung. PlantCategory + UI-Maps + Setzling-Sprite ergänzt.

Save-sicher (SAVE_VERSION bleibt 28): neue IDs/Kategorie defaulten, reine Daten/Logik;
bestehende Beete laufen via plantById weiter. Tests 67/67, check/build grün, 14-d-Sim
ohne Runaway. 66 Sorten (+1 Spezial) in 9 Kategorien + „Kreuzungen" (Saatlabor).

### 9.40 Phase 38 — Mobile-Usability (keine Save-Änderung)

Gezielte Behebung der gemeldeten schlechten Handy-Bedienung.

- **Spielfeld-Überlauf behoben (der Haupt-Bug):** das Feld nutzte fixe Spalten
  (`repeat(7, var(--cell))` ≈ 530 px) → auf einem Telefon **horizontaler
  Seiten-Scroll**, alles verrutschte. Jetzt packt das Grid auf ≤640 px so viele
  `--cell`-Spalten, wie tatsächlich passen (`auto-fill`, engere Gaps, Breite 100 %)
  → kein Überlauf mehr. Zusätzlich `overflow-x: hidden` auf `body` als Netz.
- **Modal-Schließen immer erreichbar:** der Overlay-Header (Titel + ✕) ist jetzt
  `sticky` — bei langen Panels (Shop/Skills/Erfolge) scrollt der Schließen-Knopf
  nicht mehr weg.
- **Aufgeräumte Button-Reihen:** die Topbar-Panel-Buttons und die Garten-Kopf-
  Aktionen (säen/gießen/roden/kaufen/ernten) werden auf dem Handy **zentriert
  umgebrochen** (vorher rechts-/space-between-gestreckt = kaputt wirkend).

Reine CSS-/Layout-Politur, keine Logik-/Save-Änderung (SAVE_VERSION 28). check/build
grün, Tests 67/67. **Offen → Phase 39:** eigene Sprites für die 4 neuen Sorten; weitere
Mobile-Feinheiten nach Test auf echtem Gerät.

### 9.41 Phase 39 — Alle Saatlabor-Kreuzungen pflanzbar (keine Save-Änderung)

Lücke geschlossen: die Kategorie „Kreuzungen" enthielt nur die Prachtorchidee,
obwohl das Saatlabor 10 Varianten kennt. Jetzt ist **jede entdeckte Variante ein
pflanzbares Schau-Exemplar** in „Kreuzungen" — reine Zier-Utility (Schönheit nach
Seltenheit: Bronze 0,3 → Legendär 1,8; kein Ertrag), max. 3 je Sorte, gegated über
`discoveredVariants`. Integriert wie die Prachtorchidee allein über `plantById`
(Plot/Beauty/Save/Hotbar generisch); Sprites thematisch aliasiert (eigene Pixel-Art
später). 10 statt 1 Spezial-Pflanze. Keine Save-Änderung (SAVE_VERSION 28), 68/68.
