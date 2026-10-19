import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../shell/PageHeader'
import Avatar from '../components/Avatar'
import { BearInBed } from '../components/Bear'
import { GearIcon } from '../components/icons'
import { Toast, useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthProvider'
import { useI18n, type MessageKey, type TFunction } from '../i18n'
import { useWard, type Bear } from '../lib/useWard'
import type { Role } from '../lib/supabase'
import { coins, treatments, type TreatmentKind } from '../config/rules'
import './WardPage.css'

const KINDS: TreatmentKind[] = ['medicine', 'injection', 'hospital']
const DAY_MS = 86_400_000

const roleName = (t: TFunction, role: Role) => t(role === 'yoyo' ? 'role.yoyo' : 'role.kyle')

export default function WardPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const me = profile!.role
  const { bear, balances, treat, nudge } = useWard()
  const toast = useToast()
  const [missing, setMissing] = useState(0)
  const [partnerMissing, setPartnerMissing] = useState(0)
  const [busy, setBusy] = useState(false)

  const sick = !!bear?.illness
  const waiting = !!bear?.hospital_until
  const payer = bear?.caused_by ?? null
  const shared = payer === 'both'
  const iPay = sick && (payer === me || shared)
  const partner: Role = me === 'yoyo' ? 'kyle' : 'yoyo'
  const half = (kind: TreatmentKind) => Math.ceil(treatments[kind].cost / 2)

  async function onTreat(kind: TreatmentKind) {
    if (!bear || busy) return
    setMissing(0)
    setPartnerMissing(0)
    if (!sick) return toast.show(t('ward.toast.healthy'))
    setBusy(true)
    try {
      const res = await treat(kind)
      if (res.ok) {
        const vars = {
          who: roleName(t, me),
          cost: treatments[kind].cost,
          each: half(kind),
          hours: treatments[kind].waitHours,
          treatment: t(`treat.${kind}`),
        }
        toast.show(
          res.shared
            ? t(res.waiting ? 'ward.toast.admittedShared' : 'ward.toast.curedShared', vars)
            : t(res.waiting ? 'ward.toast.admitted' : 'ward.toast.cured', vars),
        )
      } else if (res.error === 'insufficient') {
        setMissing(res.missing)
        setPartnerMissing(res.partner_missing ?? 0)
        if (!res.missing && res.partner_missing) toast.show(t('ward.partnerMissing', { who: roleName(t, partner), n: res.partner_missing }))
      } else {
        toast.show(t(`ward.error.${res.error}` as MessageKey))
      }
    } catch {
      toast.show(t('auth.error.generic'))
    } finally {
      setBusy(false)
    }
  }

  async function onNudge() {
    if (!payer || payer === 'both') return
    await nudge()
    toast.show(t('ward.toast.nudged', { who: roleName(t, payer) }))
  }

  return (
    <>
      <PageHeader
        big
        kicker="YK STATION"
        title={t('ward.title')}
        action={
          <Link to="/settings" className="round-button" aria-label={t('settings.title')}>
            <GearIcon />
          </Link>
        }
      />
      <div className="page-body ward">
        <div className="ward__coins">
          {(['yoyo', 'kyle'] as const).map((role) => (
            <div key={role} className={`ward__coin ward__coin--${role}`}>
              <Avatar role={role} size={40} label={t('ward.avatar', { who: roleName(t, role) })} />
              <div className="ward__coin-text">
                <span className="ward__coin-name">{roleName(t, role)}</span>
                <span className="ward__coin-amount">
                  {balances[role]} <small>{t('coins.unit')}</small>
                </span>
              </div>
            </div>
          ))}
        </div>

        <section className="card ward__bed">
          <div className="ward__bed-top">
            <span className={`chip ${sick ? 'chip--sick' : 'chip--healthy'}`}>{bear ? statusText(t, bear) : '…'}</span>
            {bear && <span className="ward__stay">{t('ward.stay', { n: stayDays(bear) })}</span>}
          </div>
          <div className="ward__bear">
            <BearInBed sick={sick} label={t('ward.bearLabel')} />
          </div>
        </section>

        <Toast message={toast.message} />

        {bear && (
          <section className="card card--soft ward__vitals">
            <Vital label={t('stat.water')} value={bear.water} stat="water" owner={t('role.yoyo')} ownerRole="yoyo" />
            <Vital label={t('stat.clean')} value={bear.clean} stat="clean" owner={t('role.kyle')} ownerRole="kyle" />
            <Vital label={t('stat.mood')} value={bear.mood} stat="mood" owner={t('stat.both')} ownerRole="both" />
            <Vital label={t('stat.energy')} value={bear.energy} stat="energy" owner={t('stat.both')} ownerRole="both" />
          </section>
        )}

        <div className="ward__treatments">
          {KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="ward__treat"
              disabled={busy || waiting || (sick && !iPay)}
              onClick={() => onTreat(kind)}
            >
              <span className="ward__treat-label">{t(`treat.${kind}`)}</span>
              <span className="ward__treat-cost">
                {shared ? t('ward.eachCost', { n: half(kind) }) : `${treatments[kind].cost} ${t('coins.unit')}`}
              </span>
            </button>
          ))}
        </div>

        {sick && shared && !waiting && <p className="ward__note ward__note--soft">{t('ward.sharedNote')}</p>}

        {waiting && bear?.hospital_until && (
          <p className="ward__note">
            {t('ward.waitingBed', { time: new Date(bear.hospital_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
          </p>
        )}

        {sick && !waiting && payer && payer !== 'both' && !iPay && (
          <div className="ward__note ward__note--row">
            <span>{t('ward.waitingPayer', { who: roleName(t, payer) })}</span>
            <button type="button" className="ward__nudge" onClick={onNudge}>
              {t('ward.nudge')}
            </button>
          </div>
        )}

        {missing > 0 && <EarnTips missing={missing} role={me} />}
        {missing > 0 && partnerMissing > 0 && (
          <p className="ward__note">{t('ward.partnerMissing', { who: roleName(t, partner), n: partnerMissing })}</p>
        )}
      </div>
    </>
  )
}

function statusText(t: TFunction, bear: Bear) {
  if (!bear.illness || !bear.severity) return t('ward.healthy')
  return t('ward.sick', { illness: t(`illness.${bear.illness}`), severity: t(`severity.${bear.severity}`) })
}

function stayDays(bear: Bear) {
  return Math.floor((Date.now() - new Date(bear.admitted_at).getTime()) / DAY_MS) + 1
}

function Vital(props: { label: string; value: number; stat: string; owner: string; ownerRole: Role | 'both' }) {
  return (
    <div className="vital">
      <span className="vital__label">{props.label}</span>
      <div className="vital__track">
        <div className={`vital__fill vital__fill--${props.stat}`} style={{ width: `${props.value}%` }} />
      </div>
      <span className="vital__value">{props.value}%</span>
      <span className={`vital__owner vital__owner--${props.ownerRole}`}>{props.owner}</span>
    </div>
  )
}

/** Shown when the payer can't afford a treatment: how much is missing and how to earn it. */
function EarnTips({ missing, role }: { missing: number; role: Role }) {
  const { t } = useI18n()
  const tips: [MessageKey, number][] = [
    ['earn.water', coins.waterCupApproved],
    ...(role === 'kyle'
      ? ([
          ['earn.chore', coins.choreOnTime],
          ['earn.hand', coins.handScorePlus],
        ] as [MessageKey, number][])
      : []),
    ['earn.cook', coins.cookedWish],
    ['earn.shopping', coins.shoppingListCleared],
    ['earn.streak', coins.perfectStreak],
  ]
  return (
    <section className="card ward__earn" role="alert">
      <h2>{t('ward.missing', { n: missing })}</h2>
      <ul>
        {tips.map(([key, n]) => (
          <li key={key}>
            <span>{t(key)}</span>
            <strong>+{n}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}
