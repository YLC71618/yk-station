import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { useFood } from '../lib/useFood'
import { CloseIcon } from './icons'
import './SettingsCards.css'

/** Edit the spinner's standing options (wish-list dishes join the wheel automatically). */
export default function SpinnerOptionsCard() {
  const { t } = useI18n()
  const { options, addOption, removeOption } = useFood()
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    const ok = await addOption(v)
    setNote(ok ? '' : t('spinner.duplicate', { name: v }))
    if (ok) setDraft('')
  }

  return (
    <section id="spinner" className="card card--soft spinner-opts">
      <h2 className="settings__heading">{t('spinner.title')}</h2>
      <p className="muted-small">{t('spinner.hint')}</p>
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
        />
        <button type="submit" className="pink-button" disabled={!draft.trim()}>
          {t('food.add')}
        </button>
      </form>
      {note && <p className="muted-small">{note}</p>}
    </section>
  )
}
