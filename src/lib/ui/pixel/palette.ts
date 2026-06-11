// Single source of truth for every color in the game. initPixelUi() injects
// these as CSS variables (--c-<name>) at boot; sprite grids reference them
// through the one-character LEGEND below. Pure TS, no Svelte (UI helper).

export const COLORS = {
  // night / chrome
  night0: '#090a14',
  night1: '#10141f',
  panel: '#151d28',
  edge: '#202e37',
  slate: '#394a50',
  steel: '#577277',
  mist: '#819796',
  silver: '#a8b5b2',
  cloud: '#c7cfcc',
  white: '#ebede9',
  // sky
  sky0: '#172038',
  sky1: '#253a5e',
  // foliage ramp (dark → light)
  leaf0: '#19332d',
  leaf1: '#25562e',
  leaf2: '#468232',
  leaf3: '#75a743',
  leaf4: '#a8ca58',
  leaf5: '#d0da91',
  // soil / wood
  soil0: '#341c27',
  soil1: '#602c2c',
  soil2: '#884b2b',
  // gold (money, perfect harvests)
  gold0: '#be772b',
  gold1: '#de9e41',
  gold2: '#e8c170',
  // plum (xp, legendary harvests)
  plum0: '#402751',
  plum1: '#7a367b',
  plum2: '#c65197',
  plum3: '#df84a5',
  // water / rare
  blue0: '#3c5e8b',
  blue1: '#4f8fba',
  blue2: '#73bed3',
  // danger
  red0: '#a53030',
  red1: '#cf573c',
  // combo heat (UI only, no sprite legend char)
  ember: '#ff9f43',
} as const

export type ColorName = keyof typeof COLORS

/** Sprite-grid legend: one character per palette color, '.' = transparent. */
export const LEGEND: Record<string, ColorName> = {
  k: 'night0',
  K: 'night1',
  e: 'panel',
  E: 'edge',
  n: 'slate',
  N: 'steel',
  h: 'mist',
  H: 'silver',
  w: 'cloud',
  W: 'white',
  s: 'sky0',
  S: 'sky1',
  g: 'leaf0',
  G: 'leaf1',
  f: 'leaf2',
  F: 'leaf3',
  l: 'leaf4',
  L: 'leaf5',
  d: 'soil0',
  D: 'soil1',
  b: 'soil2',
  o: 'gold0',
  O: 'gold1',
  y: 'gold2',
  p: 'plum0',
  P: 'plum1',
  m: 'plum2',
  M: 'plum3',
  u: 'blue0',
  U: 'blue1',
  c: 'blue2',
  r: 'red0',
  R: 'red1',
}
