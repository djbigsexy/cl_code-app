import type { Food } from '../data/types'
import {
  balanceScore,
  glycemicLoad,
  mealTotals,
  type MealTotals,
} from './glycemic'

export interface PairingSuggestion {
  food: Food
  /** Balance score of the chosen food eaten together with this partner. */
  combinedScore: number
  /** Improvement in balance score versus eating the chosen food alone. */
  improvement: number
  /** Totals for the chosen + partner meal. */
  combinedTotals: MealTotals
  /** Human-readable explanation of why this partner helps. */
  reason: string
}

export interface SuggestOptions {
  /** Maximum number of suggestions to return. Default 5. */
  limit?: number
  /** Exclude partners in the same category as the chosen food. Default true. */
  differentCategoryOnly?: boolean
}

/**
 * Suggest foods that, eaten alongside the chosen food, keep the combined meal's
 * glycemic response balanced.
 *
 * Strategy: a good partner is itself low in glycemic load and contributes
 * protein, fat, or fiber that blunts the chosen food's carbohydrate. We score
 * every candidate by the balance of the resulting two-food meal and rank by how
 * much it improves on eating the chosen food alone.
 */
export function suggestPartners(
  chosen: Food,
  catalogue: Food[],
  options: SuggestOptions = {},
): PairingSuggestion[] {
  const { limit = 5, differentCategoryOnly = true } = options

  const aloneTotals = mealTotals([chosen])
  const aloneScore = balanceScore(aloneTotals)

  return catalogue
    .filter((candidate) => candidate.id !== chosen.id)
    .filter((candidate) =>
      differentCategoryOnly ? candidate.category !== chosen.category : true,
    )
    .map((candidate) => {
      const combinedTotals = mealTotals([chosen, candidate])
      const combinedScore = balanceScore(combinedTotals)
      return {
        food: candidate,
        combinedScore,
        improvement: combinedScore - aloneScore,
        combinedTotals,
        reason: explainPartner(chosen, candidate),
      }
    })
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit)
}

/** Build a short reason describing what a partner contributes. */
function explainPartner(chosen: Food, partner: Food): string {
  const contributions: string[] = []
  if (partner.proteinPerServing >= 8) contributions.push('protein')
  if (partner.fatPerServing >= 8) contributions.push('healthy fat')
  if (partner.fiberPerServing >= 4) contributions.push('fiber')

  const partnerGl = glycemicLoad(partner)
  const chosenGl = glycemicLoad(chosen)

  if (contributions.length > 0) {
    const list =
      contributions.length === 1
        ? contributions[0]
        : `${contributions.slice(0, -1).join(', ')} and ${contributions.at(-1)}`
    return `Adds ${list} to slow how fast ${chosen.name.toLowerCase()} raises blood sugar.`
  }

  if (partnerGl < chosenGl) {
    return `Low glycemic load, so it rounds out the meal without adding a spike.`
  }

  return `Keeps the meal's overall glycemic load in check.`
}
