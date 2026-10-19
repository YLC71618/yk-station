import PageHeader from '../shell/PageHeader'
import { Toast, useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useBalances } from '../lib/useBalances'
import { CupsCard, ReviewList } from '../water/WaterParts'
import { ChoreCards, HandScoreCard } from '../components/KyleCards'

export default function KylePage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const me = profile!.role
  const balances = useBalances()
  const toast = useToast()

  return (
    <>
      <PageHeader
        kicker={t('kyle.kicker')}
        kickerColor="kyle"
        title={t('tasks.title')}
        action={<span className="coin-pill coin-pill--kyle">{t('coins.pill', { n: balances.kyle })}</span>}
      />
      <div className="page-body">
        <Toast message={toast.message} />
        <ChoreCards me={me} onResult={toast.show} />
        <CupsCard owner="kyle" me={me} title={t('water.myTitle')} />
        <ReviewList owner="kyle" me={me} onResult={toast.show} />
        <HandScoreCard me={me} scoring={false} onResult={toast.show} />
        <button type="button" className="add-task add-task--kyle" onClick={() => toast.show(t('tasks.addLater'))}>
          {t('tasks.add')}
        </button>
      </div>
    </>
  )
}
