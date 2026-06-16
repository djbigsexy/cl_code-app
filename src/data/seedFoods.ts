import type { Food } from './types'

/**
 * Hand-curated seed dataset.
 *
 * GI values are representative averages drawn from commonly published glycemic
 * index tables; macro figures are rounded to typical values for the stated
 * serving. These are approximations meant to prove out the pairing engine, not
 * clinical data. Foods with negligible digestible carbohydrate (meats, oils)
 * use gi = 0.
 *
 * To grow the catalogue, add entries here, or implement a new FoodSource
 * (see foodSource.ts) backed by an external database such as USDA FoodData
 * Central without changing the engine or UI.
 */
export const SEED_FOODS: Food[] = [
  // Grains & starches
  { id: 'white-rice', name: 'White rice (cooked)', category: 'grain', gi: 73, servingGrams: 150, carbsPerServing: 40, proteinPerServing: 3, fatPerServing: 0, fiberPerServing: 1 },
  { id: 'brown-rice', name: 'Brown rice (cooked)', category: 'grain', gi: 68, servingGrams: 150, carbsPerServing: 33, proteinPerServing: 3, fatPerServing: 1, fiberPerServing: 2 },
  { id: 'basmati-rice', name: 'Basmati rice (cooked)', category: 'grain', gi: 58, servingGrams: 150, carbsPerServing: 38, proteinPerServing: 4, fatPerServing: 0, fiberPerServing: 1 },
  { id: 'quinoa', name: 'Quinoa (cooked)', category: 'grain', gi: 53, servingGrams: 150, carbsPerServing: 30, proteinPerServing: 6, fatPerServing: 3, fiberPerServing: 4 },
  { id: 'white-bread', name: 'White bread', category: 'grain', gi: 75, servingGrams: 30, carbsPerServing: 14, proteinPerServing: 2, fatPerServing: 1, fiberPerServing: 1 },
  { id: 'whole-grain-bread', name: 'Whole grain bread', category: 'grain', gi: 51, servingGrams: 30, carbsPerServing: 12, proteinPerServing: 3, fatPerServing: 1, fiberPerServing: 3 },
  { id: 'oats', name: 'Rolled oats (cooked)', category: 'grain', gi: 55, servingGrams: 150, carbsPerServing: 27, proteinPerServing: 5, fatPerServing: 3, fiberPerServing: 4 },
  { id: 'pasta', name: 'Pasta (cooked, al dente)', category: 'grain', gi: 49, servingGrams: 180, carbsPerServing: 43, proteinPerServing: 8, fatPerServing: 1, fiberPerServing: 3 },

  // Starchy vegetables
  { id: 'baked-potato', name: 'Baked potato', category: 'starchy-vegetable', gi: 85, servingGrams: 150, carbsPerServing: 30, proteinPerServing: 3, fatPerServing: 0, fiberPerServing: 3 },
  { id: 'sweet-potato', name: 'Sweet potato (boiled)', category: 'starchy-vegetable', gi: 54, servingGrams: 150, carbsPerServing: 27, proteinPerServing: 2, fatPerServing: 0, fiberPerServing: 4 },
  { id: 'corn', name: 'Sweet corn', category: 'starchy-vegetable', gi: 52, servingGrams: 150, carbsPerServing: 30, proteinPerServing: 5, fatPerServing: 2, fiberPerServing: 4 },

  // Legumes
  { id: 'lentils', name: 'Lentils (cooked)', category: 'legume', gi: 32, servingGrams: 150, carbsPerServing: 25, proteinPerServing: 12, fatPerServing: 1, fiberPerServing: 8 },
  { id: 'chickpeas', name: 'Chickpeas (cooked)', category: 'legume', gi: 28, servingGrams: 150, carbsPerServing: 27, proteinPerServing: 11, fatPerServing: 4, fiberPerServing: 8 },
  { id: 'black-beans', name: 'Black beans (cooked)', category: 'legume', gi: 30, servingGrams: 150, carbsPerServing: 25, proteinPerServing: 12, fatPerServing: 1, fiberPerServing: 9 },

  // Vegetables (non-starchy)
  { id: 'broccoli', name: 'Broccoli', category: 'vegetable', gi: 15, servingGrams: 100, carbsPerServing: 7, proteinPerServing: 3, fatPerServing: 0, fiberPerServing: 3 },
  { id: 'spinach', name: 'Spinach', category: 'vegetable', gi: 15, servingGrams: 100, carbsPerServing: 4, proteinPerServing: 3, fatPerServing: 0, fiberPerServing: 2 },
  { id: 'mixed-salad', name: 'Mixed green salad', category: 'vegetable', gi: 15, servingGrams: 100, carbsPerServing: 4, proteinPerServing: 1, fatPerServing: 0, fiberPerServing: 2 },
  { id: 'avocado', name: 'Avocado', category: 'fat', gi: 15, servingGrams: 100, carbsPerServing: 9, proteinPerServing: 2, fatPerServing: 15, fiberPerServing: 7 },

  // Fruit
  { id: 'apple', name: 'Apple', category: 'fruit', gi: 36, servingGrams: 120, carbsPerServing: 19, proteinPerServing: 0, fatPerServing: 0, fiberPerServing: 3 },
  { id: 'banana', name: 'Banana', category: 'fruit', gi: 51, servingGrams: 120, carbsPerServing: 27, proteinPerServing: 1, fatPerServing: 0, fiberPerServing: 3 },
  { id: 'watermelon', name: 'Watermelon', category: 'fruit', gi: 76, servingGrams: 120, carbsPerServing: 9, proteinPerServing: 1, fatPerServing: 0, fiberPerServing: 1 },
  { id: 'berries', name: 'Mixed berries', category: 'fruit', gi: 40, servingGrams: 120, carbsPerServing: 14, proteinPerServing: 1, fatPerServing: 0, fiberPerServing: 4 },

  // Dairy
  { id: 'greek-yogurt', name: 'Greek yogurt (plain)', category: 'dairy', gi: 11, servingGrams: 170, carbsPerServing: 6, proteinPerServing: 17, fatPerServing: 4, fiberPerServing: 0 },
  { id: 'milk', name: 'Milk (whole)', category: 'dairy', gi: 39, servingGrams: 250, carbsPerServing: 12, proteinPerServing: 8, fatPerServing: 8, fiberPerServing: 0 },
  { id: 'cheese', name: 'Cheddar cheese', category: 'dairy', gi: 0, servingGrams: 40, carbsPerServing: 1, proteinPerServing: 10, fatPerServing: 14, fiberPerServing: 0 },

  // Protein
  { id: 'chicken-breast', name: 'Chicken breast (grilled)', category: 'protein', gi: 0, servingGrams: 120, carbsPerServing: 0, proteinPerServing: 36, fatPerServing: 4, fiberPerServing: 0 },
  { id: 'salmon', name: 'Salmon (baked)', category: 'protein', gi: 0, servingGrams: 120, carbsPerServing: 0, proteinPerServing: 25, fatPerServing: 13, fiberPerServing: 0 },
  { id: 'eggs', name: 'Eggs', category: 'protein', gi: 0, servingGrams: 100, carbsPerServing: 1, proteinPerServing: 13, fatPerServing: 11, fiberPerServing: 0 },
  { id: 'tofu', name: 'Tofu (firm)', category: 'protein', gi: 15, servingGrams: 120, carbsPerServing: 3, proteinPerServing: 17, fatPerServing: 9, fiberPerServing: 1 },

  // Fats
  { id: 'olive-oil', name: 'Olive oil', category: 'fat', gi: 0, servingGrams: 14, carbsPerServing: 0, proteinPerServing: 0, fatPerServing: 14, fiberPerServing: 0 },
  { id: 'almonds', name: 'Almonds', category: 'fat', gi: 15, servingGrams: 30, carbsPerServing: 6, proteinPerServing: 6, fatPerServing: 14, fiberPerServing: 4 },
  { id: 'peanut-butter', name: 'Peanut butter', category: 'fat', gi: 14, servingGrams: 32, carbsPerServing: 6, proteinPerServing: 8, fatPerServing: 16, fiberPerServing: 2 },

  // Sweets
  { id: 'table-sugar', name: 'Table sugar', category: 'sweet', gi: 65, servingGrams: 12, carbsPerServing: 12, proteinPerServing: 0, fatPerServing: 0, fiberPerServing: 0 },
  { id: 'dark-chocolate', name: 'Dark chocolate (70%)', category: 'sweet', gi: 23, servingGrams: 30, carbsPerServing: 13, proteinPerServing: 2, fatPerServing: 12, fiberPerServing: 3 },
]
