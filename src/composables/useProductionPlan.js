import { computed, onUnmounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list_test'
const workTypeGroups = ['용접/무용접', '전실/입상', '나사', '기타']
const stageToField = {
  marking_weld_a: 'marking_weld_a_status',
  marking_weld_b: 'marking_weld_b_status',
  marking_laser_1: 'marking_laser_1_status',
  marking_laser_2: 'marking_laser_2_status',
  nasa: 'nasa_status',
  beveling: 'beveling_status',
  main_work: 'main_status',
}
const stageToDateFields = {
  marking_weld_a: { started: 'marking_weld_a_started_on', completed: 'marking_weld_a_completed_on' },
  marking_weld_b: { started: 'marking_weld_b_started_on', completed: 'marking_weld_b_completed_on' },
  marking_laser_1: { started: 'marking_laser_1_started_on', completed: 'marking_laser_1_completed_on' },
  marking_laser_2: { started: 'marking_laser_2_started_on', completed: 'marking_laser_2_completed_on' },
  beveling: { started: 'beveling_started_on', completed: 'beveling_completed_on' },
  main_work: { started: 'main_started_on', completed: 'main_completed_on' },
  nasa: { started: 'nasa_started_on', completed: 'nasa_completed_on' },
}
const workerTStageFields = [
  'marking_weld_a_status',
  'marking_weld_b_status',
  'marking_laser_1_status',
  'marking_laser_2_status',
  'beveling_status',
  'nasa_status',
]
const mainStageField = 'main_status'
const workManRoleToStages = {
  마킹1: ['marking_weld_a'],
  마킹2: ['marking_weld_b'],
  레이저1: ['marking_laser_1'],
  레이저2: ['marking_laser_2'],
  무용접: ['nasa'],
  '티&면치': ['beveling'],
  메인: ['main_work'],
  관리자: ['*'],
  전체: ['*'],
}
const statusCycle = {
  없음: '작업중',
  작업전: '작업중',
  작업중: '작업완료',
  작업완료: '없음',
}
const LONG_PRESS_REQUIRED_MS = 700

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}
const formatMonthDay = (date = new Date()) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}.${day}`
}
const formatIsoDate = (date = new Date()) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getRowsTotals = (rows) =>
  rows.reduce(
    (acc, row) => {
      acc.hole += toNumber(row.hole)
      acc.head += toNumber(row.head)
      acc.groove += toNumber(row.groove)
      acc.weight += toNumber(row.weight)
      return acc
    },
    { hole: 0, head: 0, groove: 0, weight: 0 },
  )

const normalizeWorkType = (value) => {
  const text = String(value ?? '').trim()
  if (text === '용접/무용접' || text === '전실/입상' || text === '나사') return text
  return '기타'
}

const normalizeStatus = (value) => {
  const text = String(value ?? '').trim()
  if (text.includes('작업중')) return '작업중'
  if (text.includes('작업완료')) return '작업완료'
  if (!text || text === '없음' || text === '작업전') return '없음'
  return '작업전'
}
const normalizeProgressState = (value) => {
  const text = String(value ?? '').trim()
  if (text.includes('작업중')) return '작업중'
  if (text.includes('작업완료')) return '작업완료'
  return '작업전'
}
const resolveWorkerTStatus = (row) => {
  const statuses = workerTStageFields.map((field) => normalizeProgressState(row?.[field]))
  if (statuses.some((status) => status === '작업중')) return '작업중'
  if (statuses.every((status) => status === '작업완료')) return '작업완료'
  return '없음'
}
const resolveWorkerMainStatus = (row) => {
  const status = normalizeProgressState(row?.[mainStageField])
  if (status === '작업중') return '작업중'
  if (status === '작업완료') return '작업완료'
  return '없음'
}

const isActualDistributedRow = (row) => String(row?.drawing_date ?? '').trim().length > 0
const isVirtualDistributedRow = (row) =>
  !isActualDistributedRow(row) && Boolean(row?.virtual_drawing_distributed)
const isDistributedRow = (row) => isActualDistributedRow(row) || isVirtualDistributedRow(row)
const isCompletedRow = (row) => Boolean(row?.complete)

const sortRowsByPriority = (rows) => {
  return [...rows].sort((a, b) => {
    const rank = (row) => {
      const distributed = isActualDistributedRow(row)
      const virtualDistributed = isVirtualDistributedRow(row)
      const completed = isCompletedRow(row)
      // 0: 실배포 도면, 1: 가상배포 도면, 2: 완료 도면, 3: 미배포 도면
      if (distributed && !completed) return 0
      if (virtualDistributed && !completed) return 1
      if (completed) return 2
      return 3
    }

    const aRank = rank(a)
    const bRank = rank(b)
    if (aRank !== bRank) return aRank - bRank

    const aNo = Number(a?.no ?? 1000)
    const bNo = Number(b?.no ?? 1000)
    return aNo - bNo
  })
}

const normalizeWorkMan = (value) => String(value ?? '').replaceAll(' ', '').trim()
const isAdminWorkMan = (workMan) => {
  const normalized = normalizeWorkMan(workMan)
  return normalized.includes(normalizeWorkMan('관리자')) || normalized.includes(normalizeWorkMan('전체'))
}
const normalizeCallType = (value) => String(value ?? '').replaceAll(' ', '').trim()
const resolveIssueRequestType = (callType) => {
  const normalized = normalizeCallType(callType)
  if (!normalized) return null
  if (normalized.includes('도면없음')) return '도면없음'
  if (normalized.includes('증지없음')) return '증지없음'
  return '확인요망'
}
const canControlStage = (workMan, stageKey) => {
  const normalized = normalizeWorkMan(workMan)
  if (!normalized || normalized === '없음') return false

  for (const [role, stages] of Object.entries(workManRoleToStages)) {
    if (!normalized.includes(normalizeWorkMan(role))) continue
    if (stages.includes('*')) return true
    if (stages.includes(stageKey)) return true
  }

  return false
}

export function useProductionPlan(session) {
  const weekOffset = ref(0)
  const planRows = ref([])
  const assigneeUsers = ref([])
  const planLoading = ref(false)
  const planError = ref('')
  const searchText = ref('')
  const searchAllDates = ref(false)
  const realtimeConnected = ref(false)
  let productListChannel = null

  const baseTuesday = () => {
    const now = new Date()
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    base.setDate(base.getDate() + daysUntilTuesday)
    return base
  }

  const selectedTuesday = computed(() => {
    const tuesday = new Date(baseTuesday())
    tuesday.setDate(tuesday.getDate() + weekOffset.value * 7)
    return tuesday
  })

  const formatKoreanDate = (date) => {
    const y = String(date.getFullYear()).padStart(4, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}년 ${m}월 ${d}일`
  }

  const pageTitle = computed(() => `${formatKoreanDate(selectedTuesday.value)} 생산계획표`)
  const filterDate = computed(() => formatKoreanDate(selectedTuesday.value))

  const normalizedSearchTerms = computed(() =>
    String(searchText.value ?? '')
      .trim()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean),
  )

  const moveWeek = (delta) => {
    weekOffset.value += delta
  }

  const resetWeek = () => {
    weekOffset.value = 0
  }

  const fetchPlanRows = async ({ silent = false } = {}) => {
    if (!session.value) return

    if (!silent) planLoading.value = true
    planError.value = ''

    const baseColumns =
      'id,no,initial,company,place,area,memo,full_text,work_type,hole,head,groove,weight,name,test_date,drawing_date,delay_time,delay_text,complete,complete_date,worker_t,worker_t_time,worker_main,worker_main_time,marking_weld_a_status,marking_weld_a_started_on,marking_weld_a_completed_on,marking_weld_b_status,marking_weld_b_started_on,marking_weld_b_completed_on,marking_laser_1_status,marking_laser_1_started_on,marking_laser_1_completed_on,marking_laser_2_status,marking_laser_2_started_on,marking_laser_2_completed_on,cutting_status,beveling_status,beveling_started_on,beveling_completed_on,main_status,main_started_on,main_completed_on,nasa_status,nasa_started_on,nasa_completed_on'
    const withVirtualColumns = `${baseColumns},virtual_drawing_distributed`
    const runQuery = (columns) => {
      let query = supabase.from(PRODUCT_LIST_TABLE).select(columns)
      if (!searchAllDates.value) {
        query = query.eq('test_date', filterDate.value)
      }
      for (const term of normalizedSearchTerms.value) {
        query = query.ilike('full_text', `%${term}%`)
      }
      return query.order('no', { ascending: true })
    }

    let { data, error } = await runQuery(withVirtualColumns)
    if (error && String(error.message ?? '').includes('virtual_drawing_distributed')) {
      ;({ data, error } = await runQuery(baseColumns))
    }

    if (!silent) planLoading.value = false

    if (error) {
      planRows.value = []
      planError.value = `데이터 조회 실패: ${error.message}`
      return
    }

    planRows.value = data ?? []
  }

  const fetchAssigneeUsers = async () => {
    if (!session.value) {
      assigneeUsers.value = []
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,name,position,work_man,activate')
      .eq('activate', true)
      .order('name', { ascending: true })

    if (error) {
      assigneeUsers.value = []
      return
    }

    assigneeUsers.value = (data ?? [])
      .map((user) => ({
        id: user.id,
        name: String(user.name ?? '').trim() || '이름없음',
        position: String(user.position ?? '').trim() || '-',
        workMan: String(user.work_man ?? '').trim() || '없음',
      }))
      .filter((user) => !!user.id)
  }

  const groupedRows = computed(() => {
    const map = {
      '용접/무용접': [],
      '전실/입상': [],
      나사: [],
      기타: [],
    }

    for (const row of planRows.value) {
      const key = normalizeWorkType(row.work_type)
      map[key].push(row)
    }

    return workTypeGroups.map((group) => {
      const sortedRows = sortRowsByPriority(map[group])
      const indexedRows = sortedRows.map((row, index) => ({
        ...row,
        no: index + 1,
      }))

      return {
        group,
        groupKey: group,
        rows: indexedRows,
        totals: getRowsTotals(map[group]),
      }
    })
  })

  const totals = computed(() => getRowsTotals(planRows.value))

  const toggleWorkStatus = async ({ rowId, stageKey, workMan, longPressMs = 0 }) => {
    const field = stageToField[stageKey]
    const dateFields = stageToDateFields[stageKey]
    if (!field) return { ok: false, reason: 'invalid_stage' }

    if (!canControlStage(workMan, stageKey)) return { ok: false, reason: 'unauthorized' }

    const idx = planRows.value.findIndex((r) => r.id === rowId)
    if (idx < 0) return { ok: false, reason: 'not_found' }

    const row = planRows.value[idx]
    const current = normalizeStatus(row[field])
    if (current === '작업완료' && longPressMs < LONG_PRESS_REQUIRED_MS) {
      return { ok: false, reason: 'long_press_required' }
    }
    const next = statusCycle[current]

    const nextRow = { ...row, [field]: next }
    const worker_t = resolveWorkerTStatus(nextRow)
    const worker_main = resolveWorkerMainStatus(nextRow)
    const updatePayload = { [field]: next, worker_t, worker_main }
    const todayText = formatMonthDay(new Date())
    const todayDate = formatIsoDate(new Date())
    if (dateFields) {
      if (next === '작업중') {
        updatePayload[dateFields.started] = todayDate
        updatePayload[dateFields.completed] = null
      } else if (next === '작업완료') {
        updatePayload[dateFields.started] = row?.[dateFields.started] || todayDate
        updatePayload[dateFields.completed] = todayDate
      } else if (next === '없음') {
        updatePayload[dateFields.started] = null
        updatePayload[dateFields.completed] = null
      }
    }
    if (worker_t === '작업완료' && row.worker_t !== '작업완료') {
      updatePayload.worker_t_time = todayText
    }
    if (worker_t !== '작업완료' && row.worker_t === '작업완료') {
      updatePayload.worker_t_time = ''
    }
    if (worker_main === '작업완료' && row.worker_main !== '작업완료') {
      updatePayload.worker_main_time = todayText
    }
    if (worker_main !== '작업완료' && row.worker_main === '작업완료') {
      updatePayload.worker_main_time = ''
    }

    const { error } = await supabase
      .from(PRODUCT_LIST_TABLE)
      .update(updatePayload)
      .eq('id', rowId)

    if (error) {
      planError.value = `상태 변경 실패: ${error.message}`
      return { ok: false, reason: 'db_error' }
    }

    const updated = [...planRows.value]
    updated[idx] = { ...row, ...updatePayload }
    planRows.value = updated
    return { ok: true }
  }

  const reorderByNo = async ({ sourceRowId, targetRowId, workMan }) => {
    if (!session.value) return { ok: false, reason: 'no_session' }
    if (sourceRowId === targetRowId) return { ok: false, reason: 'same_row' }
    if (!isAdminWorkMan(workMan)) return { ok: false, reason: 'unauthorized' }

    const source = planRows.value.find((r) => r.id === sourceRowId)
    const target = planRows.value.find((r) => r.id === targetRowId)
    if (!source || !target) return { ok: false, reason: 'not_found' }

    const sourceGroup = normalizeWorkType(source.work_type)
    const targetGroup = normalizeWorkType(target.work_type)
    if (sourceGroup !== targetGroup) {
      return { ok: false, reason: 'cross_group_not_allowed' }
    }

    const groupRows = sortRowsByPriority(
      planRows.value.filter((r) => normalizeWorkType(r.work_type) === sourceGroup),
    )
    const from = groupRows.findIndex((r) => r.id === sourceRowId)
    const to = groupRows.findIndex((r) => r.id === targetRowId)
    if (from < 0 || to < 0) return { ok: false, reason: 'not_found' }

    const reordered = [...groupRows]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    const updates = reordered.map((row, index) => ({
      id: row.id,
      no: 1000 + index,
    }))

    const { error } = await supabase.from(PRODUCT_LIST_TABLE).upsert(updates, { onConflict: 'id' })
    if (error) {
      planError.value = `정렬 저장 실패: ${error.message}`
      return { ok: false, reason: 'db_error' }
    }

    const nextRows = [...planRows.value]
    for (const u of updates) {
      const i = nextRows.findIndex((r) => r.id === u.id)
      if (i >= 0) nextRows[i] = { ...nextRows[i], no: u.no }
    }
    planRows.value = nextRows
    return { ok: true }
  }

  const createIssueRequestFromMenu = async ({ row, callType, delayText, requester }) => {
    const requestType = resolveIssueRequestType(callType)
    if (!requestType) return { ok: true, skipped: true }
    if (assigneeUsers.value.length === 0) {
      await fetchAssigneeUsers()
    }

    const requesterUserId = requester?.id ?? session.value?.user?.id ?? null
    const requesterName = String(requester?.name ?? '').trim()
    const requesterPosition = String(requester?.position ?? '').trim()
    const requesterLine = String(requester?.workMan ?? '').trim()
    const requesterLabel = requesterPosition || requesterLine || '-'
    const company = String(row?.company ?? '').trim()
    const place = String(row?.place ?? '').trim()
    const area = String(row?.area ?? '').trim()
    const testDate = String(row?.test_date ?? '').trim()
    const reason = String(delayText ?? '').trim()

    const rowAssigneeName = String(row?.name ?? '').trim()
    const assignedUser = assigneeUsers.value.find((user) => user.name === rowAssigneeName)
    if (!assignedUser?.id) return { ok: false, reason: 'assignee_not_found' }

    const assignedLabel = String(assignedUser.position ?? '').trim() || String(assignedUser.workMan ?? '').trim() || '-'
    const targetWorkMans = [String(assignedUser.workMan ?? '').trim() || assignedLabel]

    const requestMessage = reason || `${callType} 요청`
    const { data: insertedRequest, error: requestError } = await supabase
      .from('process_issue_requests')
      .insert({
        product_list_id: row.id,
        request_type: requestType,
        request_status: '요청',
        request_message: requestMessage,
        requester_user_id: requesterUserId,
        requester_name: requesterName,
        requester_work_man: requesterLabel,
        assigned_user_id: assignedUser.id,
        assigned_name: assignedUser.name,
        assigned_work_man: assignedLabel,
        target_work_mans: targetWorkMans,
        company,
        place,
        area,
        test_date: testDate,
        is_urgent: false,
      })
      .select('id')
      .single()

    if (requestError) {
      planError.value = `요청 저장 실패: ${requestError.message}`
      return { ok: false, reason: 'db_error' }
    }

    const title = `[${requestType}] ${company || '-'} / ${place || '-'} / ${area || '-'}`
    const detailParts = [`${requesterName}(${requesterLabel}) 요청`, `검수날짜 ${testDate || '-'}`, `요청유형 ${requestType}`]
    if (reason) detailParts.push(`사유 ${reason}`)
    const message = detailParts.join(' · ')

    const notifications = [
      {
        request_id: insertedRequest.id,
        recipient_user_id: assignedUser.id,
        recipient_work_man: assignedLabel,
        title,
        message,
        notification_kind: 'request',
        is_read: false,
      },
    ]

    const adminRecipients = assigneeUsers.value.filter((user) =>
      normalizeWorkMan(user.workMan).includes(normalizeWorkMan('관리자')),
    )
    for (const admin of adminRecipients) {
      if (notifications.some((item) => item.recipient_user_id === admin.id)) continue
      notifications.push({
        request_id: insertedRequest.id,
        recipient_user_id: admin.id,
        recipient_work_man: admin.workMan,
        title: `[관리자확인] ${title}`,
        message,
        notification_kind: 'request',
        is_read: false,
      })
    }

    const { error: notifyError } = await supabase
      .from('process_issue_request_notifications')
      .upsert(notifications, { onConflict: 'request_id,recipient_user_id,notification_kind' })

    if (notifyError) {
      planError.value = `알림 생성 실패: ${notifyError.message}`
      return { ok: false, reason: 'db_error' }
    }

    return { ok: true, requestId: insertedRequest.id }
  }

  const updateRowMenu = async ({
    rowId,
    delayText,
    delayTime,
    callType,
    requester,
    complete,
    virtualDrawingDistributed,
  }) => {
    const updatePayload = {}
    let safeDelayText = ''

    if (delayText !== undefined) {
      safeDelayText = String(delayText ?? '').trim()
      updatePayload.delay_text = safeDelayText
    }

    if (delayTime !== undefined) {
      const safeDelayMinutes = Math.max(0, Number(delayTime) || 0)
      updatePayload.delay_time = Math.floor(safeDelayMinutes * 60)
    }

    if (typeof virtualDrawingDistributed === 'boolean') {
      updatePayload.virtual_drawing_distributed = virtualDrawingDistributed
    }
    if (typeof complete === 'boolean') {
      updatePayload.complete = complete
      updatePayload.complete_date = complete ? formatMonthDay(new Date()) : ''
    }

    if (Object.keys(updatePayload).length === 0) {
      return { ok: true }
    }

    const { error } = await supabase
      .from(PRODUCT_LIST_TABLE)
      .update(updatePayload)
      .eq('id', rowId)

    if (error) {
      if (
        typeof virtualDrawingDistributed === 'boolean' &&
        String(error.message ?? '').includes('virtual_drawing_distributed')
      ) {
        planError.value = '가상도면배포 컬럼이 없습니다. DB 컬럼 추가가 필요합니다.'
        return { ok: false, reason: 'virtual_column_missing' }
      }
      planError.value = `메뉴 저장 실패: ${error.message}`
      return { ok: false, reason: 'db_error' }
    }

    const idx = planRows.value.findIndex((r) => r.id === rowId)
    let targetRow = null
    if (idx >= 0) {
      const nextRows = [...planRows.value]
      nextRows[idx] = {
        ...nextRows[idx],
        ...(delayText !== undefined ? { delay_text: updatePayload.delay_text } : {}),
        ...(delayTime !== undefined ? { delay_time: updatePayload.delay_time } : {}),
        ...(typeof virtualDrawingDistributed === 'boolean'
          ? { virtual_drawing_distributed: virtualDrawingDistributed }
          : {}),
        ...(typeof complete === 'boolean' ? { complete } : {}),
        ...(typeof complete === 'boolean' ? { complete_date: updatePayload.complete_date } : {}),
      }
      targetRow = nextRows[idx]
      planRows.value = nextRows
    }

    if (targetRow && callType) {
      const issueResult = await createIssueRequestFromMenu({
        row: targetRow,
        callType,
        delayText:
          delayText !== undefined
            ? safeDelayText
            : String(targetRow?.delay_text ?? '').trim(),
        requester,
      })
      if (!issueResult.ok) return issueResult
    }

    return { ok: true }
  }

  const fetchDrawingFiles = async ({ rowId }) => {
    if (!rowId) return { ok: false, reason: 'invalid_row' }

    const { data, error } = await supabase
      .from('drawing_pdf')
      .select('id,name,url,storage_url,nas_path,created_at')
      .eq('product_list_id', rowId)
      .order('created_at', { ascending: false })

    if (error) {
      planError.value = `도면 조회 실패: ${error.message}`
      return { ok: false, reason: 'db_error', files: [] }
    }

    const files = (data ?? []).map((item) => ({
      id: item.id,
      name: String(item.name ?? '').trim() || `도면-${item.id}`,
      viewUrl: String(item.storage_url ?? item.url ?? '').trim(),
      rawPath: String(item.nas_path ?? '').trim(),
      createdAt: item.created_at,
    }))

    return { ok: true, files }
  }

  const setupRealtime = () => {
    productListChannel?.unsubscribe()
    productListChannel = null
    realtimeConnected.value = false

    if (!session.value) return

    productListChannel = supabase
      .channel('product-list-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: PRODUCT_LIST_TABLE },
        async () => {
          await fetchPlanRows({ silent: true })
        },
      )
      .subscribe((status) => {
        realtimeConnected.value = status === 'SUBSCRIBED'
      })
  }

  watch([session, selectedTuesday], async () => {
    await fetchPlanRows()
  })

  watch([searchText, searchAllDates], async () => {
    await fetchPlanRows()
  })

  watch(
    session,
    async () => {
      await fetchAssigneeUsers()
      setupRealtime()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    productListChannel?.unsubscribe()
  })

  return {
    weekOffset,
    planRows,
    assigneeUsers,
    planLoading,
    planError,
    searchText,
    searchAllDates,
    realtimeConnected,
    pageTitle,
    filterDate,
    selectedTuesday,
    moveWeek,
    resetWeek,
    groupedRows,
    totals,
    toggleWorkStatus,
    reorderByNo,
    updateRowMenu,
    fetchDrawingFiles,
    isDistributedRow,
    LONG_PRESS_REQUIRED_MS,
  }
}
