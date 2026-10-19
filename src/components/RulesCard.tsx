import { useI18n, type MessageKey } from '../i18n'
import { bear, chores, coins, treatments, water, type TreatmentKind } from '../config/rules'
import './SettingsCards.css'

type Row = { what: string; amount: string }

/** Rules explainer generated from src/config/rules.ts, so it can never drift from the game. */
export default function RulesCard() {
  const { t } = useI18n()
  const plus = (n: number) => `+${n}`

  const earn: Row[] = [
    { what: t('rules.earn.water'), amount: plus(coins.waterCupApproved) },
    { what: t('rules.earn.chore'), amount: plus(coins.choreOnTime) },
    { what: t('rules.earn.hand'), amount: plus(coins.handScorePlus) },
    { what: t('rules.earn.streak', { n: coins.perfectStreakDays }), amount: plus(coins.perfectStreak) },
    { what: t('rules.earn.cook'), amount: t('rules.each', { n: coins.cookedWish }) },
    { what: t('rules.earn.shopping'), amount: plus(coins.shoppingListCleared) },
  ]

  const lose: Row[] = [
    { what: t('rules.lose.water', { n: water.dailyGoalYoyo }), amount: t('rules.lose.waterEffect', { n: -bear.water.missedGoal }) },
    { what: t('rules.lose.hand'), amount: t('rules.lose.handEffect', { n: -bear.clean.handMinus, below: bear.clean.crackedPawsBelow }) },
    {
      what: t('rules.lose.chores', { shave: chores.shaveIntervalDays, nails: chores.nailsIntervalDays }),
      amount: t('rules.lose.choresEffect', { n: -bear.clean.overduePerDay }),
    },
    { what: t('rules.lose.ill'), amount: t('rules.lose.illEffect', { n: -bear.mood.perIllDay }) },
    { what: t('rules.lose.idle'), amount: t('rules.lose.idleEffect', { n: -bear.energy.idleDay }) },
    { what: t('rules.lose.shared', { n: bear.mood.bluesBelow }), amount: t('rules.lose.sharedEffect') },
    {
      what: t('rules.lose.untreated'),
      amount: t('rules.lose.untreatedEffect', { moderate: bear.escalation.moderateAfterDays, severe: bear.escalation.severeAfterDays }),
    },
  ]

  const treat: Row[] = (Object.keys(treatments) as TreatmentKind[]).map((k) => ({
    what: t(`rules.treat.${k}` as MessageKey, { hours: treatments[k].waitHours }),
    amount: String(treatments[k].cost),
  }))

  return (
    <section className="card rules">
      <h2 className="settings__heading">{t('rules.title')}</h2>
      <RuleList title={t('rules.earnTitle')} tone="earn" rows={earn} />
      <RuleList title={t('rules.loseTitle')} tone="lose" rows={lose} />
      <RuleList title={t('rules.treatTitle')} tone="treat" rows={treat} />
      <div className="rules__note">
        {t('rules.note1')}
        <br />
        {t('rules.note2', { min: bear.statMin })}
      </div>
    </section>
  )
}

function RuleList({ title, tone, rows }: { title: string; tone: 'earn' | 'lose' | 'treat'; rows: Row[] }) {
  return (
    <>
      <h3 className={`rules__sub rules__sub--${tone}`}>{title}</h3>
      <ul className="rules__list">
        {rows.map((r) => (
          <li key={r.what}>
            <span>{r.what}</span>
            <strong className={`rules__amount rules__amount--${tone}`}>{r.amount}</strong>
          </li>
        ))}
      </ul>
    </>
  )
}
