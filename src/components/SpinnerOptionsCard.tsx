import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { useFood } from '../lib/useFood'
import { SPINNER_MAX_OPTIONS } from '../config/recipes'
import { CloseIcon } from './icons'
import './SettingsCards.css'

/** Edit the spinner's standing options (wish-list dishes join the wheel automatically). */
export default function SpinnerOptionsCard() {
  const { t } = useI18n()
  const { options, addOption, removeOption, clearOptions } = useFood()
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const full = options.length >= SPINNER_MAX_OPTIONS

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const v = draft.trim()
    if (!v || full) return
    const ok = await addOption(v)
    setNote(ok ? '' : t('spinner.duplicate', { name: v }))
    if (ok) setDraft('')
  }

  return (
    <section id="spinner" className="card card--soft spinner-opts">
      <div className="spinner-opts__head">
        <h2 className="settings__heading">{t('spinner.title')}</h2>
        <span className={`spinner-opts__count${full ? ' is-full' : ''}`}>
          {options.length} / {SPINNER_MAX_OPTIONS}
        </span>
      </div>
      <p className="muted-small">{full ? t('spinner.full', { n: SPINNER_MAX_OPTIONS }) : t('spinner.hint')}</p>
      <div className="spinner-opts__chips">
        {options.map((o) => (
          <span key={o.id} className="opt-chip">
            {o.name}
            <button type="button" onClick={() => removeOption(o.id)} aria-label={t('food.remove', { dish: o.name })}>
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
      </div>
      <form className="spinner-opts__row" onSubmit={onAdd}>
        <label htmlFor="wheel-new" className="visually-hidden">
          {t('spinner.title')}
        </label>
        <input
          id="wheel-new"
          className="text-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('spinner.placeholder')}
          disabled={full}
        />
        <button type="submit" className="pink-button" disabled={!draft.trim() || full}>
          {t('food.add')}
        </button>
      </form>
      {note && <p className="muted-small">{note}</p>}
      {options.length > 0 && (
        <button
          type="button"
          className="spinner-opts__clear"
          onClick={() => window.confirm(t('spinner.clearConfirm', { n: options.length })) && clearOptions()}
        >
          {t('spinner.clear')}
        </button>
      )}
    </section>
  )
}
