// Campaign progression (PHASE 48). `state.campaign` is the index of the NEXT
// unclaimed step in the CAMPAIGN array (0 = at the very first step,
// CAMPAIGN.length = whole chain finished). Pure TS over GameState.

import { CAMPAIGN, type CampaignStep } from '../data/campaign'
import type { GameState } from './types'

/** The current (next unclaimed) step, or null once the chain is complete. */
export function currentCampaignStep(state: GameState): CampaignStep | null {
  return CAMPAIGN[state.campaign] ?? null
}

/** Progress (current / target, clamped) toward the current step. */
export function campaignProgress(state: GameState): { current: number; target: number; fraction: number } | null {
  const step = currentCampaignStep(state)
  if (!step) return null
  const current = Math.max(0, step.metric(state))
  const target = step.target
  const fraction = target > 0 ? Math.min(1, current / target) : 1
  return { current, target, fraction }
}

/**
 * Auto-claim every step whose target the live state already meets, paying the
 * one-time reward once and advancing `campaign`. Mirrors claimAchievements: call
 * it in tick. Returns the freshly completed steps (newest last) for a toast.
 */
export function claimCampaign(state: GameState): CampaignStep[] {
  const done: CampaignStep[] = []
  while (state.campaign < CAMPAIGN.length) {
    const step = CAMPAIGN[state.campaign]
    if (step.metric(state) < step.target) break
    const r = step.reward
    if (r.compost) state.compost += r.compost
    if (r.tickets) state.scratchTickets += r.tickets
    if (r.fertilizer) state.fertilizerCharges += r.fertilizer
    state.campaign += 1
    done.push(step)
  }
  return done
}

/**
 * Migration / new-feature init: advance `campaign` past every step the loaded
 * state already satisfies WITHOUT paying rewards (no retroactive flood — existing
 * players resume the chain at their real frontier and earn from there on).
 */
export function initCampaign(state: GameState): void {
  let i = 0
  while (i < CAMPAIGN.length && CAMPAIGN[i].metric(state) >= CAMPAIGN[i].target) i++
  state.campaign = i
}
