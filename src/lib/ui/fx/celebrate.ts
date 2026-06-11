// Level-up fanfare shared by every harvest entry point: toast, sound,
// shake and a gold/plum burst at the place it happened.

import type { LevelUp } from '../../game/actions'
import { formatNumber } from '../../util/format'
import { pushToast } from '../toasts'
import { playSound } from './audio'
import { burst } from './particles'
import { screenShake } from './shake'

export function celebrateLevelUps(levelUps: LevelUp[], x: number, y: number): void {
  if (levelUps.length === 0) return
  const top = levelUps[levelUps.length - 1]
  const reward = levelUps.reduce((sum, up) => sum + up.reward, 0)
  pushToast(`Level ${top.level} erreicht! Bonus: +${formatNumber(reward)} Gold`, '⭐', 7000)
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
