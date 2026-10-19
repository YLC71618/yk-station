import PageHeader from '../shell/PageHeader'
import { Toast, useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useBalances } from '../lib/useBalances'
import { CupsCard, RequestCard, ReviewList } from '../water/WaterParts'
import { HandScoreCard } from '../components/KyleCards'

export default function YoyoPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const me = profile!.role
  const balances = useBalances()
  const toast = useToast()

  return (
    <>
      <PageHeader
        kicker={t('yoyo.kicker')}
        kickerColor="yoyo"
        title={t('tasks.title')}
        action={<span className="coin-pill">{t('coins.pill', { n: balances.yoyo })}</span>}
      />
      <div className="page-body">
        <Toast message={toast.message} />
        {me === 'yoyo' && <RequestCard />}
        <CupsCard owner="yoyo" me={me} title={t('water.todayTitle')} />
        <ReviewList owner="kyle" me={me} onResult={toast.show} />
        <HandScoreCard me={me} scoring onResult={toast.show} />
        <button type="button" className="add-task" onClick={() => toast.show(t('tasks.addLater'))}>
          {t('tasks.add')}
        </button>
      </div>
    </>
  )
}
