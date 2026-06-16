import type { Food } from './types'
import { SEED_FOODS } from './seedFoods'

/**
 * Abstraction over wherever food data comes from.
 *
 * The app depends only on this interface, so the seed dataset can be swapped
 * for a larger backend (e.g. USDA FoodData Central) by writing a new
 * implementation — the engine and UI never change. A remote implementation
 * would make `search` async-capable; today everything is in-memory and sync.
 */
export interface FoodSource {
  getAll(): Food[]
  getById(id: string): Food | undefined
  search(query: string): Food[]
}

class LocalFoodSource implements FoodSource {
  constructor(private readonly foods: Food[]) {}

  getAll(): Food[] {
    return this.foods
  }

  getById(id: string): Food | undefined {
    return this.foods.find((f) => f.id === id)
  }

  search(query: string): Food[] {
    const q = query.trim().toLowerCase()
    if (!q) return this.foods
    return this.foods.filter((f) => f.name.toLowerCase().includes(q))
  }
}

/** Default data source for the app: the curated in-memory seed catalogue. */
export const foodSource: FoodSource = new LocalFoodSource(SEED_FOODS)
