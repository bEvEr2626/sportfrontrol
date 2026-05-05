import { useMemo, useState } from 'react'
import './App.css'
import { useHashRoute } from './router/useHashRoute'
import { SportControlProvider } from './state/SportControlProvider'
import { useSportControl } from './state/useSportControl'
import { AppShell } from './AppShell'
import { Modal } from './components/ui/Modal'

const useConfirmDialog = (busy) => {
  const [dialog, setDialog] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Удалить',
    onConfirm: null,
  })

  const requestConfirm = ({ title, description, confirmLabel = 'Удалить', onConfirm }) => {
    setDialog({ open: true, title, description, confirmLabel, onConfirm })
  }

  const closeDialog = () => setDialog((prev) => ({ ...prev, open: false }))

  const handleConfirm = async () => {
    const action = dialog.onConfirm
    closeDialog()
    if (action) {
      await action()
    }
  }

  const dialogNode = (
    <Modal
      open={dialog.open}
      title={dialog.title}
      description={dialog.description}
      busy={busy}
      primaryAction={{
        label: dialog.confirmLabel,
        onClick: handleConfirm,
        disabled: busy,
        variant: 'danger',
      }}
      secondaryAction={{
        label: 'Отмена',
        onClick: closeDialog,
        disabled: busy,
        variant: 'ghost',
      }}
      onClose={closeDialog}
    >
      <p className="muted">Действие нельзя отменить.</p>
    </Modal>
  )

  return { requestConfirm, dialogNode }
}

const SportsPage = () => {
  const {
    sports,
    tournamentsBySport,
    apiHelpers,
    createOrUpdateSport,
    deleteSport,
    busy,
  } = useSportControl()

  const [sportForm, setSportForm] = useState(apiHelpers.emptySport)
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const isEdit = Boolean(editingId)
  const { requestConfirm, dialogNode } = useConfirmDialog(busy)

  const confirmDelete = (sport) => {
    const label = sport?.name ? `вид спорта «${sport.name}»` : 'вид спорта'
    requestConfirm({
      title: `Удалить ${label}?`,
      description: 'Данные будут удалены без возможности восстановления.',
      onConfirm: () => deleteSport(sport),
    })
  }

  const openCreate = () => {
    setEditingId(null)
    setSportForm(apiHelpers.emptySport)
    setModalOpen(true)
  }

  const openEdit = (sport) => {
    setEditingId(sport.id)
    setSportForm({ name: sport.name || '' })
    setModalOpen(true)
  }

  const onSubmit = async () => {
    setModalBusy(true)
    try {
      await createOrUpdateSport(editingId, { name: sportForm.name.trim() })
      setModalOpen(false)
    } finally {
      setModalBusy(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Виды спорта</h2>
        </div>
        <div className="panel-meta">
          <button className="button primary" type="button" onClick={openCreate} disabled={busy}>
            Создать вид спорта
          </button>
        </div>
      </div>

      <div className="panel-grid single">
        <div className="panel-card list-card">
          <h3>Список видов спорта</h3>
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
                    {!tournamentsBySport.get(sport.id)?.length ? (
                      <span className="muted">Пока нет турниров</span>
                    ) : null}
                  </div>
                </div>
                <div className="item-actions">
                  <button className="button tiny" type="button" onClick={() => openEdit(sport)} disabled={busy}>
                    Редактировать
                  </button>
                  <button
                    className="button tiny danger"
                    type="button"
                    onClick={() => confirmDelete(sport)}
                    disabled={busy}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
            {!sports.length ? (
              <li className="item" style={{ gridTemplateColumns: '1fr' }}>
                <span className="muted">Пока нет видов спорта. Создайте первый.</span>
              </li>
            ) : null}
          </ul>
        </div>

      </div>

      <Modal
        open={modalOpen}
        title={isEdit ? 'Редактировать вид спорта' : 'Создать вид спорта'}
        description="Введите название и сохраните."
        busy={modalBusy}
        primaryAction={{
          label: isEdit ? 'Сохранить' : 'Создать',
          disabled: modalBusy || busy,
          onClick: onSubmit,
        }}
        secondaryAction={{
          label: 'Отмена',
          disabled: modalBusy || busy,
          onClick: () => setModalOpen(false),
        }}
        onClose={() => setModalOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <label>
            Название
            <input
              value={sportForm.name}
              onChange={(event) => setSportForm({ ...sportForm, name: event.target.value })}
              required
              minLength={2}
              autoFocus
            />
          </label>
        </form>
      </Modal>

      {dialogNode}
    </section>
  )
}

const TournamentsPage = () => {
  const {
    tournaments,
    sports,
    teams,
    teamsByTournament,
    teamById,
    sportById,
    apiHelpers,
    createOrUpdateTournament,
    deleteTournament,
    busy,
  } = useSportControl()

  const [tournamentForm, setTournamentForm] = useState(apiHelpers.emptyTournament)
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const isEdit = Boolean(editingId)
  const { requestConfirm, dialogNode } = useConfirmDialog(busy)

  const confirmDelete = (tournament) => {
    const label = tournament?.name ? `турнир «${tournament.name}»` : 'турнир'
    requestConfirm({
      title: `Удалить ${label}?`,
      description: 'Данные будут удалены без возможности восстановления.',
      onConfirm: () => deleteTournament(tournament),
    })
  }

  const openCreate = () => {
    setEditingId(null)
    setTournamentForm(apiHelpers.emptyTournament)
    setModalOpen(true)
  }

  const openEdit = (tournament) => {
    const rawTeamIds = Array.isArray(tournament.teamIds)
      ? tournament.teamIds
      : Array.isArray(tournament.teams)
        ? tournament.teams.map((team) => (typeof team === 'object' ? team.id : team))
        : []
    setEditingId(tournament.id)
    setTournamentForm({
      name: tournament.name || '',
      sportId: tournament.sportId ? String(tournament.sportId) : '',
      teamIds: rawTeamIds.filter(Boolean).map((teamId) => String(teamId)),
    })
    setModalOpen(true)
  }

  const onSubmit = async () => {
    setModalBusy(true)
    try {
      const teamIds = Array.isArray(tournamentForm.teamIds)
        ? tournamentForm.teamIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))
        : []
      const payload = {
        name: tournamentForm.name.trim(),
        sportId: tournamentForm.sportId === '' ? null : Number(tournamentForm.sportId),
        teamIds,
      }
      await createOrUpdateTournament(editingId, payload)
      setModalOpen(false)
    } finally {
      setModalBusy(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Турниры</h2>
        </div>
        <div className="panel-meta">
          <button className="button primary" type="button" onClick={openCreate} disabled={busy}>
            Создать турнир
          </button>
        </div>
      </div>

      <div className="panel-grid single">
        <div className="panel-card list-card">
          <h3>Список турниров</h3>
          <ul className="item-list">
            {tournaments.map((tournament) => (
              <li key={tournament.id} className="item">
                <div className="item-body">
                  <span className="item-title">{tournament.name}</span>
                  <div className="item-meta">{sportById.get(tournament.sportId) || 'Неизвестный вид спорта'}</div>
                  <div className="item-meta">
                    {[...(teamsByTournament.get(tournament.id) || [])].map((teamId) => (
                      <span key={teamId} className="tag">
                        {teamById.get(teamId) || `Команда #${teamId}`}
                      </span>
                    ))}
                    {!teamsByTournament.get(tournament.id)?.size ? <span className="muted">Пока нет команд</span> : null}
                  </div>
                </div>
                <div className="item-actions">
                  <button className="button tiny" type="button" onClick={() => openEdit(tournament)} disabled={busy}>
                    Редактировать
                  </button>
                  <button
                    className="button tiny danger"
                    type="button"
                    onClick={() => confirmDelete(tournament)}
                    disabled={busy}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
            {!tournaments.length ? (
              <li className="item" style={{ gridTemplateColumns: '1fr' }}>
                <span className="muted">Пока нет турниров.</span>
              </li>
            ) : null}
          </ul>
        </div>

      </div>

      <Modal
        open={modalOpen}
        title={isEdit ? 'Редактировать турнир' : 'Создать турнир'}
        description="Выберите вид спорта и задайте название."
        busy={modalBusy}
        primaryAction={{
          label: isEdit ? 'Сохранить' : 'Создать',
          disabled: modalBusy || busy,
          onClick: onSubmit,
        }}
        secondaryAction={{
          label: 'Отмена',
          disabled: modalBusy || busy,
          onClick: () => setModalOpen(false),
        }}
        onClose={() => setModalOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <label>
            Название
            <input
              value={tournamentForm.name}
              onChange={(event) => setTournamentForm({ ...tournamentForm, name: event.target.value })}
              required
              minLength={2}
              autoFocus
            />
          </label>

          <label>
            Вид спорта
            <select
              value={tournamentForm.sportId}
              onChange={(event) => setTournamentForm({ ...tournamentForm, sportId: event.target.value })}
              required
            >
              <option value="">Выберите вид спорта</option>
              {sports.map((sport) => (
                <option key={sport.id} value={String(sport.id)}>
                  {sport.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Команды
            <select
              multiple
              value={tournamentForm.teamIds || []}
              onChange={(event) => {
                const selected = Array.from(event.target.selectedOptions, (option) => option.value)
                setTournamentForm({ ...tournamentForm, teamIds: selected })
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Modal>

      {dialogNode}
    </section>
  )
}

const TeamsPage = () => {
  const { teams, playersByTeam, apiHelpers, createOrUpdateTeam, deleteTeam, busy } = useSportControl()

  const [teamForm, setTeamForm] = useState(apiHelpers.emptyTeam)
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const isEdit = Boolean(editingId)
  const { requestConfirm, dialogNode } = useConfirmDialog(busy)

  const confirmDelete = (team) => {
    const label = team?.name ? `команду «${team.name}»` : 'команду'
    requestConfirm({
      title: `Удалить ${label}?`,
      description: 'Данные будут удалены без возможности восстановления.',
      onConfirm: () => deleteTeam(team),
    })
  }

  const openCreate = () => {
    setEditingId(null)
    setTeamForm(apiHelpers.emptyTeam)
    setModalOpen(true)
  }

  const openEdit = (team) => {
    setEditingId(team.id)
    setTeamForm({ name: team.name || '' })
    setModalOpen(true)
  }

  const onSubmit = async () => {
    setModalBusy(true)
    try {
      await createOrUpdateTeam(editingId, { name: teamForm.name.trim() })
      setModalOpen(false)
    } finally {
      setModalBusy(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Команды</h2>
        </div>
        <div className="panel-meta">
          <button className="button primary" type="button" onClick={openCreate} disabled={busy}>
            Создать команду
          </button>
        </div>
      </div>

      <div className="panel-grid single">
        <div className="panel-card list-card">
          <h3>Список команд</h3>
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
                    {!playersByTeam.get(team.id)?.length ? <span className="muted">Пока нет игроков</span> : null}
                  </div>
                </div>
                <div className="item-actions">
                  <button className="button tiny" type="button" onClick={() => openEdit(team)} disabled={busy}>
                    Редактировать
                  </button>
                  <button
                    className="button tiny danger"
                    type="button"
                    onClick={() => confirmDelete(team)}
                    disabled={busy}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
            {!teams.length ? (
              <li className="item" style={{ gridTemplateColumns: '1fr' }}>
                <span className="muted">Пока нет команд.</span>
              </li>
            ) : null}
          </ul>
        </div>

      </div>

      <Modal
        open={modalOpen}
        title={isEdit ? 'Редактировать команду' : 'Создать команду'}
        description="Задайте название команды."
        busy={modalBusy}
        primaryAction={{
          label: isEdit ? 'Сохранить' : 'Создать',
          disabled: modalBusy || busy,
          onClick: onSubmit,
        }}
        secondaryAction={{
          label: 'Отмена',
          disabled: modalBusy || busy,
          onClick: () => setModalOpen(false),
        }}
        onClose={() => setModalOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <label>
            Название
            <input
              value={teamForm.name}
              onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
              required
              minLength={2}
              autoFocus
            />
          </label>
        </form>
      </Modal>

      {dialogNode}
    </section>
  )
}

const PlayersPage = () => {
  const { players, teams, teamById, apiHelpers, createOrUpdatePlayer, deletePlayer, busy } = useSportControl()

  const [playerForm, setPlayerForm] = useState(apiHelpers.emptyPlayer)
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const isEdit = Boolean(editingId)
  const { requestConfirm, dialogNode } = useConfirmDialog(busy)

  const confirmDelete = (player) => {
    const label = player?.name ? `игрока «${player.name}»` : 'игрока'
    requestConfirm({
      title: `Удалить ${label}?`,
      description: 'Данные будут удалены без возможности восстановления.',
      onConfirm: () => deletePlayer(player),
    })
  }

  const openCreate = () => {
    setEditingId(null)
    setPlayerForm(apiHelpers.emptyPlayer)
    setModalOpen(true)
  }

  const openEdit = (player) => {
    setEditingId(player.id)
    setPlayerForm({
      name: player.name || '',
      teamId: player.teamId ? String(player.teamId) : '',
    })
    setModalOpen(true)
  }

  const onSubmit = async () => {
    setModalBusy(true)
    try {
      await createOrUpdatePlayer(editingId, {
        name: playerForm.name.trim(),
        teamId: playerForm.teamId === '' ? null : Number(playerForm.teamId),
      })
      setModalOpen(false)
    } finally {
      setModalBusy(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Игроки</h2>
        </div>
        <div className="panel-meta">
          <button className="button primary" type="button" onClick={openCreate} disabled={busy}>
            Создать игрока
          </button>
        </div>
      </div>

      <div className="panel-grid single">
        <div className="panel-card list-card">
          <h3>Список игроков</h3>
          <ul className="item-list">
            {players.map((player) => (
              <li key={player.id} className="item">
                <div className="item-body">
                  <span className="item-title">{player.name}</span>
                  <div className="item-meta">Команда: {teamById.get(player.teamId) || 'Нет команды'}</div>
                </div>
                <div className="item-actions">
                  <button className="button tiny" type="button" onClick={() => openEdit(player)} disabled={busy}>
                    Редактировать
                  </button>
                  <button className="button tiny danger" type="button" onClick={() => confirmDelete(player)} disabled={busy}>
                    Удалить
                  </button>
                </div>
              </li>
            ))}
            {!players.length ? (
              <li className="item" style={{ gridTemplateColumns: '1fr' }}>
                <span className="muted">Пока нет игроков.</span>
              </li>
            ) : null}
          </ul>
        </div>

      </div>

      <Modal
        open={modalOpen}
        title={isEdit ? 'Редактировать игрока' : 'Создать игрока'}
        description="Выберите команду для игрока."
        busy={modalBusy}
        primaryAction={{
          label: isEdit ? 'Сохранить' : 'Создать',
          disabled: modalBusy || busy,
          onClick: onSubmit,
        }}
        secondaryAction={{
          label: 'Отмена',
          disabled: modalBusy || busy,
          onClick: () => setModalOpen(false),
        }}
        onClose={() => setModalOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <label>
            Имя
            <input
              value={playerForm.name}
              onChange={(event) => setPlayerForm({ ...playerForm, name: event.target.value })}
              required
              minLength={2}
              autoFocus
            />
          </label>

          <label>
            Команда
            <select
              value={playerForm.teamId}
              onChange={(event) => setPlayerForm({ ...playerForm, teamId: event.target.value })}
              required
            >
              <option value="">Выберите команду</option>
              {teams.map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Modal>

      {dialogNode}
    </section>
  )
}

const MatchesPage = () => {
  const {
    matches,
    tournaments,
    teams,
    matchFilter,
    setMatchFilter,
    busy,
    apiHelpers,
    matchUtils,
    setMatchFilterAndSearch,
    resetMatchFiltersAndSearch,
    createOrUpdateMatch,
    deleteMatch,
  } = useSportControl()

  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const [matchForm, setMatchForm] = useState(apiHelpers.emptyMatch)
  const isEdit = Boolean(editingId)
  const { requestConfirm, dialogNode } = useConfirmDialog(busy)

  const confirmDelete = (match) => {
    const label = match?.name ? `матч «${match.name}»` : 'матч'
    requestConfirm({
      title: `Удалить ${label}?`,
      description: 'Данные будут удалены без возможности восстановления.',
      onConfirm: () => deleteMatch(match),
    })
  }

  const openCreate = () => {
    setEditingId(null)
    setMatchForm(apiHelpers.emptyMatch)
    setModalOpen(true)
  }

  const openEdit = (match) => {
    setEditingId(match.id)
    setMatchForm({
      name: match.name || '',
      location: match.location || '',
      date: match.date ? matchUtils.toDateInput(match.date) : '',
      tournamentId: match.tournamentId ? String(match.tournamentId) : '',
      homeTeamId: match.homeTeamId ? String(match.homeTeamId) : '',
      awayTeamId: match.awayTeamId ? String(match.awayTeamId) : '',
    })
    setModalOpen(true)
  }

  const onSubmit = async () => {
    setModalBusy(true)
    try {
      await createOrUpdateMatch(editingId, {
        name: matchForm.name.trim(),
        location: matchForm.location.trim(),
        date: matchUtils.toDateTime(matchForm.date),
        tournamentId: matchForm.tournamentId === '' ? null : Number(matchForm.tournamentId),
        homeTeamId: matchForm.homeTeamId === '' ? null : Number(matchForm.homeTeamId),
        awayTeamId: matchForm.awayTeamId === '' ? null : Number(matchForm.awayTeamId),
      })
      setModalOpen(false)
    } finally {
      setModalBusy(false)
    }
  }

  const onApplyFilter = async (e) => {
    e.preventDefault()
    await setMatchFilterAndSearch(matchFilter)
  }

  const onReset = async () => {
    await resetMatchFiltersAndSearch()
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Матчи</h2>
        </div>
        <div className="panel-meta">
          <button className="button primary" type="button" onClick={openCreate} disabled={busy}>
            Создать матч
          </button>
        </div>
      </div>

      <div className="panel-grid match-grid">
        <div className="panel-card filter-card">
          <h3>Фильтры</h3>

          <form className="form-grid" onSubmit={onApplyFilter}>
            <div className="form-row">
              <label>
                Название
                <input value={matchFilter.name} onChange={(e) => setMatchFilter({ ...matchFilter, name: e.target.value })} />
              </label>

              <label>
                Турнир
                <select
                  value={matchFilter.tournamentId}
                  onChange={(e) => setMatchFilter({ ...matchFilter, tournamentId: e.target.value })}
                >
                  <option value="">Все турниры</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Место
                <input value={matchFilter.location} onChange={(e) => setMatchFilter({ ...matchFilter, location: e.target.value })} />
              </label>

              <label>
                Домашняя команда (по названию)
                <input
                  value={matchFilter.homeTeamName}
                  onChange={(e) => setMatchFilter({ ...matchFilter, homeTeamName: e.target.value })}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Гостевая команда (по названию)
                <input
                  value={matchFilter.awayTeamName}
                  onChange={(e) => setMatchFilter({ ...matchFilter, awayTeamName: e.target.value })}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Дата с
                <input
                  type="datetime-local"
                  value={matchFilter.dateFrom}
                  onChange={(e) => setMatchFilter({ ...matchFilter, dateFrom: e.target.value })}
                />
              </label>

              <label>
                Дата по
                <input
                  type="datetime-local"
                  value={matchFilter.dateTo}
                  onChange={(e) => setMatchFilter({ ...matchFilter, dateTo: e.target.value })}
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="button primary" type="submit" disabled={busy}>
                Применить
              </button>
              <button className="button ghost" type="button" onClick={onReset} disabled={busy}>
                Сбросить
              </button>
            </div>
          </form>
        </div>

        <div className="panel-card list-card">
          <h3>Список матчей</h3>
          <ul className="item-list">
            {matches.map((match) => (
              <li key={match.id} className="item">
                <div className="item-body">
                  <span className="item-title">{match.name}</span>

                  <div className="item-meta">
                    {match.location || 'Место не указано'} | {match.tournamentName || 'Турнир не задан'}
                  </div>

                  <div className="item-meta">
                    {match.homeTeamName || 'Домашняя команда'} — против — {match.awayTeamName || 'Гостевая команда'}
                  </div>

                  <div className="item-meta">
                    {match.date ? new Date(match.date).toLocaleString('ru-RU') : 'Дата не задана'}
                  </div>
                </div>

                <div className="item-actions">
                  <button className="button tiny" type="button" onClick={() => openEdit(match)} disabled={busy}>
                    Редактировать
                  </button>
                  <button
                    className="button tiny danger"
                    type="button"
                    onClick={() => confirmDelete(match)}
                    disabled={busy}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}

            {!matches.length ? (
              <li className="item" style={{ gridTemplateColumns: '1fr' }}>
                <span className="muted">Матчи по текущим фильтрам не найдены.</span>
              </li>
            ) : null}
          </ul>
        </div>

      </div>

      <Modal
        open={modalOpen}
        title={isEdit ? 'Редактировать матч' : 'Создать матч'}
        description="Заполните данные матча и сохраните."
        busy={modalBusy}
        primaryAction={{
          label: isEdit ? 'Сохранить' : 'Создать',
          disabled: modalBusy || busy,
          onClick: onSubmit,
        }}
        secondaryAction={{
          label: 'Отмена',
          disabled: modalBusy || busy,
          onClick: () => setModalOpen(false),
        }}
        onClose={() => setModalOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="form-row">
            <label>
              Название
              <input
                value={matchForm.name}
                onChange={(e) => setMatchForm({ ...matchForm, name: e.target.value })}
                required
                minLength={2}
                autoFocus
              />
            </label>

            <label>
              Турнир
              <select
                value={matchForm.tournamentId}
                onChange={(e) => setMatchForm({ ...matchForm, tournamentId: e.target.value })}
                required
              >
                <option value="">Выберите турнир</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Место
              <input
                value={matchForm.location}
                onChange={(e) => setMatchForm({ ...matchForm, location: e.target.value })}
                required
              />
            </label>

            <label>
              Дата и время
              <input
                type="datetime-local"
                value={matchForm.date}
                onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Домашняя команда
              <select
                value={matchForm.homeTeamId}
                onChange={(e) => setMatchForm({ ...matchForm, homeTeamId: e.target.value })}
                required
              >
                <option value="">Выберите домашнюю команду</option>
                {teams.map((team) => (
                  <option key={team.id} value={String(team.id)}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Гостевая команда
              <select
                value={matchForm.awayTeamId}
                onChange={(e) => setMatchForm({ ...matchForm, awayTeamId: e.target.value })}
                required
              >
                <option value="">Выберите гостевую команду</option>
                {teams.map((team) => (
                  <option key={team.id} value={String(team.id)}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
      </Modal>

      {dialogNode}
    </section>
  )
}

const AppRoutes = () => {
  const routesConfig = useMemo(
    () => ({
      default: 'matches',
      byKey: {
        sports: <SportsPage />,
        tournaments: <TournamentsPage />,
        teams: <TeamsPage />,
        players: <PlayersPage />,
        matches: <MatchesPage />,
      },
    }),
    [],
  )

  const { routeKey, route } = useHashRoute(routesConfig)

  return <AppShell activeRouteKey={routeKey}>{route}</AppShell>
}

function App() {
  return (
    <SportControlProvider>
      <AppRoutes />
    </SportControlProvider>
  )
}

export default App
