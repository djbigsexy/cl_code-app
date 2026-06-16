/**
 * Core domain types for the GI Balance app.
 *
 * The app reasons about glycemic *load* (GL), not glycemic index (GI) alone.
 * GI ranks how fast a food's carbohydrate raises blood glucose (0-100) but
 * ignores portion size. GL = GI * carbsPerServing / 100 reflects the actual
 * blood-sugar impact of a real serving, and protein/fat/fiber blunt the spike.
 * Every Food therefore carries macros, not just a GI number.
 */

export type FoodCategory =
  | 'grain'
  | 'starchy-vegetable'
  | 'vegetable'
  | 'fruit'
  | 'legume'
  | 'dairy'
  | 'protein'
  | 'fat'
  | 'sweet'
  | 'other'

export interface Food {
  /** Stable identifier, unique within a data source. */
  id: string
  name: string
  category: FoodCategory
  /**
   * Glycemic index, 0-100. Use 0 for foods with negligible digestible carbs
   * (most meats, fats, and oils) — their glycemic load is effectively zero.
   */
  gi: number
  /** Reference serving size in grams that the macro fields describe. */
  servingGrams: number
  /** Grams of total carbohydrate in one serving. */
  carbsPerServing: number
  /** Grams of protein in one serving. */
  proteinPerServing: number
  /** Grams of fat in one serving. */
  fatPerServing: number
  /** Grams of dietary fiber in one serving. */
  fiberPerServing: number
}
