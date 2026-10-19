import { useState, type FormEvent } from 'react'
import PageHeader from '../shell/PageHeader'
import WhoChips from '../components/WhoChips'
import { PlusIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useShopping } from '../lib/useShopping'
import type { Role } from '../lib/supabase'
import './ListsPage.css'

export default function ListsPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { items, add, tick, clearDone } = useShopping()
  const [by, setBy] = useState<Role>(profile!.role)
  const [draft, setDraft] = useState('')
  const name = (r: Role) => t(r === 'yoyo' ? 'role.yoyo' : 'role.kyle')
  const done = items.filter((i) => i.done).length

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    setDraft('')
    await add(v, by)
  }

  return (
    <>
      <PageHeader kicker={t('lists.kicker')} kickerColor="kyle" title={t('lists.title')} />
      <div className="page-body">
        <form className="card card--soft list-add" onSubmit={onAdd}>
          <label htmlFor="new-item" className="list-add__label">
            {t('lists.newItem')}
          </label>
          <div className="list-add__row">
            <input
              id="new-item"
              className="text-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('lists.placeholder')}
              enterKeyHint="done"
            />
            <button type="submit" className="list-add__plus" aria-label={t('lists.add')} disabled={!draft.trim()}>
              <PlusIcon />
            </button>
          </div>
          <div className="list-add__by">
            <span className="muted-small">{t('lists.addedBy')}</span>
            <WhoChips value={by} onChange={setBy} label={name} />
          </div>
        </form>

        <div className="list-head">
          <h2 className="list-head__title">{t('lists.toBuy')}</h2>
          <span className="list-head__count">{t('lists.bought', { done, total: items.length })}</span>
        </div>

        <ul className="items">
          {items.map((it) => (
            <li key={it.id} className="item">
              <input id={`item-${it.id}`} type="checkbox" checked={it.done} onChange={(e) => tick(it, e.target.checked)} />
              <label htmlFor={`item-${it.id}`} className={it.done ? 'is-done' : ''}>
                {it.name}
              </label>
              <span className={`item__by item__by--${it.added_by}`}>{name(it.added_by)}</span>
            </li>
          ))}
          {!items.length && <li className="items__empty">{t('lists.empty')}</li>}
        </ul>


        {done > 0 && (
          <button type="button" className="clear-done" onClick={clearDone}>
            {t('lists.clearDone')}
          </button>
        )}
      </div>
    </>
  )
}
