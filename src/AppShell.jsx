import { useSportControl } from './state/useSportControl'

const navItems = [
  { key: 'matches', label: 'Матчи' },
  { key: 'tournaments', label: 'Турниры' },
  { key: 'teams', label: 'Команды' },
  { key: 'players', label: 'Игроки' },
  { key: 'sports', label: 'Виды спорта' },
]

export const AppShell = ({ children, activeRouteKey }) => {
  const { isDark, toggleTheme } = useSportControl()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>SportControl</h1>
        </div>

        <button
          className="button theme-toggle theme-toggle-float"
          type="button"
          onClick={toggleTheme}
          aria-pressed={isDark}
        >
          {isDark ? 'Светлая тема' : 'Тёмная тема'}
        </button>
      </header>

      <nav className="topnav" aria-label="Навигация">
        {navItems.map((item) => (
          <a
            key={item.key}
            href={`#/${item.key}`}
            className="topnav-link"
            style={
              activeRouteKey === item.key
                ? {
                    borderColor: 'var(--accent-border)',
                    background: 'var(--accent-soft)',
                  }
                : undefined
            }
            aria-current={activeRouteKey === item.key ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <main className="content">{children}</main>
    </div>
  )
}

