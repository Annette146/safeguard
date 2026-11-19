import { Link } from 'react-router';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useEmergencyNumbers } from '../components/Layout';

export function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nums = useEmergencyNumbers();
  const tile = 'flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-600 hover:shadow min-h-24';

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-900">{user ? `Hello, ${user.fullName.split(' ')[0]}` : t('welcome')}</h1>
        <p className="text-slate-700 mt-1 max-w-2xl">{t('welcomeBody')}</p>
      </section>

      <Link to="/sos" className="block rounded-2xl bg-sos hover:bg-sos-dark text-white text-center px-6 py-8 shadow-lg focus-visible:ring-4 ring-red-300">
        <span className="block text-3xl sm:text-4xl font-black tracking-wide">SOS</span>
        <span className="block text-lg sm:text-xl font-bold mt-1">{t('sos')}</span>
        <span className="block text-sm mt-2 text-red-100">Sends your location to responders. You'll see each step of the alert's progress.</span>
      </Link>

      <div className="flex flex-wrap gap-2" aria-label={t('callEmergency')}>
        {nums.map((n) => (
          <a key={n} href={`tel:${n}`} className="flex-1 min-w-36 rounded-xl border-2 border-sos text-sos font-bold text-center py-3 hover:bg-red-50">
            📞 {t('callEmergency')} · {n}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Link to={user ? '/report?mode=identified' : '/report?mode=anonymous'} className={tile}>
          <span className="text-2xl" aria-hidden="true">📝</span>
          <span className="font-semibold text-brand-900">{t('report')}</span>
          <span className="text-sm text-slate-600">A few short steps. Add photos, video or audio.</span>
        </Link>
        <Link to="/report?mode=anonymous" className={tile}>
          <span className="text-2xl" aria-hidden="true">🕶️</span>
          <span className="font-semibold text-brand-900">{t('reportAnon')}</span>
          <span className="text-sm text-slate-600">No account needed. You get a private code to follow up.</span>
        </Link>
        {user
          ? <Link to="/reports" className={tile}><span className="text-2xl" aria-hidden="true">📂</span><span className="font-semibold text-brand-900">{t('myReports')}</span><span className="text-sm text-slate-600">Status, messages and evidence for your reports.</span></Link>
          : <Link to="/track" className={tile}><span className="text-2xl" aria-hidden="true">🔎</span><span className="font-semibold text-brand-900">{t('track')}</span><span className="text-sm text-slate-600">Use your reference number and tracking code.</span></Link>}
        <Link to="/map" className={tile}>
          <span className="text-2xl" aria-hidden="true">🗺️</span>
          <span className="font-semibold text-brand-900">{t('map')}</span>
          <span className="text-sm text-slate-600">See your location and your reports on the map.</span>
        </Link>
        <Link to="/help" className={tile}>
          <span className="text-2xl" aria-hidden="true">🛟</span>
          <span className="font-semibold text-brand-900">{t('help')}</span>
          <span className="text-sm text-slate-600">How anonymity works, what we store, your rights.</span>
        </Link>
        {user
          ? <Link to="/profile" className={tile}><span className="text-2xl" aria-hidden="true">⚙️</span><span className="font-semibold text-brand-900">{t('profile')}</span><span className="text-sm text-slate-600">Emergency contacts and SOS setup.</span></Link>
          : <Link to="/register" className={tile}><span className="text-2xl" aria-hidden="true">👤</span><span className="font-semibold text-brand-900">{t('register')}</span><span className="text-sm text-slate-600">Track all your reports and talk to investigators.</span></Link>}
      </div>
    </div>
  );
}
