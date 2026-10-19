// Route stubs until each screen's milestone lands (SPEC §9).
import PageHeader from '../shell/PageHeader'
import { useI18n } from '../i18n'

function Soon({ n }: { n: number }) {
  const { t } = useI18n()
  return (
    <div className="page-body">
      <section className="card card--soft">
        <p className="placeholder">{t('common.comingSoon', { n })}</p>
      </section>
    </div>
  )
}

export function FoodPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('food.title')} />
      <Soon n={7} />
    </>
  )
}

export function ListsPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader kicker={t('lists.kicker')} kickerColor="kyle" title={t('lists.title')} />
      <Soon n={8} />
    </>
  )
}
