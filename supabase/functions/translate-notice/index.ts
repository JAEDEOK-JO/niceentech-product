import { createClient } from 'npm:@supabase/supabase-js'

const RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MODEL = 'gpt-6.1-terra'
const CODES = ['lo', 'my', 'th', 'en', 'ru', 'vi', 'ur', 'bn', 'ne']

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const adminRoles = new Set(['super_admin', 'admin', '관리자'])

const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

const translationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(CODES.map((code) => [code, { type: 'string' }])),
  required: CODES,
}

function runtimeConfig() {
  const config = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    OPENAI_CHATBOT_API_KEY: Deno.env.get('OPENAI_CHATBOT_API_KEY') ?? '',
  }
  const missing = Object.entries(config)
    .filter(([, value]) => !String(value).trim())
    .map(([key]) => key)
  return { config, missing }
}

function callerId(token: string) {
  const part = token.split('.')[1] ?? ''
  if (!part) return ''
  try {
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='))) as {
      sub?: unknown
      role?: unknown
      exp?: unknown
    }
    if (json.role !== 'authenticated') return ''
    const exp = Number(json.exp)
    if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return ''
    const id = String(json.sub ?? '')
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : ''
  } catch {
    return ''
  }
}

async function callerRole(token: string, url: string, serviceKey: string) {
  const id = callerId(token)
  if (!id) return ''
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .maybeSingle()
  return String(profile?.role ?? '').trim()
}

const instructions = `한국 공장 공지를 외국인 작업자가 바로 알아듣게 옮긴다.
단어를 하나씩 바꾸지 말고, 금지와 의무와 금액과 장소와 순서가 그 언어로 분명하게 전달되게 쓴다.
항공마대는 공장에서 쓰는 큰 폐기물 포대다. 종량제 봉투는 버리는 양만큼 값을 내는 생활쓰레기 봉투다. 기숙사는 공장 숙소다.
줄바꿈과 문단은 한국어와 같게 둔다.
제목, 설명, 괄호 주석, 별표, 굵은 표시를 넣지 않는다.
숫자와 금액은 바꾸지 않는다.
각 값은 그 언어로만 쓴다.
lo 라오어, my 미얀마어, th 태국어, en 영어, ru 러시아어, vi 베트남어, ur 우르두어, bn 벵골어, ne 네팔어.`

async function translate(body: string, apiKey: string) {
  const response = await fetch(RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      store: false,
      max_output_tokens: 16_000,
      reasoning: { effort: 'medium' },
      instructions,
      input: [{ role: 'user', content: body }],
      text: {
        format: {
          type: 'json_schema',
          name: 'notice_translations',
          strict: true,
          schema: translationSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`openai_${response.status}:${detail.slice(0, 180)}`)
  }

  const payload = await response.json() as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string, text?: string }> }>
  }
  const direct = String(payload.output_text ?? '').trim()
  const text = direct || (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text' && item.text)
    .map((item) => item.text)
    .join('')
  const parsed = JSON.parse(text) as Record<string, unknown>
  const translations: Record<string, string> = {}
  for (const code of CODES) {
    const value = String(parsed[code] ?? '').trim()
    if (!value) throw new Error('openai_empty')
    translations[code] = value
  }
  return translations
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const { config, missing } = runtimeConfig()
  if (missing.length > 0) return json({ error: 'missing_config' }, 500)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'forbidden' }, 403)
  const role = await callerRole(token, config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
  if (!adminRoles.has(role)) return json({ error: 'forbidden' }, 403)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const body = String(payload.body ?? '').trim()
  if (!body || body.length > 4000) return json({ error: 'invalid_input' }, 400)

  try {
    const translations = await translate(body, config.OPENAI_CHATBOT_API_KEY.trim())
    return json({ translations })
  } catch {
    return json({ error: 'translate_failed' }, 502)
  }
})
