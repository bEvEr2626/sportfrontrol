// SportControlProvider.jsx (полный файл)
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client'
import { SportControlContext } from './SportControlContext'

const emptySport = { name: '' }
const emptyTeam = { name: '' }
const emptyPlayer = { name: '', teamId: '' }
const emptyTournament = { name: '', sportId: '', teamIds: [] }
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
  homeTeamId: '',      // ID выбранной команды (для UI)
  homeTeamName: '',    // название (для API)
  awayTeamId: '',
  awayTeamName: '',
  dateFrom: '',
  dateTo: '',
}

const toNumber = (value) => (value === '' || value == null ? null : Number(value))
const toDateTime = (value) => (value ? (value.length === 16 ? `${value}:00` : value) : null)
const toDateInput = (value) => (value ? value.slice(0, 16) : '')
const normalizeTeamIds = (teamIds) => {
  if (!Array.isArray(teamIds)) return []
  return teamIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))
}
const getTournamentTeamIds = (tournament) => {
  const rawTeamIds = Array.isArray(tournament?.teamIds)
    ? tournament.teamIds
    : Array.isArray(tournament?.teams)
      ? tournament.teams.map((team) => (typeof team === 'object' ? team.id : team))
      : []
  return normalizeTeamIds(rawTeamIds)
}

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const SportControlProvider = ({ children }) => {
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

  const [matchFilter, setMatchFilter] = useState(emptyMatchFilter)

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams])
  const sportById = useMemo(() => new Map(sports.map((sport) => [sport.id, sport.name])), [sports])

  const playersByTeam = useMemo(() => {
    const map = new Map()
    players.forEach((player) => {
      if (!player.teamId) return
      const existing = map.get(player.teamId) || []
      existing.push(player)
      map.set(player.teamId, existing)
    })
    return map
  }, [players])

  const tournamentsBySport = useMemo(() => {
    const map = new Map()
    tournaments.forEach((tournament) => {
      if (!tournament.sportId) return
      const existing = map.get(tournament.sportId) || []
      existing.push(tournament)
      map.set(tournament.sportId, existing)
    })
    return map
  }, [tournaments])

  const teamsByTournament = useMemo(() => {
    const map = new Map()

    tournaments.forEach((tournament) => {
      const rawTeamIds = Array.isArray(tournament.teamIds)
        ? tournament.teamIds
        : Array.isArray(tournament.teams)
          ? tournament.teams.map((team) => (typeof team === 'object' ? team.id : team))
          : []

      if (!rawTeamIds.length) return
      const existing = map.get(tournament.id) || new Set()
      rawTeamIds.forEach((teamId) => {
        if (teamId) existing.add(teamId)
      })
      map.set(tournament.id, existing)
    })

    matches.forEach((match) => {
      if (!match.tournamentId) return
      const existing = map.get(match.tournamentId) || new Set()
      if (match.homeTeamId) existing.add(match.homeTeamId)
      if (match.awayTeamId) existing.add(match.awayTeamId)
      map.set(match.tournamentId, existing)
    })

    return map
  }, [matches, tournaments])

  const runTask = async (label, task) => {
    setBusy(true)
    setStatus({ type: 'info', message: label })
    try {
      await task()
      setStatus({ type: 'success', message: `${label} выполнено` })
      return true
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Запрос не выполнен' })
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

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

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
    await runTask('Обновление данных', async () => {
      const results = await Promise.allSettled([loadSports(), loadTeams(), loadPlayers(), loadTournaments(), loadMatches()])
      const failures = results.filter((result) => result.status === 'rejected')
      if (failures.length) throw failures[0].reason
    })
  }

  const refreshMatches = async () => {
    await runTask('Обновление матчей', async () => {
      await runMatchSearch(0)
    })
  }

  const setMatchFilterAndSearch = async (nextFilter) => {
    setMatchFilter(nextFilter)
    await runTask('Поиск матчей', async () => {
      await runMatchSearch(0, nextFilter)
    })
  }

  const resetMatchFiltersAndSearch = async () => {
    const next = { ...emptyMatchFilter }
    setMatchFilter(next)
    await runTask('Сброс фильтров матчей', async () => {
      await runMatchSearch(0, next)
    })
  }

  // CRUD: Sports
  const createOrUpdateSport = async (idOrNull, payload) => {
    await runTask(idOrNull ? 'Обновление вида спорта' : 'Создание вида спорта', async () => {
      if (idOrNull) {
        await apiFetch(`/sports/${idOrNull}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/sports', { method: 'POST', body: JSON.stringify(payload) })
      }
      await loadSports()
    })
  }

  const deleteSport = async (sport) => {
    await runTask('Удаление вида спорта', async () => {
      await apiFetch(`/sports/${sport.id}`, { method: 'DELETE' })
      await loadSports()
      await loadTournaments()
    })
  }

  // CRUD: Teams
  const createOrUpdateTeam = async (idOrNull, payload) => {
    await runTask(idOrNull ? 'Обновление команды' : 'Создание команды', async () => {
      if (idOrNull) {
        await apiFetch(`/teams/${idOrNull}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/teams', { method: 'POST', body: JSON.stringify(payload) })
      }
      await loadTeams()
    })
  }

  const deleteTeam = async (team) => {
    await runTask('Удаление команды', async () => {
      await apiFetch(`/teams/${team.id}`, { method: 'DELETE' })
      await loadTeams()
      await loadPlayers()
      await loadMatches()
    })
  }

  // CRUD: Players
  const createOrUpdatePlayer = async (idOrNull, payload) => {
    await runTask(idOrNull ? 'Обновление игрока' : 'Создание игрока', async () => {
      if (idOrNull) {
        await apiFetch(`/players/${idOrNull}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/players', { method: 'POST', body: JSON.stringify(payload) })
      }
      await loadPlayers()
    })
  }

  const deletePlayer = async (player) => {
    await runTask('Удаление игрока', async () => {
      await apiFetch(`/players/${player.id}`, { method: 'DELETE' })
      await loadPlayers()
    })
  }

  const removePlayerFromTeam = async (playerId) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return

    await runTask('Удаление игрока из команды', async () => {
      await apiFetch(`/players/${playerId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: player.name, teamId: null }),
      })
      await loadPlayers()
    })
  }

  // *** Новый метод: добавление нескольких игроков в команду ***
  const addPlayersToTeam = async (teamId, playerIds) => {
    if (!teamId || !playerIds || !playerIds.length) return
    await runTask('Добавление игроков в команду', async () => {
      const updatePromises = playerIds.map((playerId) => {
        const player = players.find((p) => p.id === playerId)
        if (!player) return Promise.resolve()
        return apiFetch(`/players/${playerId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: player.name, teamId }),
        })
      })
      await Promise.all(updatePromises)
      await loadPlayers()
    })
  }

  // CRUD: Tournaments
  const createOrUpdateTournament = async (idOrNull, payload) => {
    await runTask(idOrNull ? 'Обновление турнира' : 'Создание турнира', async () => {
      const { teamIds, ...tournamentPayload } = payload || {}
      const normalizedTeamIds = normalizeTeamIds(teamIds)
      const existingTeamIds = idOrNull ? getTournamentTeamIds(tournaments.find((t) => t.id === idOrNull)) : []

      let response = null
      if (idOrNull) {
        response = await apiFetch(`/tournaments/${idOrNull}`, { method: 'PUT', body: JSON.stringify(tournamentPayload) })
      } else {
        response = await apiFetch('/tournaments', { method: 'POST', body: JSON.stringify(tournamentPayload) })
      }

      const tournamentId = idOrNull ?? response?.id
      if (tournamentId) {
        const existingSet = new Set(existingTeamIds)
        const nextSet = new Set(normalizedTeamIds)
        const teamIdsToAdd = normalizedTeamIds.filter((teamId) => !existingSet.has(teamId))
        const teamIdsToRemove = existingTeamIds.filter((teamId) => !nextSet.has(teamId))

        if (teamIdsToAdd.length) {
          await apiFetch(`/tournaments/${tournamentId}/teams`, {
            method: 'POST',
            body: JSON.stringify({ teamIds: teamIdsToAdd }),
          })
        }

        if (teamIdsToRemove.length) {
          await apiFetch(`/tournaments/${tournamentId}/teams`, {
            method: 'DELETE',
            body: JSON.stringify({ teamIds: teamIdsToRemove }),
          })
        }
      }

      await loadTournaments()
    })
  }

  const deleteTournament = async (tournament) => {
    await runTask('Удаление турнира', async () => {
      await apiFetch(`/tournaments/${tournament.id}`, { method: 'DELETE' })
      await loadTournaments()
      await loadMatches()
    })
  }

  const removeTeamsFromTournament = async (tournamentId, teamIds) => {
    const normalizedTeamIds = normalizeTeamIds(teamIds)
    if (!tournamentId || !normalizedTeamIds.length) return
    await runTask('Удаление команды из турнира', async () => {
      await apiFetch(`/tournaments/${tournamentId}/teams`, {
        method: 'DELETE',
        body: JSON.stringify({ teamIds: normalizedTeamIds }),
      })
      await loadTournaments()
    })
  }

  // CRUD: Matches
  const createOrUpdateMatch = async (idOrNull, payload) => {
    await runTask(idOrNull ? 'Обновление матча' : 'Создание матча', async () => {
      if (idOrNull) {
        await apiFetch(`/matches/${idOrNull}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/matches', { method: 'POST', body: JSON.stringify(payload) })
      }
      await runMatchSearch(matchPage.page)
    })
  }

  const deleteMatch = async (match) => {
    await runTask('Удаление матча', async () => {
      await apiFetch(`/matches/${match.id}`, { method: 'DELETE' })
      await runMatchSearch(matchPage.page)
    })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAll()
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = [
    { label: 'Матчи', value: matches.length },
    { label: 'Турниры', value: tournaments.length },
    { label: 'Команды', value: teams.length },
    { label: 'Игроки', value: players.length },
    { label: 'Виды спорта', value: sports.length },
  ]

  const apiHelpers = {
    emptySport,
    emptyTeam,
    emptyPlayer,
    emptyTournament,
    emptyMatch,
    emptyMatchFilter,
    toNumber,
    toDateInput,
  }

  const matchUtils = {
    toDateTime,
    toDateInput,
  }

  return (
    <SportControlContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,

        status,
        busy,

        sports,
        teams,
        players,
        tournaments,
        matches,
        matchPage,

        matchFilter,
        setMatchFilter,

        playersByTeam,
        tournamentsBySport,
        teamsByTournament,
        teamById,
        sportById,

        stats,

        refreshAll,
        refreshMatches,

        setMatchFilterAndSearch,
        resetMatchFiltersAndSearch,

        createOrUpdateSport,
        deleteSport,

        createOrUpdateTeam,
        deleteTeam,
        removePlayerFromTeam,
        addPlayersToTeam,   // новый

        createOrUpdatePlayer,
        deletePlayer,

        createOrUpdateTournament,
        deleteTournament,
        removeTeamsFromTournament,

        createOrUpdateMatch,
        deleteMatch,

        apiHelpers,
        matchUtils,
      }}
    >
      {children}
    </SportControlContext.Provider>
  )
}