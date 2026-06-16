import { describe, expect, it } from 'vitest'
import { SEED_FOODS } from '../data/seedFoods'
import { foodSource } from '../data/foodSource'
import { suggestPartners } from './pairing'

const byId = (id: string) => {
  const f = foodSource.getById(id)
  if (!f) throw new Error(`missing seed food: ${id}`)
  return f
}

describe('suggestPartners', () => {
  it('improves balance for a high-GI food', () => {
    const rice = byId('white-rice')
    const suggestions = suggestPartners(rice, SEED_FOODS)
    expect(suggestions.length).toBeGreaterThan(0)
    // Every returned partner should improve on eating rice alone.
    for (const s of suggestions) {
      expect(s.improvement).toBeGreaterThan(0)
    }
  })

  it('ranks suggestions by combined balance score, descending', () => {
    const rice = byId('white-rice')
    const suggestions = suggestPartners(rice, SEED_FOODS)
    const scores = suggestions.map((s) => s.combinedScore)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('respects the limit option', () => {
    const rice = byId('white-rice')
    expect(suggestPartners(rice, SEED_FOODS, { limit: 3 })).toHaveLength(3)
  })

  it('excludes same-category foods by default', () => {
    const rice = byId('white-rice') // grain
    const suggestions = suggestPartners(rice, SEED_FOODS)
    expect(suggestions.every((s) => s.food.category !== 'grain')).toBe(true)
  })

  it('never suggests the chosen food itself', () => {
    const rice = byId('white-rice')
    const suggestions = suggestPartners(rice, SEED_FOODS, {
      differentCategoryOnly: false,
    })
    expect(suggestions.every((s) => s.food.id !== 'white-rice')).toBe(true)
  })

  it('favors protein/fat/fiber partners for a high-GI carb', () => {
    const potato = byId('baked-potato')
    const top = suggestPartners(potato, SEED_FOODS)[0]
    const buffering =
      top.food.proteinPerServing + top.food.fatPerServing + top.food.fiberPerServing
    expect(buffering).toBeGreaterThan(8)
  })
})
