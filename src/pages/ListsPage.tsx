import { useState, type FormEvent } from 'react'
import PageHeader from '../shell/PageHeader'
import WhoChips from '../components/WhoChips'
import { Toast, useToast } from '../components/Toast'
import { PlusIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { useShopping, type Item, type ListKind } from '../lib/useShopping'
import type { Role } from '../lib/supabase'
import './ListsPage.css'

const LISTS: ListKind[] = ['grocery', 'stuff']

export default function ListsPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { items, add, tick, clearDone } = useShopping()
  const toast = useToast()
  const [tab, setTab] = useState<ListKind>('grocery')
  const [by, setBy] = useState<Role>(profile!.role)
  const [draft, setDraft] = useState('')
  const name = (r: Role) => t(r === 'yoyo' ? 'role.yoyo' : 'role.kyle')

  const list = items.filter((i) => i.list === tab)
  const done = list.filter((i) => i.done).length

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    setDraft('')
    await add(tab, v, by)
  }

  async function onTick(item: Item, checked: boolean) {
    const res = await tick(item, checked)
    if (res.cleared) toast.show(t('lists.cleared', { coins: res.coins ?? 0 }))
  }

  return (
    <>
      <PageHeader kicker={t('lists.kicker')} kickerColor="kyle" title={t('lists.title')} />
      <div className="page-body">
        <div className="segmented" role="tablist">
          {LISTS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={tab === l}
              className={tab === l ? 'is-on' : ''}
              onClick={() => setTab(l)}
            >
              {t(`lists.${l}`, { n: items.filter((i) => i.list === l).length })}
            </button>
          ))}
        </div>

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
              placeholder={t(tab === 'grocery' ? 'lists.placeholderGrocery' : 'lists.placeholderStuff')}
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
          <span className="list-head__count">{t('lists.bought', { done, total: list.length })}</span>
        </div>

        <ul className="items">
          {list.map((it) => (
            <li key={it.id} className="item">
              <input id={`item-${it.id}`} type="checkbox" checked={it.done} onChange={(e) => onTick(it, e.target.checked)} />
              <label htmlFor={`item-${it.id}`} className={it.done ? 'is-done' : ''}>
                {it.name}
              </label>
              <span className={`item__by item__by--${it.added_by}`}>{name(it.added_by)}</span>
            </li>
          ))}
          {!list.length && <li className="items__empty">{t('lists.empty')}</li>}
        </ul>

        <Toast message={toast.message} />

        {done > 0 && (
          <button type="button" className="clear-done" onClick={() => clearDone(tab)}>
            {t('lists.clearDone')}
          </button>
        )}
      </div>
    </>
  )
}
