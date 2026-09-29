import type { ReactNode } from 'react'
import logo from '../assets/logo.svg'

type NavView = 'accueil' | 'besoins' | 'historique'

type AppShellProps = {
  activeView: string
  children: ReactNode
  onNavigate: (view: NavView) => void
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const navItems: { view: NavView; label: string; icon: ReactNode }[] = [
  {
    view: 'accueil',
    label: 'Accueil',
    icon: <svg {...iconProps}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h5v-6h4v6h5V9.5" /></svg>,
  },
  {
    view: 'besoins',
    label: 'À commander',
    icon: <svg {...iconProps}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9zM9 11h6M9 15h4" /></svg>,
  },
  {
    view: 'historique',
    label: 'Historique',
    icon: <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  },
]

// Le controle d'un coffret se fait depuis l'accueil : il reste rattache a "Accueil".
const navViewFor = (view: string) => (view === 'coffret' ? 'accueil' : view)

function AppShell({ activeView, children, onNavigate }: AppShellProps) {
  const currentView = navViewFor(activeView)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={logo} alt="" />
          <div className="brand-text">
            <strong>PigeControl</strong>
            <span>Contrôle des piges</span>
          </div>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              className={currentView === item.view ? 'is-active' : ''}
              aria-current={currentView === item.view ? 'page' : undefined}
              onClick={() => onNavigate(item.view)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  )
}

export default AppShell
