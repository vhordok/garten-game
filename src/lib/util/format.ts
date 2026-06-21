// Central number/time formatting — all UI numbers go through here (CLAUDE.md rule 6).

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No']

/** 999 → "999", 1500 → "1.5K", 2_340_000 → "2.34M", 1.1e9 → "1.1B" */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞'
  if (value < 0) return `-${formatNumber(-value)}`
  if (value < 1000) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
  }

  let tier = Math.floor(Math.log10(value) / 3)
  let scaled = value / 10 ** (3 * tier)
  // Rounding may push e.g. 999_999 to "1000K" — bump into the next tier.
  if (scaled >= 999.5) {
    tier += 1
    scaled = value / 10 ** (3 * tier)
  }
  if (tier >= SUFFIXES.length) return value.toExponential(2).replace('e+', 'e')

  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
  return trimZeros(scaled.toFixed(decimals)) + SUFFIXES[tier]
}

/** 45.3 → "46s", 95 → "1m 35s", 7322 → "2h 2m", 200000 → "2d 8h" */
export function formatDuration(totalSeconds: number): string {
  // Guard non-finite (e.g. a time estimate that divided by a huge/zero rate at
  // extreme scale) — otherwise the d/h math yields "Infinityd NaNh".
  if (!Number.isFinite(totalSeconds)) return '∞'
  const s = Math.max(0, Math.ceil(totalSeconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}
