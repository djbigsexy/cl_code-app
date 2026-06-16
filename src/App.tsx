import { useMemo, useState } from 'react'
import { foodSource } from './data/foodSource'
import type { Food } from './data/types'
import {
  balanceRating,
  glycemicLoad,
  mealTotals,
  type BalanceRating,
} from './engine/glycemic'
import { suggestPartners } from './engine/pairing'

const RATING_LABEL: Record<BalanceRating, string> = {
  balanced: 'Balanced',
  moderate: 'Moderate',
  spiky: 'Spiky',
}

export default function App() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)

  const matches = useMemo(() => foodSource.search(query).slice(0, 8), [query])

  return (
    <main className="app">
      <header>
        <h1>GI Balance</h1>
        <p className="tagline">
          Pick a food and get pairings that keep your meal's glycemic load
          balanced.
        </p>
      </header>

      <section className="picker">
        <label htmlFor="food-search">What are you eating?</label>
        <input
          id="food-search"
          type="text"
          autoComplete="off"
          placeholder="Search a food, e.g. white rice"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
          }}
        />
        {!selected && query && (
          <ul className="results">
            {matches.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(food)
                    setQuery(food.name)
                  }}
                >
                  <span>{food.name}</span>
                  <span className="muted">GL {glycemicLoad(food).toFixed(0)}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="muted empty">No matches</li>}
          </ul>
        )}
      </section>

      {selected && <Results chosen={selected} />}
    </main>
  )
}

function Results({ chosen }: { chosen: Food }) {
  const suggestions = suggestPartners(chosen, foodSource.getAll())
  const aloneRating = balanceRating(mealTotals([chosen]))

  return (
    <section className="results-panel">
      <div className="chosen">
        <h2>{chosen.name}</h2>
        <RatingPill rating={aloneRating} />
        <p className="muted">
          Glycemic load {glycemicLoad(chosen).toFixed(0)} · {chosen.carbsPerServing}g
          carbs per {chosen.servingGrams}g serving
        </p>
      </div>

      <h3>Pair it with</h3>
      <ul className="suggestions">
        {suggestions.map((s) => (
          <li key={s.food.id}>
            <div className="suggestion-head">
              <strong>{s.food.name}</strong>
              <RatingPill rating={balanceRating(s.combinedTotals)} />
            </div>
            <p className="reason">{s.reason}</p>
            <p className="muted small">
              Together: GL {s.combinedTotals.glycemicLoad.toFixed(0)} ·{' '}
              {s.combinedTotals.protein.toFixed(0)}g protein ·{' '}
              {s.combinedTotals.fiber.toFixed(0)}g fiber
            </p>
          </li>
        ))}
      </ul>

      <p className="disclaimer">
        Estimates from a small built-in food list for general guidance only —
        not medical advice. Individual blood-sugar responses vary.
      </p>
    </section>
  )
}

function RatingPill({ rating }: { rating: BalanceRating }) {
  return <span className={`pill pill-${rating}`}>{RATING_LABEL[rating]}</span>
}
