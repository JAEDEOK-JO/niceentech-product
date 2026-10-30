import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { bigrams, matchScore } from './noteMatch.ts'
import { screenLabel } from './screenGuide.ts'

export type ChatbotNote = {
  id: number
  kind: string
  topic: string
  note: string
  keywords: string[]
  hit_count: number
}

export type LearnedNote = { topic: string; note: string; keywords: string[] }

const NOTE_LIMIT = 8
const MIN_SCORE = 1

function clip(value: string, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function topicTerms(topic: string) {
  const table = topic.split('.')[0]
  return [screenLabel(table), topic.includes('.') ? '' : topic].filter(Boolean)
}

function cleanKeywords(values: unknown) {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const words: string[] = []
  for (const value of values) {
    const word = clip(String(value ?? ''), 30)
    if (!word || seen.has(word)) continue
    seen.add(word)
    words.push(word)
    if (words.length >= 12) break
  }
  return words
}

export async function findNotes(supabase: SupabaseClient, texts: string[]) {
  const { data, error } = await supabase
    .from('chatbot_notes')
    .select('id, kind, topic, note, keywords, hit_count')
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error) throw error

  const query = bigrams(texts)
  return ((data ?? []) as ChatbotNote[])
    .map((note) => ({ note, score: matchScore(query, [...topicTerms(note.topic), ...(note.keywords ?? [])]) }))
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((left, right) => right.score - left.score || right.note.hit_count - left.note.hit_count)
    .slice(0, NOTE_LIMIT)
    .map(({ note }) => note)
}

export function notesText(notes: ChatbotNote[]) {
  if (!notes.length) return ''
  return notes.map((note) => `- [${note.topic}] ${note.note}`).join('\n')
}

export async function markNotesUsed(supabase: SupabaseClient, notes: ChatbotNote[]) {
  const now = new Date().toISOString()
  await Promise.all(
    notes.map((note) =>
      supabase
        .from('chatbot_notes')
        .update({ hit_count: (note.hit_count ?? 0) + 1, last_used_at: now })
        .eq('id', note.id),
    ),
  )
}

export async function saveValueNote(supabase: SupabaseClient, look: string, lines: string[], question: string) {
  if (!lines.length) return
  const topic = clip(look, 120)
  const [table, column] = topic.split('.')
  const note = clip(`저장 값 예: ${lines.slice(0, 5).join(' / ')}`, 600)
  const keywords = cleanKeywords([screenLabel(table), column])
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('chatbot_notes')
    .select('id')
    .eq('kind', 'value')
    .eq('topic', topic)
    .maybeSingle()
  if (error) throw error

  if (data?.id) {
    const { error: updateError } = await supabase
      .from('chatbot_notes')
      .update({ note, keywords, updated_at: now })
      .eq('id', data.id)
    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabase
    .from('chatbot_notes')
    .insert({ kind: 'value', topic, note, keywords, source_question: clip(question, 500) })
  if (insertError && insertError.code !== '23505') throw insertError
}

export function readLearned(values: unknown): LearnedNote[] {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => {
      const item = (value ?? {}) as Record<string, unknown>
      return {
        topic: clip(String(item.topic ?? ''), 120),
        note: clip(String(item.note ?? ''), 600),
        keywords: cleanKeywords(item.keywords),
      }
    })
    .filter((item) => item.topic && item.note)
    .slice(0, 3)
}

export async function saveLearnedNotes(supabase: SupabaseClient, items: LearnedNote[], question: string) {
  for (const item of items) {
    const { error } = await supabase.from('chatbot_notes').insert({
      kind: 'learned',
      topic: item.topic,
      note: item.note,
      keywords: item.keywords,
      source_question: clip(question, 500),
    })
    if (error && error.code !== '23505') throw error
  }
}
