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
| **5** | Beerensträucher (Wiederernte), Obstbäume | ✅ via §9.9 (passive Holz-Bäume offen) |
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
live-only), passive Holz-Bäume (Eiche 28/s, Mammutbaum 480/s — §3 #5),
22 Achievements à +1 % Ertrag, Cannabis hinter 3 Lizenzen mit
Pflege-Malus (§3 #7), Rekorde + 24-h-Einnahmen-Graph, generative
Chiptune-Musik + Nacht-Ambience. Save v13–v18. 25 Sorten in
7 Kategorien.

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
