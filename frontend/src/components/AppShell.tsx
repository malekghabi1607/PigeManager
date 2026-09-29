import type { ReactNode } from 'react'
import type { Utilisateur } from '../types/api'
import FullscreenButton from './FullscreenButton'

type AppShellProps = {
  activeView: string
  children: ReactNode
  utilisateur: Utilisateur
  onNavigate: (view: 'accueil' | 'coffret' | 'besoins' | 'historique') => void
}

const navItems = [
  { view: 'accueil', label: 'Accueil', icon: '⌂' },
  { view: 'coffret', label: 'Controle', icon: '↗' },
  { view: 'besoins', label: 'Besoin', icon: '▣' },
  { view: 'historique', label: 'Historique', icon: '◷' },
] as const

function AppShell({ activeView, children, utilisateur, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">⬢</span>
          <strong>PigeControl</strong>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              className={activeView === item.view ? 'is-active' : ''}
              onClick={() => onNavigate(item.view)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="operator-card">
            <span>Controleur</span>
            <strong>{utilisateur.nom}</strong>
          </div>
          <FullscreenButton />
        </div>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  )
}

export default AppShell
