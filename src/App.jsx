import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const emptySport = { name: '' }
const emptyTeam = { name: '' }
const emptyPlayer = { name: '', teamId: '' }
const emptyTournament = { name: '', sportId: '' }
const emptyMatch = {
  name: '',
  location: '',
  date: '',
  tournamentId: '',
  homeTeamId: '',
  awayTeamId: '',
}
const emptyMatchFilter = {
  name: '',
  location: '',
  tournamentId: '',
  homeTeamName: '',
  awayTeamName: '',
  dateFrom: '',
  dateTo: '',
}

const toNumber = (value) => (value === '' || value == null ? null : Number(value))
const toDateTime = (value) => (value ? (value.length === 16 ? `${value}:00` : value) : null)
const toDateInput = (value) => (value ? value.slice(0, 16) : '')

const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const validation = payload?.validationErrors
      ? ` (${Object.entries(payload.validationErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ')})`
      : ''
    const message = payload?.message || payload?.error || response.statusText
    throw new Error(`${message}${validation}`)
  }

  return payload
}

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light'
  }
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const isDark = theme === 'dark'
  const [sports, setSports] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [matches, setMatches] = useState([])
  const [matchPage, setMatchPage] = useState({
    page: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
  })

  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [busy, setBusy] = useState(false)

  const [sportForm, setSportForm] = useState(emptySport)
  const [sportEditingId, setSportEditingId] = useState(null)

  const [teamForm, setTeamForm] = useState(emptyTeam)
  const [teamEditingId, setTeamEditingId] = useState(null)

  const [playerForm, setPlayerForm] = useState(emptyPlayer)
  const [playerEditingId, setPlayerEditingId] = useState(null)

  const [tournamentForm, setTournamentForm] = useState(emptyTournament)
  const [tournamentEditingId, setTournamentEditingId] = useState(null)

  const [matchForm, setMatchForm] = useState(emptyMatch)
  const [matchEditingId, setMatchEditingId] = useState(null)

  const [matchFilter, setMatchFilter] = useState(emptyMatchFilter)
  const [matchQueryType, setMatchQueryType] = useState('jpql')

  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  )
  const sportById = useMemo(
    () => new Map(sports.map((sport) => [sport.id, sport.name])),
    [sports],
  )

  const playersByTeam = useMemo(() => {
    const map = new Map()
    players.forEach((player) => {
      if (!player.teamId) {
        return
      }
      const existing = map.get(player.teamId) || []
      existing.push(player)
      map.set(player.teamId, existing)
    })
    return map
  }, [players])

  const tournamentsBySport = useMemo(() => {
    const map = new Map()
    tournaments.forEach((tournament) => {
      if (!tournament.sportId) {
        return
      }
      const existing = map.get(tournament.sportId) || []
      existing.push(tournament)
      map.set(tournament.sportId, existing)
    })
    return map
  }, [tournaments])

  const teamsByTournament = useMemo(() => {
    const map = new Map()
    matches.forEach((match) => {
      if (!match.tournamentId) {
        return
      }
      const existing = map.get(match.tournamentId) || new Set()
      if (match.homeTeamId) {
        existing.add(match.homeTeamId)
      }
      if (match.awayTeamId) {
        existing.add(match.awayTeamId)
      }
      map.set(match.tournamentId, existing)
    })
    return map
  }, [matches])

  const runTask = async (label, task) => {
    setBusy(true)
    setStatus({ type: 'info', message: label })
    try {
      await task()
      setStatus({ type: 'success', message: `${label} completed` })
      return true
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Request failed' })
      return false
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const loadSports = async () => {
    const data = await apiFetch('/sports')
    setSports(data || [])
  }

  const loadTeams = async () => {
    const data = await apiFetch('/teams')
    setTeams(data || [])
  }

  const loadPlayers = async () => {
    const data = await apiFetch('/players?page=0&size=200')
    setPlayers(data?.content || [])
  }

  const loadTournaments = async () => {
    const data = await apiFetch('/tournaments')
    setTournaments(data || [])
  }

  const loadMatches = async () => {
    const data = await apiFetch('/matches?page=0&size=50')
    setMatches(data?.content || [])
    setMatchPage({
      page: data?.number ?? 0,
      size: data?.size ?? 50,
      totalPages: data?.totalPages ?? 1,
      totalElements: data?.totalElements ?? (data?.content || []).length,
    })
  }

  const runMatchSearch = async (page = 0, filterOverride = null) => {
    const filter = filterOverride || matchFilter
    const params = new URLSearchParams({
      page: String(page),
      size: String(matchPage.size || 20),
      queryType: matchQueryType,
    })

    if (filter.name) params.set('name', filter.name)
    if (filter.location) params.set('location', filter.location)
    if (filter.tournamentId) params.set('tournamentId', filter.tournamentId)
    if (filter.homeTeamName) params.set('homeTeamName', filter.homeTeamName)
    if (filter.awayTeamName) params.set('awayTeamName', filter.awayTeamName)
    if (filter.dateFrom) params.set('dateFrom', toDateTime(filter.dateFrom))
    if (filter.dateTo) params.set('dateTo', toDateTime(filter.dateTo))

    const data = await apiFetch(`/matches/search?${params.toString()}`)
    setMatches(data?.content || [])
    setMatchPage({
      page: data?.number ?? page,
      size: data?.size ?? matchPage.size,
      totalPages: data?.totalPages ?? 1,
      totalElements: data?.totalElements ?? (data?.content || []).length,
    })
  }

  const refreshAll = async () => {
    await runTask('Refreshing data', async () => {
      const results = await Promise.allSettled([
        loadSports(),
        loadTeams(),
        loadPlayers(),
        loadTournaments(),
        loadMatches(),
      ])
      const failures = results.filter((result) => result.status === 'rejected')
      if (failures.length) {
        throw failures[0].reason
      }
    })
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    refreshAll()
  }, [])

  const handleSportSubmit = async (event) => {
    event.preventDefault()
    const payload = { name: sportForm.name.trim() }
    const label = sportEditingId ? 'Updating sport' : 'Creating sport'
    const ok = await runTask(label, async () => {
      if (sportEditingId) {
        await apiFetch(`/sports/${sportEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/sports', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      await loadSports()
    })
    if (ok) {
      setSportForm(emptySport)
      setSportEditingId(null)
    }
  }

  const handleSportDelete = async (sport) => {
    if (!window.confirm(`Delete sport "${sport.name}"?`)) {
      return
    }
    await runTask('Deleting sport', async () => {
      await apiFetch(`/sports/${sport.id}`, { method: 'DELETE' })
      await loadSports()
      await loadTournaments()
    })
  }

  const handleTeamSubmit = async (event) => {
    event.preventDefault()
    const payload = { name: teamForm.name.trim() }
    const label = teamEditingId ? 'Updating team' : 'Creating team'
    const ok = await runTask(label, async () => {
      if (teamEditingId) {
        await apiFetch(`/teams/${teamEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/teams', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      await loadTeams()
    })
    if (ok) {
      setTeamForm(emptyTeam)
      setTeamEditingId(null)
    }
  }

  const handleTeamDelete = async (team) => {
    if (!window.confirm(`Delete team "${team.name}"?`)) {
      return
    }
    await runTask('Deleting team', async () => {
      await apiFetch(`/teams/${team.id}`, { method: 'DELETE' })
      await loadTeams()
      await loadPlayers()
      await loadMatches()
    })
  }

  const handlePlayerSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      name: playerForm.name.trim(),
      teamId: toNumber(playerForm.teamId),
    }
    const label = playerEditingId ? 'Updating player' : 'Creating player'
    const ok = await runTask(label, async () => {
      if (playerEditingId) {
        await apiFetch(`/players/${playerEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/players', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      await loadPlayers()
    })
    if (ok) {
      setPlayerForm(emptyPlayer)
      setPlayerEditingId(null)
    }
  }

  const handlePlayerDelete = async (player) => {
    if (!window.confirm(`Delete player "${player.name}"?`)) {
      return
    }
    await runTask('Deleting player', async () => {
      await apiFetch(`/players/${player.id}`, { method: 'DELETE' })
      await loadPlayers()
    })
  }

  const handleTournamentSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      name: tournamentForm.name.trim(),
      sportId: toNumber(tournamentForm.sportId),
    }
    const label = tournamentEditingId ? 'Updating tournament' : 'Creating tournament'
    const ok = await runTask(label, async () => {
      if (tournamentEditingId) {
        await apiFetch(`/tournaments/${tournamentEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/tournaments', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      await loadTournaments()
    })
    if (ok) {
      setTournamentForm(emptyTournament)
      setTournamentEditingId(null)
    }
  }

  const handleTournamentDelete = async (tournament) => {
    if (!window.confirm(`Delete tournament "${tournament.name}"?`)) {
      return
    }
    await runTask('Deleting tournament', async () => {
      await apiFetch(`/tournaments/${tournament.id}`, { method: 'DELETE' })
      await loadTournaments()
      await loadMatches()
    })
  }

  const handleMatchSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      name: matchForm.name.trim(),
      location: matchForm.location.trim(),
      date: toDateTime(matchForm.date),
      tournamentId: toNumber(matchForm.tournamentId),
      homeTeamId: toNumber(matchForm.homeTeamId),
      awayTeamId: toNumber(matchForm.awayTeamId),
    }
    const label = matchEditingId ? 'Updating match' : 'Creating match'
    const ok = await runTask(label, async () => {
      if (matchEditingId) {
        await apiFetch(`/matches/${matchEditingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/matches', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      await runMatchSearch(matchPage.page)
    })
    if (ok) {
      setMatchForm(emptyMatch)
      setMatchEditingId(null)
    }
  }

  const handleMatchDelete = async (match) => {
    if (!window.confirm(`Delete match "${match.name}"?`)) {
      return
    }
    await runTask('Deleting match', async () => {
      await apiFetch(`/matches/${match.id}`, { method: 'DELETE' })
      await runMatchSearch(matchPage.page)
    })
  }

  const handleMatchSearch = async (event) => {
    event.preventDefault()
    await runTask('Searching matches', async () => {
      await runMatchSearch(0)
    })
  }

  const handleMatchReset = async () => {
    setMatchFilter(emptyMatchFilter)
    await runTask('Resetting match filters', async () => {
      await runMatchSearch(0, emptyMatchFilter)
    })
  }

  const stats = [
    { label: 'Sports', value: sports.length },
    { label: 'Tournaments', value: tournaments.length },
    { label: 'Teams', value: teams.length },
    { label: 'Players', value: players.length },
    { label: 'Matches', value: matches.length },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <p className="eyebrow">SportControl</p>
          <h1>Operations dashboard</h1>
          <p className="lede">
            Manage sports, tournaments, teams, players, and matches in one place.
            Keep relationships visible while you work.
          </p>
          <div className="action-row">
            <button className="button primary" onClick={refreshAll} disabled={busy}>
              Refresh data
            </button>
            <button
              className="button ghost"
              onClick={() => runMatchSearch(0)}
              disabled={busy}
            >
              Refresh matches
            </button>
            <button
              className="button theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
            >
              {isDark ? 'Light theme' : 'Dark theme'}
            </button>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-header">
            <span>Live summary</span>
            <span className="chip">{new Date().toLocaleDateString()}</span>
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
            <span className="muted">Matches page</span>
            <span className="chip">
              {matchPage.page + 1} / {matchPage.totalPages || 1}
            </span>
          </div>
        </div>
      </header>

      {status.message ? (
        <div className={`status ${status.type}`}>{status.message}</div>
      ) : null}

      <div className="layout">
        <aside className="side-panel">
          <div className="side-card">
            <h3>Navigation</h3>
            <nav className="section-nav">
              <a href="#sports">Sports</a>
              <a href="#tournaments">Tournaments</a>
              <a href="#teams">Teams</a>
              <a href="#players">Players</a>
              <a href="#matches">Matches</a>
            </nav>
          </div>
          <div className="side-card">
            <h3>Data source</h3>
            <div className="pill-row">
              <span className="pill">API: {API_BASE}</span>
              <span className="pill">Mode: SPA client</span>
            </div>
          </div>
          <div className="side-card">
            <h3>Relationships</h3>
            <ul className="relationship-list">
              <li>One-to-many: sports to tournaments</li>
              <li>One-to-many: teams to players</li>
              <li>Many-to-many: tournaments to teams (from matches)</li>
            </ul>
          </div>
        </aside>

        <main className="content">
          <section id="sports" className="panel">
            <div className="panel-head">
              <div>
                <h2>Sports</h2>
                <p className="muted">One-to-many relation between sports and tournaments.</p>
              </div>
            </div>
            <div className="panel-grid">
              <div className="panel-card">
                <h3>Sports list</h3>
                <ul className="item-list">
                  {sports.map((sport) => (
                    <li key={sport.id} className="item">
                      <div className="item-body">
                        <span className="item-title">{sport.name}</span>
                        <div className="item-meta">
                          {(tournamentsBySport.get(sport.id) || []).map((t) => (
                            <span key={t.id} className="tag">
                              {t.name}
                            </span>
                          ))}
                          {!tournamentsBySport.get(sport.id)?.length && (
                            <span className="muted">No tournaments yet</span>
                          )}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          className="button tiny"
                          type="button"
                          onClick={() => {
                            setSportEditingId(sport.id)
                            setSportForm({ name: sport.name || '' })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button tiny danger"
                          type="button"
                          onClick={() => handleSportDelete(sport)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel-card">
                <h3>{sportEditingId ? 'Edit sport' : 'Create sport'}</h3>
                <form className="form-grid" onSubmit={handleSportSubmit}>
                  <label>
                    Name
                    <input
                      value={sportForm.name}
                      onChange={(event) =>
                        setSportForm({ ...sportForm, name: event.target.value })
                      }
                      required
                      minLength={2}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="button primary" type="submit" disabled={busy}>
                      {sportEditingId ? 'Save sport' : 'Add sport'}
                    </button>
                    {sportEditingId ? (
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => {
                          setSportEditingId(null)
                          setSportForm(emptySport)
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section id="tournaments" className="panel">
            <div className="panel-head">
              <div>
                <h2>Tournaments</h2>
                <p className="muted">
                  Many-to-many relation between tournaments and teams (from matches).
                </p>
              </div>
            </div>
            <div className="panel-grid">
              <div className="panel-card">
                <h3>Tournament list</h3>
                <ul className="item-list">
                  {tournaments.map((tournament) => (
                    <li key={tournament.id} className="item">
                      <div className="item-body">
                        <span className="item-title">{tournament.name}</span>
                        <div className="item-meta">
                          {sportById.get(tournament.sportId) || 'Unknown sport'}
                        </div>
                        <div className="item-meta">
                          {[...(teamsByTournament.get(tournament.id) || [])].map(
                            (teamId) => (
                              <span key={teamId} className="tag">
                                {teamById.get(teamId) || `Team #${teamId}`}
                              </span>
                            ),
                          )}
                          {!teamsByTournament.get(tournament.id)?.size && (
                            <span className="muted">No teams yet</span>
                          )}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          className="button tiny"
                          type="button"
                          onClick={() => {
                            setTournamentEditingId(tournament.id)
                            setTournamentForm({
                              name: tournament.name || '',
                              sportId: tournament.sportId
                                ? String(tournament.sportId)
                                : '',
                            })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button tiny danger"
                          type="button"
                          onClick={() => handleTournamentDelete(tournament)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel-card">
                <h3>{tournamentEditingId ? 'Edit tournament' : 'Create tournament'}</h3>
                <form className="form-grid" onSubmit={handleTournamentSubmit}>
                  <label>
                    Name
                    <input
                      value={tournamentForm.name}
                      onChange={(event) =>
                        setTournamentForm({
                          ...tournamentForm,
                          name: event.target.value,
                        })
                      }
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Sport
                    <select
                      value={tournamentForm.sportId}
                      onChange={(event) =>
                        setTournamentForm({
                          ...tournamentForm,
                          sportId: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select a sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions">
                    <button className="button primary" type="submit" disabled={busy}>
                      {tournamentEditingId ? 'Save tournament' : 'Add tournament'}
                    </button>
                    {tournamentEditingId ? (
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => {
                          setTournamentEditingId(null)
                          setTournamentForm(emptyTournament)
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section id="teams" className="panel">
            <div className="panel-head">
              <div>
                <h2>Teams</h2>
                <p className="muted">One-to-many relation between teams and players.</p>
              </div>
            </div>
            <div className="panel-grid">
              <div className="panel-card">
                <h3>Teams list</h3>
                <ul className="item-list">
                  {teams.map((team) => (
                    <li key={team.id} className="item">
                      <div className="item-body">
                        <span className="item-title">{team.name}</span>
                        <div className="item-meta">
                          {(playersByTeam.get(team.id) || []).map((player) => (
                            <span key={player.id} className="tag">
                              {player.name}
                            </span>
                          ))}
                          {!playersByTeam.get(team.id)?.length && (
                            <span className="muted">No players yet</span>
                          )}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          className="button tiny"
                          type="button"
                          onClick={() => {
                            setTeamEditingId(team.id)
                            setTeamForm({ name: team.name || '' })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button tiny danger"
                          type="button"
                          onClick={() => handleTeamDelete(team)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel-card">
                <h3>{teamEditingId ? 'Edit team' : 'Create team'}</h3>
                <form className="form-grid" onSubmit={handleTeamSubmit}>
                  <label>
                    Name
                    <input
                      value={teamForm.name}
                      onChange={(event) =>
                        setTeamForm({ ...teamForm, name: event.target.value })
                      }
                      required
                      minLength={2}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="button primary" type="submit" disabled={busy}>
                      {teamEditingId ? 'Save team' : 'Add team'}
                    </button>
                    {teamEditingId ? (
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => {
                          setTeamEditingId(null)
                          setTeamForm(emptyTeam)
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section id="players" className="panel">
            <div className="panel-head">
              <div>
                <h2>Players</h2>
                <p className="muted">Assign players to teams.</p>
              </div>
            </div>
            <div className="panel-grid">
              <div className="panel-card">
                <h3>Players list</h3>
                <ul className="item-list">
                  {players.map((player) => (
                    <li key={player.id} className="item">
                      <div className="item-body">
                        <span className="item-title">{player.name}</span>
                        <div className="item-meta">
                          Team: {teamById.get(player.teamId) || 'No team'}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          className="button tiny"
                          type="button"
                          onClick={() => {
                            setPlayerEditingId(player.id)
                            setPlayerForm({
                              name: player.name || '',
                              teamId: player.teamId ? String(player.teamId) : '',
                            })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button tiny danger"
                          type="button"
                          onClick={() => handlePlayerDelete(player)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel-card">
                <h3>{playerEditingId ? 'Edit player' : 'Create player'}</h3>
                <form className="form-grid" onSubmit={handlePlayerSubmit}>
                  <label>
                    Name
                    <input
                      value={playerForm.name}
                      onChange={(event) =>
                        setPlayerForm({ ...playerForm, name: event.target.value })
                      }
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Team
                    <select
                      value={playerForm.teamId}
                      onChange={(event) =>
                        setPlayerForm({ ...playerForm, teamId: event.target.value })
                      }
                      required
                    >
                      <option value="">Select a team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions">
                    <button className="button primary" type="submit" disabled={busy}>
                      {playerEditingId ? 'Save player' : 'Add player'}
                    </button>
                    {playerEditingId ? (
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => {
                          setPlayerEditingId(null)
                          setPlayerForm(emptyPlayer)
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section id="matches" className="panel">
            <div className="panel-head">
              <div>
                <h2>Matches</h2>
                <p className="muted">Filter by name, teams, dates, and tournament.</p>
              </div>
              <div className="panel-meta">
                <span className="chip">Total: {matchPage.totalElements}</span>
                <div className="pager">
                  <button
                    className="button tiny"
                    type="button"
                    onClick={() => runMatchSearch(matchPage.page - 1)}
                    disabled={busy || matchPage.page <= 0}
                  >
                    Prev
                  </button>
                  <button
                    className="button tiny"
                    type="button"
                    onClick={() => runMatchSearch(matchPage.page + 1)}
                    disabled={
                      busy ||
                      matchPage.page + 1 >= (matchPage.totalPages || 1)
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            <div className="panel-grid triple">
              <div className="panel-card">
                <h3>Filter matches</h3>
                <form className="form-grid" onSubmit={handleMatchSearch}>
                  <label>
                    Name
                    <input
                      value={matchFilter.name}
                      onChange={(event) =>
                        setMatchFilter({ ...matchFilter, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Location
                    <input
                      value={matchFilter.location}
                      onChange={(event) =>
                        setMatchFilter({
                          ...matchFilter,
                          location: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Tournament
                    <select
                      value={matchFilter.tournamentId}
                      onChange={(event) =>
                        setMatchFilter({
                          ...matchFilter,
                          tournamentId: event.target.value,
                        })
                      }
                    >
                      <option value="">All tournaments</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Home team name
                    <input
                      value={matchFilter.homeTeamName}
                      onChange={(event) =>
                        setMatchFilter({
                          ...matchFilter,
                          homeTeamName: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Away team name
                    <input
                      value={matchFilter.awayTeamName}
                      onChange={(event) =>
                        setMatchFilter({
                          ...matchFilter,
                          awayTeamName: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Date from
                    <input
                      type="datetime-local"
                      value={matchFilter.dateFrom}
                      onChange={(event) =>
                        setMatchFilter({
                          ...matchFilter,
                          dateFrom: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Date to
                    <input
                      type="datetime-local"
                      value={matchFilter.dateTo}
                      onChange={(event) =>
                        setMatchFilter({
                          ...matchFilter,
                          dateTo: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Query type
                    <select
                      value={matchQueryType}
                      onChange={(event) => setMatchQueryType(event.target.value)}
                    >
                      <option value="jpql">JPQL</option>
                      <option value="native">Native</option>
                    </select>
                  </label>
                  <div className="form-actions">
                    <button className="button primary" type="submit" disabled={busy}>
                      Apply filter
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={handleMatchReset}
                      disabled={busy}
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
              <div className="panel-card">
                <h3>Match list</h3>
                <ul className="item-list">
                  {matches.map((match) => (
                    <li key={match.id} className="item">
                      <div className="item-body">
                        <span className="item-title">{match.name}</span>
                        <div className="item-meta">
                          {match.location || 'Location TBD'} |{' '}
                          {match.tournamentName || 'No tournament'}
                        </div>
                        <div className="item-meta">
                          {match.homeTeamName || 'Home team'} vs{' '}
                          {match.awayTeamName || 'Away team'}
                        </div>
                        <div className="item-meta">
                          {match.date ? new Date(match.date).toLocaleString() : 'Date not set'}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          className="button tiny"
                          type="button"
                          onClick={() => {
                            setMatchEditingId(match.id)
                            setMatchForm({
                              name: match.name || '',
                              location: match.location || '',
                              date: toDateInput(match.date),
                              tournamentId: match.tournamentId
                                ? String(match.tournamentId)
                                : '',
                              homeTeamId: match.homeTeamId
                                ? String(match.homeTeamId)
                                : '',
                              awayTeamId: match.awayTeamId
                                ? String(match.awayTeamId)
                                : '',
                            })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="button tiny danger"
                          type="button"
                          onClick={() => handleMatchDelete(match)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel-card">
                <h3>{matchEditingId ? 'Edit match' : 'Create match'}</h3>
                <form className="form-grid" onSubmit={handleMatchSubmit}>
                  <label>
                    Name
                    <input
                      value={matchForm.name}
                      onChange={(event) =>
                        setMatchForm({ ...matchForm, name: event.target.value })
                      }
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Location
                    <input
                      value={matchForm.location}
                      onChange={(event) =>
                        setMatchForm({
                          ...matchForm,
                          location: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    Date and time
                    <input
                      type="datetime-local"
                      value={matchForm.date}
                      onChange={(event) =>
                        setMatchForm({ ...matchForm, date: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    Tournament
                    <select
                      value={matchForm.tournamentId}
                      onChange={(event) =>
                        setMatchForm({
                          ...matchForm,
                          tournamentId: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select a tournament</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Home team
                    <select
                      value={matchForm.homeTeamId}
                      onChange={(event) =>
                        setMatchForm({
                          ...matchForm,
                          homeTeamId: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select home team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Away team
                    <select
                      value={matchForm.awayTeamId}
                      onChange={(event) =>
                        setMatchForm({
                          ...matchForm,
                          awayTeamId: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select away team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions">
                    <button className="button primary" type="submit" disabled={busy}>
                      {matchEditingId ? 'Save match' : 'Add match'}
                    </button>
                    {matchEditingId ? (
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => {
                          setMatchEditingId(null)
                          setMatchForm(emptyMatch)
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
