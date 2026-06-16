import { describe, expect, it } from 'vitest'
import type { Food } from '../data/types'
import {
  balanceRating,
  bluntingRatio,
  glycemicLoad,
  mealTotals,
} from './glycemic'

const food = (overrides: Partial<Food>): Food => ({
  id: 'x',
  name: 'Test',
  category: 'other',
  gi: 0,
  servingGrams: 100,
  carbsPerServing: 0,
  proteinPerServing: 0,
  fatPerServing: 0,
  fiberPerServing: 0,
  ...overrides,
})

describe('glycemicLoad', () => {
  it('computes GI * carbs / 100', () => {
    expect(glycemicLoad(food({ gi: 73, carbsPerServing: 40 }))).toBeCloseTo(29.2)
  })

  it('is zero for carb-free foods regardless of GI', () => {
    expect(glycemicLoad(food({ gi: 50, carbsPerServing: 0 }))).toBe(0)
  })
})

describe('mealTotals', () => {
  it('sums macros and glycemic load across foods', () => {
    const totals = mealTotals([
      food({ gi: 73, carbsPerServing: 40, proteinPerServing: 3 }),
      food({ gi: 0, carbsPerServing: 0, proteinPerServing: 36, fatPerServing: 4 }),
    ])
    expect(totals.carbs).toBe(40)
    expect(totals.protein).toBe(39)
    expect(totals.fat).toBe(4)
    expect(totals.glycemicLoad).toBeCloseTo(29.2)
  })
})

describe('bluntingRatio', () => {
  it('returns Infinity when there are no carbs', () => {
    expect(bluntingRatio(mealTotals([food({ proteinPerServing: 10 })]))).toBe(
      Infinity,
    )
  })

  it('rises as protein/fat/fiber increase relative to carbs', () => {
    const low = mealTotals([food({ carbsPerServing: 40, proteinPerServing: 4 })])
    const high = mealTotals([
      food({ carbsPerServing: 40, proteinPerServing: 4 }),
      food({ proteinPerServing: 36, fatPerServing: 4 }),
    ])
    expect(bluntingRatio(high)).toBeGreaterThan(bluntingRatio(low))
  })
})

describe('balanceRating', () => {
  it('rates a low glycemic load meal as balanced', () => {
    expect(balanceRating(mealTotals([food({ gi: 15, carbsPerServing: 7 })]))).toBe(
      'balanced',
    )
  })

  it('rates a high-GL, poorly buffered meal as spiky', () => {
    expect(
      balanceRating(mealTotals([food({ gi: 85, carbsPerServing: 40 })])),
    ).toBe('spiky')
  })

  it('upgrades a high-GL meal when heavily blunted by protein and fat', () => {
    const rating = balanceRating(
      mealTotals([
        food({ gi: 85, carbsPerServing: 30 }),
        food({ proteinPerServing: 36, fatPerServing: 14, fiberPerServing: 4 }),
      ]),
    )
    expect(rating).not.toBe('spiky')
  })
})
