import type { Food } from '../data/types'

/**
 * Glycemic load of a single serving: GL = GI * carbs / 100.
 * Standard thresholds for a single food: <=10 low, 11-19 medium, >=20 high.
 */
export function glycemicLoad(food: Food): number {
  return (food.gi * food.carbsPerServing) / 100
}

export interface MealTotals {
  carbs: number
  protein: number
  fat: number
  fiber: number
  glycemicLoad: number
}

/** Sum macros and glycemic load across every item in a meal. */
export function mealTotals(foods: Food[]): MealTotals {
  return foods.reduce<MealTotals>(
    (acc, f) => ({
      carbs: acc.carbs + f.carbsPerServing,
      protein: acc.protein + f.proteinPerServing,
      fat: acc.fat + f.fatPerServing,
      fiber: acc.fiber + f.fiberPerServing,
      glycemicLoad: acc.glycemicLoad + glycemicLoad(f),
    }),
    { carbs: 0, protein: 0, fat: 0, fiber: 0, glycemicLoad: 0 },
  )
}

/**
 * Ratio of blunting nutrients (protein + fat + fiber) to carbohydrate.
 * Protein, fat, and fiber slow gastric emptying and flatten the glucose
 * response, so a higher ratio means a given carbohydrate load is better
 * buffered. Carb-free meals return Infinity (nothing to spike).
 */
export function bluntingRatio(totals: MealTotals): number {
  if (totals.carbs <= 0) return Infinity
  return (totals.protein + totals.fat + totals.fiber) / totals.carbs
}

export type BalanceRating = 'balanced' | 'moderate' | 'spiky'

/**
 * Qualitative balance of a meal. A meal is friendlier to blood sugar when its
 * total glycemic load is modest AND its carbs are well buffered by protein,
 * fat, and fiber. Both levers matter, so we combine them: a high GL can still
 * rate "moderate" when heavily blunted, and a low GL stays "balanced".
 */
export function balanceRating(totals: MealTotals): BalanceRating {
  const gl = totals.glycemicLoad
  const ratio = bluntingRatio(totals)

  if (gl <= 10 || ratio >= 1.5) return 'balanced'
  if (gl <= 20 || ratio >= 0.75) return 'moderate'
  return 'spiky'
}

/**
 * Single numeric score (higher is better) summarizing how blood-sugar-friendly
 * a meal is. Used to rank pairing suggestions by how much they improve a meal.
 * Lower glycemic load and stronger blunting both raise the score.
 */
export function balanceScore(totals: MealTotals): number {
  const ratio = bluntingRatio(totals)
  const cappedRatio = Number.isFinite(ratio) ? Math.min(ratio, 3) : 3
  // Penalize glycemic load; reward blunting. Scaled to keep typical meals
  // in a readable range without any single term dominating.
  return 100 - totals.glycemicLoad * 2 + cappedRatio * 15
}
