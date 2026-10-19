import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../shell/PageHeader'
import WhoChips from '../components/WhoChips'
import { Wheel, useSpinner } from '../components/Spinner'
import { Toast, useToast } from '../components/Toast'
import { BookIcon, CloseIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useFood, type Wish } from '../lib/useFood'
import type { Role } from '../lib/supabase'
import { recipeSources } from '../config/recipes'
import './FoodPage.css'

export default function FoodPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const food = useFood()
  const toast = useToast()
  const [who, setWho] = useState<Role>(profile!.role)
  const [draft, setDraft] = useState('')
  const spinner = useSpinner(food.spinnerNames)
  const name = (r: Role) => t(r === 'yoyo' ? 'role.yoyo' : 'role.kyle')

  async function add(dish: string) {
    const v = dish.trim()
    if (!v) return
    await food.addWish(v, who)
    setDraft('')
    toast.show(t('food.added', { who: name(who) }))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    add(draft)
  }

  async function cook(w: Wish) {
    const res = await food.cook(w.id)
    toast.show(res.ok ? t('food.cooked', { dish: w.name, coins: res.coins ?? 0 }) : t('auth.error.generic'))
  }

  return (
    <>
      <PageHeader title={t('food.title')} />
      <div className="page-body">
        <form className="card food-add" onSubmit={onSubmit}>
          <div className="food-add__top">
            <label htmlFor="want-food" className="food-add__label">
              {t('food.question')}
            </label>
            <WhoChips value={who} onChange={setWho} label={(r) => t('food.wants', { who: name(r) })} />
          </div>
          <div className="food-add__row">
            <input
              id="want-food"
              className="text-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('food.placeholder')}
              enterKeyHint="done"
            />
            <button type="submit" className="pink-button" disabled={!draft.trim()}>
              {t('food.add')}
            </button>
          </div>
        </form>

        <div className="food-spin">
          <Wheel slices={spinner.slices} rot={spinner.rot} />
          <div className="food-spin__side">
            <span className="muted-small">{t('food.unsure')}</span>
            {spinner.result && (
              <>
                <span className="food-spin__got">{t('food.landed')}</span>
                <strong className="food-spin__result">{spinner.result}</strong>
              </>
            )}
            <button type="button" className="white-button" onClick={spinner.spin} disabled={spinner.spinning || !spinner.slices.length}>
              {t(spinner.spinning ? 'food.spinning' : spinner.result ? 'food.spinAgain' : 'food.spin')}
            </button>
            {spinner.result && (
              <button type="button" className="pink-button" onClick={() => add(spinner.result)}>
                {t('food.addFor', { who: name(who) })}
              </button>
            )}
            <Link to="/settings#spinner" className="food-spin__edit">
              {t('food.editOptions')}
            </Link>
          </div>
        </div>

        <Toast message={toast.message} />

        {(['yoyo', 'kyle'] as const).map((r) => {
          const items = food.wishes.filter((w) => w.who === r)
          return (
            <section key={r} className={`card wish wish--${r}`}>
              <h2 className="wish__title">{t('food.wants', { who: name(r) })}</h2>
              {!items.length && <span className="muted-small">{t('food.empty')}</span>}
              {items.map((w) => {
                const src = recipeSources[w.source_index % recipeSources.length]
                return (
                  <div key={w.id} className="wish__item">
                    <div className="wish__head">
                      <span className="wish__name">{w.name}</span>
                      <button type="button" className="wish__remove" onClick={() => food.removeWish(w.id)} aria-label={t('food.remove', { dish: w.name })}>
                        <CloseIcon />
                      </button>
                    </div>
                    <div className="wish__actions">
                      <a className="wish__recipe" href={src.url(w.name)} target="_blank" rel="noopener noreferrer">
                        <BookIcon />
                        {t('food.recipe', { source: src.name })}
                      </a>
                      <button type="button" className="wish__next" onClick={() => food.nextSource(w)}>
                        {t('food.nextSource')}
                      </button>
                      <button type="button" className="wish__cook" onClick={() => cook(w)}>
                        {t('food.cook')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </>
  )
}
