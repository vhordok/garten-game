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
]

export function weatherById(id: string): WeatherDef | undefined {
  return WEATHER_EVENTS.find((w) => w.id === id)
}
