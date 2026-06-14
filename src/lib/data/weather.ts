// Weather/night events: short live moments with a banner. Triggered by the
// UI scheduler (live play only), effects applied in core via state.weather.

export interface WeatherDef {
  id: string
  name: string
  /** banner line shown while active */
  text: string
  durationSeconds: number
  weight: number
}

export const WEATHER_EVENTS: WeatherDef[] = [
  {
    id: 'regen',
    name: 'Sommerregen',
    text: 'Sommerregen! Alle Beete wurden gratis gegossen.',
    durationSeconds: 8,
    weight: 40,
  },
  {
    id: 'sternschnuppen',
    name: 'Sternschnuppen-Nacht',
    text: 'Sternschnuppen! Goldene Ernten sind ×3 so wahrscheinlich.',
    durationSeconds: 60,
    weight: 35,
  },
  {
    id: 'marktboom',
    name: 'Marktboom',
    text: 'Marktboom! Alle Verkäufe bringen +50 %.',
    durationSeconds: 120,
    weight: 25,
  },
  // ── PHASE 18: category/chance events — never punishing, always an opportunity ──
  {
    id: 'erntefest',
    name: 'Erntefest',
    text: 'Erntefest! Alle Ernten bringen +50 % Ertrag.',
    durationSeconds: 90,
    weight: 22,
  },
  {
    id: 'komposttag',
    name: 'Komposttag',
    text: 'Komposttag! Der nächste Parzellen-Kompost fällt +50 % höher aus.',
    durationSeconds: 120,
    weight: 16,
  },
  {
    id: 'meistertag',
    name: 'Meistertag',
    text: 'Meistertag! Ernten geben doppelte Meisterschafts-XP.',
    durationSeconds: 90,
    weight: 16,
  },
  {
    id: 'gartenschau',
    name: 'Gartenschau',
    text: 'Gartenschau! Besucher strömen — Schönheit wirkt +50 % stärker.',
    durationSeconds: 90,
    weight: 14,
  },
]

export function weatherById(id: string): WeatherDef | undefined {
  return WEATHER_EVENTS.find((w) => w.id === id)
}
