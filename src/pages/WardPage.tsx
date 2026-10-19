import { Link } from 'react-router-dom'
import PageHeader from '../shell/PageHeader'
import { BearInBed } from '../components/Bear'
import { GearIcon } from '../components/icons'
import { useI18n } from '../i18n'

export default function WardPage() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader
        back={false}
        kicker="YK STATION"
        title={t('ward.title')}
        action={
          <Link to="/settings" className="round-button" aria-label={t('settings.title')}>
            <GearIcon />
          </Link>
        }
      />
      <div className="page-body">
        <section className="card" style={{ display: 'flex', justifyContent: 'center' }}>
          <BearInBed sick={false} label={t('ward.bearLabel')} />
        </section>
        <p className="placeholder">{t('common.comingSoon', { n: 3 })}</p>
      </div>
    </>
  )
}
