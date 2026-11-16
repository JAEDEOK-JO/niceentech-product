import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import {
  findNotes,
  markNotesUsed,
  notesText,
  readLearned,
  saveLearnedNotes,
  saveValueNote,
  type ChatbotNote,
} from './notes.ts'
import { koreanReasoning } from './koreanReasoning.ts'
import { completeJson, completeText } from './openai.ts'
import { noteTables, pickTables } from './pickTables.ts'
import { phrasePrompt, planPrompt, seoulToday } from './schemaPrompt.ts'
import { sampleLines, sampleSql } from './sampleColumnValues.ts'
import { guardSql } from './sqlGuard.ts'
import { isWriteRequest } from './writeIntent.ts'

const FAILURE = '조회에 실패했습니다.'
const REFUSAL = '수행할 수 없습니다.'

function stopped(signal?: AbortSignal) {
  return Boolean(signal?.aborted)
}

function stopError() {
  return new DOMException('stopped', 'AbortError')
}

function joinReasoning(parts: string[]) {
  return clip(parts.map((part) => part.trim()).filter(Boolean).join('\n\n'), 8000)
}

function clip(value: string, max: number) {
  const text = value.trim()
  if (text.length <= max) return text
  return text.slice(0, max)
}

function relayReasoning(onReasoning?: (delta: string) => void) {
  let hasText = false
  let gap = false
  return {
    delta(text: string) {
      if (!onReasoning || !text) return
      if (gap && hasText) onReasoning('\n\n')
      gap = false
      hasText = true
      onReasoning(text)
    },
    gap() {
      gap = true
    },
  }
}

async function recentMessages(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) throw error
  return (data ?? []).reverse()
}

async function relatedNotes(
  supabase: SupabaseClient,
  question: string,
  history: { role: string; content: string }[],
) {
  const recentQuestions = history
    .filter((message) => message.role === 'user')
    .slice(-2)
    .map((message) => message.content)
  try {
    const notes = await findNotes(supabase, [question, ...recentQuestions])
    if (notes.length) markNotesUsed(supabase, notes).catch((error) => console.error('chatbot note mark failed', error))
    return notes
  } catch (error) {
    console.error('chatbot notes failed', error)
    return [] as ChatbotNote[]
  }
}

async function plan(
  question: string,
  history: { role: string; content: string }[],
  hint: string,
  notes: string,
  tables: string[] | undefined,
  onReasoning?: (delta: string) => void,
  signal?: AbortSignal,
) {
  const historyText = history
    .map((message) => `${message.role === 'user' ? '사용자' : '챗봇'}: ${clip(message.content, 300)}`)
    .join('\n')

  return completeJson(
    `${planPrompt(seoulToday(), notes, tables)}

이전 대화:
${historyText || '(없음)'}

질문: ${question}
${hint}`,
    onReasoning,
    signal,
  )
}

async function selectRows(
  supabase: SupabaseClient,
  question: string,
  history: { role: string; content: string }[],
  onReasoning?: (delta: string) => void,
  signal?: AbortSignal,
) {
  const notes: string[] = []
  const korean = koreanReasoning(relayReasoning(onReasoning), signal)
  if (isWriteRequest(question)) return { text: REFUSAL, reasoning: '' }

  const related = await relatedNotes(supabase, question, history)
  const memo = notesText(related)
  const recent = history
    .filter((message) => message.role === 'user')
    .slice(-2)
    .map((message) => clip(message.content, 200))
  let tables =
    (await pickTables(question, recent, noteTables(related.map((note) => note.topic)), signal)) ?? undefined
  if (stopped(signal)) throw stopError()
  let hint = ''
  let reason = FAILURE
  let looked = false
  let rejected = false

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (stopped(signal)) throw stopError()
    let planned: { sql: string; reply: string; reasoning: string; look: string; learn: unknown }
    try {
      planned = await plan(question, history, hint, memo, tables, korean.delta, signal)
      notes.push(await korean.flush())    } catch (error) {
      if (stopped(signal)) throw stopError()
      notes.push(await korean.flush())
      console.error('chatbot plan failed', error)
      reason = FAILURE
      break
    }

    if (planned.look && !looked) {
      looked = true
      try {
        const peek = sampleSql(planned.look)
        if (!peek) throw new Error('unknown_column')
        const { data, error } = await supabase.rpc('chatbot_select', { p_sql: guardSql(peek) })
        if (error) throw error
        const lines = sampleLines(data)
        await saveValueNote(supabase, planned.look, lines, question).catch((saveError) =>
          console.error('chatbot value note failed', saveError),
        )
        hint = `실제 저장 값:\n${lines.join('\n') || '(없음)'}\n이 글자 그대로 조건에 쓴다. look은 비운다. reply는 비운다.`
      } catch (error) {
        console.error('chatbot sample failed', error)
        hint = '값 확인은 거절되었다. 안내된 화면 자료만 쓰는 SELECT 하나로 다시 작성한다. look은 비운다. reply는 비운다.'
      }
      continue
    }

    if (!planned.sql) {
      if (!rejected) return { text: planned.reply || '질문을 확인해 주세요', reasoning: joinReasoning(notes) }
      return { text: reason, reasoning: joinReasoning(notes) }
    }

    if (!/^\s*select\b/i.test(planned.sql) || isWriteRequest(planned.sql)) {
      return { text: REFUSAL, reasoning: '' }
    }

    try {
      const sql = guardSql(planned.sql)
      const { data, error } = await supabase.rpc('chatbot_select', { p_sql: sql })
      if (error) throw error
      const learned = readLearned(planned.learn)
      if (learned.length) {
        await saveLearnedNotes(supabase, learned, question).catch((saveError) =>
          console.error('chatbot learned note failed', saveError),
        )
      }
      const rows = JSON.stringify(data ?? []).slice(0, 12000)
      const phrased = await completeText(phrasePrompt(question, rows), korean.delta, signal)
      if (stopped(signal)) throw stopError()
      notes.push(await korean.flush())
      return { text: clip(phrased.text, 3900) || FAILURE, reasoning: joinReasoning(notes) }
    } catch (error) {
      if (stopped(signal)) throw stopError()
      console.error('chatbot query failed', error)
      reason = FAILURE
      rejected = true
      console.error('chatbot rejected sql', planned.sql)
      tables = undefined
      const cause = clip(String((error as { message?: unknown })?.message ?? ''), 200)
      hint = `앞의 조회는 거절되었다. 이유: ${cause || '알 수 없음'}
같은 SQL을 다시 내지 않는다. 이유를 고친 SELECT 하나로 다시 작성한다. 안내된 화면 자료만 쓴다. 비밀번호, 푸시, 챗봇 대화는 쓰지 않는다. reply는 비운다.`
    }
  }

  return { text: reason, reasoning: joinReasoning(notes) }
}

async function saveMessages(
  supabase: SupabaseClient,
  userId: string,
  question: string,
  answer: string,
  reasoning: string,
  durationMs: number,
) {
  const { error } = await supabase.from('chatbot_messages').insert([
    { user_id: userId, role: 'user', content: clip(question, 500) },
    {
      user_id: userId,
      role: 'assistant',
      content: clip(answer, 3900),
      reasoning: reasoning || null,
      duration_ms: durationMs,
    },
  ])
  if (error) throw error
}

export async function answerQuestion(
  supabase: SupabaseClient,
  userId: string,
  question: string,
  onReasoning?: (delta: string) => void,
  signal?: AbortSignal,
) {
  const started = Date.now()
  const history = await recentMessages(supabase, userId)
  let text = FAILURE
  let reasoning = ''

  try {
    const result = await selectRows(supabase, question, history, onReasoning, signal)
    if (stopped(signal)) return
    text = result.text || FAILURE
    reasoning = result.reasoning || ''
  } catch (error) {
    if (stopped(signal)) return
    console.error('chatbot answer failed', error)
  }

  if (stopped(signal)) return
  await saveMessages(supabase, userId, question, text, reasoning, Date.now() - started)
}
