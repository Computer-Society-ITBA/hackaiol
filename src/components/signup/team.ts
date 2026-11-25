export const MAX_TEAM_SIZE = 3

export type TeamChoice = 'join' | 'create'

export type TeamState = {
  choice: TeamChoice | null
  name: string
  code: string
}

export const emptyTeam: TeamState = { choice: null, name: '', code: '' }

export type TeamLookup = {
  exists: boolean
  memberCount: number
  isFull: boolean
}

/**
 * Team names become their invite code: no accents, no spaces, no symbols.
 * Kept in sync by hand with functions/src/lib/team.ts.
 */
export function teamIdFrom(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24)
}

export function canLeaveTeamStep(team: TeamState, lookup: TeamLookup | null) {
  if (team.choice === 'create') return teamIdFrom(team.name).length >= 3
  if (team.choice === 'join') {
    if (teamIdFrom(team.code).length < 4) return false
    return lookup !== null && lookup.exists && !lookup.isFull
  }
  return false
}
