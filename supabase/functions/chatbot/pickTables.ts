import { completeSchema } from './openai.ts'
import { screenRules, tableCatalog } from './screenGuide.ts'
import { tableColumns } from './tableColumns.ts'

const MAX_TABLES = 8

const PICK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    needsData: { type: 'boolean' },
    tables: { type: 'array', items: { type: 'string' } },
  },
  required: ['needsData', 'tables'],
}

function known(name: string) {
  return Object.prototype.hasOwnProperty.call(tableColumns, name)
}

export function noteTables(topics: string[]) {
  return topics.map((topic) => topic.split('.')[0].trim()).filter(known)
}

export async function pickTables(question: string, recent: string[], extra: string[], signal?: AbortSignal) {
  const prompt = `${screenRules()}

자료 이름
${tableCatalog()}

최근 질문
${recent.join('\n') || '(없음)'}

질문: ${question}

이 질문에 답하려고 조회할 자료 이름만 고른다. join 에 필요한 자료도 함께 고른다. ${MAX_TABLES}개 이하다.
인사, 잡담, 조회할 수 있는 화면을 묻는 것처럼 자료가 필요 없으면 needsData 는 false, tables 는 빈 배열이다.`

  try {
    const { value } = await completeSchema(prompt, 'chatbot_tables', PICK_SCHEMA, {
      effort: 'low',
      summary: false,
      signal,
    })
    if (value.needsData === false) return []
    const picked = (Array.isArray(value.tables) ? value.tables : [])
      .map((name) => String(name ?? '').trim())
      .filter(known)
      .slice(0, MAX_TABLES)
    if (!picked.length) return null
    return [...new Set([...picked, ...extra])]
  } catch (error) {
    if (signal?.aborted) throw error
    console.error('chatbot table pick failed', error)
    return null
  }
}
