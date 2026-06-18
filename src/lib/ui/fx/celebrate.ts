// Level-up fanfare shared by every harvest entry point: toast, sound,
// shake and a gold/plum burst at the place it happened.
//
// PHASE 29: in the late game a single "alle ernten" can cross many levels, and
// repeated harvests fire in bursts. Instead of one toast per call piling up, we
// AGGREGATE into a single live toast ("+N Level · +X Goldbonus"). The gold bonus
// is always granted in the core regardless — this only governs the feedback.

import type { LevelUp } from '../../game/actions'
import { formatNumber } from '../../util/format'
import { pushAggregateToast } from '../toasts'
import { playSound } from './audio'
import { burst } from './particles'
import { screenShake } from './shake'

interface LevelAcc {
  levels: number
  gold: number
  top: number
}

export function celebrateLevelUps(levelUps: LevelUp[], x: number, y: number): void {
  if (levelUps.length === 0) return
  const top = levelUps[levelUps.length - 1]
  const reward = levelUps.reduce((sum, up) => sum + up.reward, 0)
  const gained = levelUps.length

  pushAggregateToast<LevelAcc>({
    key: 'levelup',
    icon: '⭐',
    priority: 'important',
    ttlMs: 6000,
    merge: (prev) => {
      const levels = (prev?.levels ?? 0) + gained
      const gold = (prev?.gold ?? 0) + reward
      const topLevel = Math.max(prev?.top ?? 0, top.level)
      const text =
        levels === 1
          ? `Level ${topLevel} erreicht · +${formatNumber(gold)} Gold`
          : `+${levels} Level (jetzt ${topLevel}) · +${formatNumber(gold)} Goldbonus`
      return { acc: { levels, gold, top: topLevel }, text }
    },
  })

  playSound('levelup')
  screenShake(1)
  burst(x, y, {
    colors: ['plum2', 'plum3', 'gold1', 'gold2'],
    count: 30,
    speed: 210,
    lift: 170,
    sizeMax: 6,
    ttl: 1,
  })
}
