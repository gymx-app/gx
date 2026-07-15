import { supabase } from '../lib/supabase'

export async function resolveExercises(
  exerciseNames: string[],
  userId: string
): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>()
  if (exerciseNames.length === 0) return nameToId

  const unique = [...new Set(exerciseNames)]

  // Fetch all global + user's own exercises in one query
  const { data: existing } = await supabase
    .from('exercises')
    .select('id, name')
    .or(`is_global.eq.true,created_by.eq.${userId}`)

  const byNameLower = new Map<string, { id: string; name: string }>()
  for (const row of existing ?? []) {
    byNameLower.set(row.name.toLowerCase(), row)
  }

  const toInsert: string[] = []

  for (const name of unique) {
    const exact = (existing ?? []).find((r) => r.name === name)
    if (exact) {
      nameToId.set(name, exact.id)
      continue
    }

    const caseMatch = byNameLower.get(name.toLowerCase())
    if (caseMatch) {
      nameToId.set(name, caseMatch.id)
      continue
    }

    toInsert.push(name)
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map((name) => ({
      name,
      is_global: false,
      created_by: userId,
    }))

    const { data: inserted, error } = await supabase
      .from('exercises')
      .insert(rows)
      .select('id, name')

    if (error) throw new Error(`Failed to create exercises: ${error.message}`)

    for (const row of inserted ?? []) {
      nameToId.set(row.name, row.id)
    }
  }

  return nameToId
}
