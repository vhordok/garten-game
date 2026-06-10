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
- **Garten-Feeling:** warme Grün- und Erdtöne, Emojis als Pflanzen-Icons,
  weiche Schatten, sanfte Wachstums-/Ernte-Animationen. Gemütlich, nicht grell.

## 8. Phasenplan

| Phase | Inhalt | Status |
|---|---|---|
| **1** | Beet-Grid (Start 4, kaufbar bis 16), 3 Kräuter, manuell pflanzen/ernten/verkaufen, Save/Load + Export/Import, Offline-Wachstum, Zahlenformat | ✅ umgesetzt |
| 2 | Gemüse-Kategorie, Unlock-UI, Bewässerungs-Upgrades | offen |
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
