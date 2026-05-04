import { useSportControl } from './state/useSportControl'

const navItems = [
  { key: 'sports', label: 'Виды спорта' },
  { key: 'tournaments', label: 'Турниры' },
  { key: 'teams', label: 'Команды' },
  { key: 'players', label: 'Игроки' },
  { key: 'matches', label: 'Матчи' },
]

export const AppShell = ({ children, activeRouteKey }) => {
  const {
    status,
    busy,
    isDark,
    toggleTheme,
    refreshAll,
    refreshMatches,
    stats,
    matchPage,
  } = useSportControl()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <p className="eyebrow">SportControl</p>
          <h1>Панель управления</h1>
          <p className="lede">Управляйте видами спорта, турнирами, командами, игроками и матчами в одном месте.</p>

          <div className="action-row">
            <button className="button primary" onClick={refreshAll} disabled={busy}>
              Обновить данные
            </button>
            <button className="button ghost" onClick={refreshMatches} disabled={busy}>
              Обновить матчи
            </button>
            <button
              className="button theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
            >
              {isDark ? 'Светлая тема' : 'Тёмная тема'}
            </button>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-header">
            <span>Сводка</span>
            <span className="chip">{new Date().toLocaleDateString('ru-RU')}</span>
          </div>

          <div className="summary-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="summary-stat">
                <span className="summary-label">{stat.label}</span>
                <span className="summary-value">{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="summary-footer">
            <span className="muted">Страница матчей</span>
            <span className="chip">
              {matchPage.page + 1} / {matchPage.totalPages || 1}
            </span>
          </div>
        </div>
      </header>

      {status.message ? <div className={`status ${status.type}`}>{status.message}</div> : null}

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

