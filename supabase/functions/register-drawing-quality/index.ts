import { createClient } from 'npm:@supabase/supabase-js'
import { readDrawingQuantities } from './gptQuantity.ts'
import { insertQualityList } from './insertQualityList.ts'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

function failureMessage(detail: string) {
  if (detail === 'company_missing') return '회사 연결 실패'
  if (detail === 'test_date_missing') return '검수일이 없습니다'
  if (detail === 'openai_key_missing') return 'API 키 없음'
  if (detail.startsWith('openai_')) return '도면 수량 읽기 실패'
  return detail.slice(0, 80) || '검수리스트 등록 실패'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 500)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 400)
  }

  const productListId = Number(body.productListId ?? 0)
  const drawingFileId = Number(body.drawingFileId ?? 0)
  if (!productListId || !drawingFileId) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 400)

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const plan = await supabase
    .from('product_list')
    .select('id, company, place, area, initial, test_date, company_info')
    .eq('id', productListId)
    .maybeSingle()

  if (plan.error || !plan.data) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 404)

  const company = String(plan.data.company ?? '').trim()

  const drawing = await supabase
    .from('drawing_pdf')
    .select('id, name, nas_path, product_list_id')
    .eq('id', drawingFileId)
    .eq('product_list_id', productListId)
    .maybeSingle()

  if (drawing.error || !drawing.data) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 404)

  const fileName = String(drawing.data.name ?? 'drawing.pdf')
  if (!fileName.toLowerCase().endsWith('.pdf')) return jsonResponse({ ok: true, skipped: true })

  const storagePath = String(drawing.data.nas_path ?? '').trim()
  if (!storagePath) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 404)

  const file = await supabase.storage.from('media').download(storagePath)
  if (file.error || !file.data) return jsonResponse({ ok: false, message: '검수리스트 등록 실패' }, 500)

  try {
    const bytes = new Uint8Array(await file.data.arrayBuffer())
    const quantities = await readDrawingQuantities(fileName, bytes)
    const qualityListId = await insertQualityList(
      supabase,
      {
        company,
        place: String(plan.data.place ?? ''),
        area: String(plan.data.area ?? ''),
        initial: String(plan.data.initial ?? ''),
        testDate: String(plan.data.test_date ?? '').trim(),
        companyId: plan.data.company_info == null ? null : Number(plan.data.company_info),
      },
      quantities,
    )

    return jsonResponse({ ok: true, qualityListId, quantities })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown'
    console.error('register-drawing-quality', detail)
    return jsonResponse({ ok: false, message: failureMessage(detail) }, 500)
  }
})
