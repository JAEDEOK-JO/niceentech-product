import { onUnmounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { isAdminRole, normalizeWorkMan } from '@/utils/adminAccess'

export function useIssueNotifications(session) {
  const notifications = ref([])
  const completionAlerts = ref([])
  const requestAlerts = ref([])
  const requests = ref([])
  const feedbackMap = ref({})
  const myWorkMan = ref('')
  const myRole = ref('')
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref('')
  let personalNotificationsChannel = null
  let requestsChannel = null
  let feedbacksChannel = null

  const currentUserId = () => session.value?.user?.id ?? null
  const fetchMyWorkMan = async () => {
    const userId = currentUserId()
    if (!userId) {
      myWorkMan.value = ''
      myRole.value = ''
      return
    }

    const { data } = await supabase.from('profiles').select('work_man,role').eq('id', userId).maybeSingle()
    myWorkMan.value = String(data?.work_man ?? '').trim()
    myRole.value = String(data?.role ?? '').trim()
  }

  const fetchUnreadCount = async () => {
    const userId = currentUserId()
    if (!userId) {
      unreadCount.value = 0
      return
    }

    const { count, error: countError } = await supabase
      .from('process_issue_request_notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('recipient_user_id', userId)
      .eq('is_read', false)

    if (countError) {
      unreadCount.value = 0
      return
    }

    unreadCount.value = Number(count ?? 0)
  }

  const fetchNotifications = async () => {
    const userId = currentUserId()
    if (!userId) {
      notifications.value = []
      unreadCount.value = 0
      return
    }

    const { data, error: queryError } = await supabase
      .from('process_issue_request_notifications')
      .select('id,created_at,request_id,recipient_work_man,title,message,notification_kind,is_read,read_at')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })

    if (queryError) {
      notifications.value = []
      return
    }

    notifications.value = data ?? []
    unreadCount.value = notifications.value.filter((item) => !item.is_read).length
    requestAlerts.value = notifications.value.filter((item) => !item.is_read && item.notification_kind === 'request')
    completionAlerts.value = notifications.value.filter((item) => !item.is_read && item.notification_kind === 'completed')
  }

  const fetchRequests = async () => {
    if (!currentUserId()) {
      requests.value = []
      feedbackMap.value = {}
      return
    }

    loading.value = true
    error.value = ''

    const { data, error: queryError } = await supabase
      .from('process_issue_requests')
      .select(
        'id,created_at,request_type,request_status,request_message,requester_user_id,requester_name,requester_work_man,assigned_user_id,assigned_name,assigned_work_man,company,place,area,test_date',
      )
      .order('created_at', { ascending: false })

    if (queryError) {
      loading.value = false
      requests.value = []
      feedbackMap.value = {}
      error.value = `요청 조회 실패: ${queryError.message}`
      return
    }

    requests.value = data ?? []
    await fetchFeedbacks()
    loading.value = false
  }

  const fetchFeedbacks = async () => {
    const requestIds = requests.value.map((item) => item.id).filter(Boolean)
    if (requestIds.length === 0) {
      feedbackMap.value = {}
      return
    }

    const { data, error: queryError } = await supabase
      .from('process_issue_request_feedbacks')
      .select('id,created_at,request_id,author_user_id,author_name,author_work_man,message,is_admin_reply')
      .in('request_id', requestIds)
      .order('created_at', { ascending: true })

    if (queryError) {
      feedbackMap.value = {}
      return
    }

    const nextMap = {}
    for (const requestId of requestIds) nextMap[requestId] = []
    for (const row of data ?? []) {
      if (!nextMap[row.request_id]) nextMap[row.request_id] = []
      nextMap[row.request_id].push(row)
    }
    feedbackMap.value = nextMap
  }

  const markAsRead = async ({ notificationId }) => {
    const userId = currentUserId()
    if (!userId || !notificationId) return { ok: false, reason: 'invalid_input' }

    const { error: updateError } = await supabase
      .from('process_issue_request_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('recipient_user_id', userId)

    if (updateError) return { ok: false, reason: 'db_error' }

    notifications.value = notifications.value.map((item) =>
      item.id === notificationId ? { ...item, is_read: true, read_at: new Date().toISOString() } : item,
    )
    requestAlerts.value = requestAlerts.value.filter((item) => item.id !== notificationId)
    completionAlerts.value = completionAlerts.value.filter((item) => item.id !== notificationId)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    return { ok: true }
  }

  const markAllAsRead = async () => {
    const userId = currentUserId()
    if (!userId) return { ok: false, reason: 'invalid_input' }

    const { error: updateError } = await supabase
      .from('process_issue_request_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('recipient_user_id', userId)
      .eq('is_read', false)

    if (updateError) return { ok: false, reason: 'db_error' }

    notifications.value = notifications.value.map((item) => ({
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    }))
    requestAlerts.value = []
    completionAlerts.value = []
    unreadCount.value = 0
    return { ok: true }
  }

  const canReplyRequest = ({ request, profile }) => {
    const userId = currentUserId()
    if (!userId || !request) return false
    const profileWorkMan = String(profile?.work_man ?? '').trim()
    const profileRole = String(profile?.role ?? '').trim()
    const effectiveWorkMan = profileWorkMan || myWorkMan.value
    const effectiveRole = profileRole || myRole.value
    if (isAdminRole(effectiveRole)) return true
    if (request.assigned_user_id === userId) return true

    const normalizedMyWorkMan = normalizeWorkMan(effectiveWorkMan)
    const normalizedRequester = normalizeWorkMan(request.requester_work_man)
    const normalizedAssignee = normalizeWorkMan(request.assigned_work_man)
    if (normalizedMyWorkMan && normalizedMyWorkMan === normalizedRequester) return true
    if (normalizedMyWorkMan && normalizedMyWorkMan === normalizedAssignee) return true

    return false
  }

  const canDeleteRequest = ({ request, profile }) => {
    const userId = currentUserId()
    if (!userId || !request) return false
    const profileRole = String(profile?.role ?? '').trim()
    const effectiveRole = profileRole || myRole.value
    if (isAdminRole(effectiveRole)) return true
    return request.requester_user_id === userId
  }

  const addFeedback = async ({ requestId, message, profile }) => {
    const userId = currentUserId()
    const safeMessage = String(message ?? '').trim()
    if (!userId || !requestId || !safeMessage) return { ok: false, reason: 'invalid_input' }

    const request = requests.value.find((item) => item.id === requestId)
    if (!request) return { ok: false, reason: 'not_found' }
    if (!canReplyRequest({ request, profile })) return { ok: false, reason: 'unauthorized' }

    const authorName = String(profile?.name ?? '').trim() || '이름없음'
    const authorPosition = String(profile?.position ?? '').trim() || '-'
    const effectiveRole = String(profile?.role ?? '').trim() || myRole.value
    const isAdminReply = isAdminRole(effectiveRole)

    const { data, error: insertError } = await supabase
      .from('process_issue_request_feedbacks')
      .insert({
        request_id: requestId,
        author_user_id: userId,
        author_name: authorName,
        author_work_man: authorPosition,
        message: safeMessage,
        is_admin_reply: isAdminReply,
      })
      .select('id,created_at,request_id,author_user_id,author_name,author_work_man,message,is_admin_reply')
      .single()

    if (insertError) return { ok: false, reason: 'db_error' }

    const current = feedbackMap.value[requestId] ?? []
    feedbackMap.value = {
      ...feedbackMap.value,
      [requestId]: [...current, data],
    }
    return { ok: true }
  }

  const markRequestCompleted = async ({ requestId, profile, message }) => {
    const userId = currentUserId()
    if (!userId || !requestId) return { ok: false, reason: 'invalid_input' }

    const request = requests.value.find((item) => item.id === requestId)
    if (!request) return { ok: false, reason: 'not_found' }
    if (!canReplyRequest({ request, profile })) return { ok: false, reason: 'unauthorized' }

    const safeMessage = String(message ?? '').trim()
    if (safeMessage) {
      const feedbackResult = await addFeedback({
        requestId,
        message: safeMessage,
        profile,
      })
      if (!feedbackResult.ok) return feedbackResult
    }

    const { error: updateError } = await supabase
      .from('process_issue_requests')
      .update({
        request_status: '처리완료',
        resolved_at: new Date().toISOString(),
        resolved_by_user_id: userId,
      })
      .eq('id', requestId)

    if (updateError) return { ok: false, reason: 'db_error' }

    requests.value = requests.value.map((item) =>
      item.id === requestId ? { ...item, request_status: '처리완료' } : item,
    )

    const actorName = String(profile?.name ?? '').trim() || '담당자'
    const actorPosition = String(profile?.position ?? '').trim()
    const actorLabel = actorPosition ? `${actorName}(${actorPosition})` : actorName
    const title = `[완료알림] ${request.company || '-'} / ${request.place || '-'} / ${request.area || '-'}`
    const latestFeedback = (feedbackMap.value[requestId] ?? []).at(-1)
    const latestFeedbackLine = latestFeedback?.message ? `최근 답변: ${latestFeedback.message}` : '최근 답변: 없음'
    const completionMessage = [
      `${actorLabel}님이 요청을 완료 처리했습니다.`,
      `검수날짜: ${request.test_date || '-'}`,
      `요청유형: ${request.request_type || '-'}`,
      `요청내용: ${request.request_message || '-'}`,
      latestFeedbackLine,
    ].join('\n')
    const requesterWorkMan = String(request.requester_work_man ?? '').trim()

    const recipientUsers = []
    if (request.requester_user_id) {
      recipientUsers.push({
        id: request.requester_user_id,
        workMan: requesterWorkMan || '-',
      })
    }

    if (requesterWorkMan) {
      const { data: sameLineProfiles } = await supabase
        .from('profiles')
        .select('id,work_man,activate')
        .eq('activate', true)
        .eq('work_man', requesterWorkMan)

      for (const row of sameLineProfiles ?? []) {
        if (!row?.id) continue
        if (row.id === userId) continue
        if (recipientUsers.some((u) => u.id === row.id)) continue
        recipientUsers.push({
          id: row.id,
          workMan: String(row.work_man ?? '').trim() || '-',
        })
      }
    }

    if (request.requester_user_id === userId) {
      const idx = recipientUsers.findIndex((u) => u.id === userId)
      if (idx >= 0) recipientUsers.splice(idx, 1)
    }

    if (recipientUsers.length > 0) {
      await supabase.from('process_issue_request_notifications').upsert(
        recipientUsers.map((u) => ({
          request_id: requestId,
          recipient_user_id: u.id,
          recipient_work_man: u.workMan,
          title,
          message: completionMessage,
          notification_kind: 'completed',
          is_read: false,
        })),
        { onConflict: 'request_id,recipient_user_id,notification_kind' },
      )
    }

    // 관리자 계정은 모든 완료알림을 받을 수 있게 추가 전파
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id,role,work_man,activate')
      .eq('activate', true)

    const admins = (adminProfiles ?? []).filter((row) => isAdminRole(row?.role))
    const adminTargets = admins
      .filter((a) => a?.id && a.id !== userId)
      .map((a) => ({
        request_id: requestId,
        recipient_user_id: a.id,
        recipient_work_man: String(a.work_man ?? '').trim() || '-',
        title,
        message: completionMessage,
        notification_kind: 'completed',
        is_read: false,
      }))
    if (adminTargets.length > 0) {
      await supabase.from('process_issue_request_notifications').upsert(
        adminTargets,
        { onConflict: 'request_id,recipient_user_id,notification_kind' },
      )
    }
    return { ok: true }
  }

  const dismissCompletionAlert = async ({ notificationId }) => {
    return markAsRead({ notificationId })
  }

  const deleteRequest = async ({ requestId, profile }) => {
    const userId = currentUserId()
    if (!userId || !requestId) return { ok: false, reason: 'invalid_input' }

    const request = requests.value.find((item) => item.id === requestId)
    if (!request) return { ok: false, reason: 'not_found' }
    if (!canDeleteRequest({ request, profile })) return { ok: false, reason: 'unauthorized' }

    const { error: deleteError } = await supabase
      .from('process_issue_requests')
      .delete()
      .eq('id', requestId)

    if (deleteError) return { ok: false, reason: 'db_error' }

    requests.value = requests.value.filter((item) => item.id !== requestId)
    const nextMap = { ...feedbackMap.value }
    delete nextMap[requestId]
    feedbackMap.value = nextMap
    return { ok: true }
  }

  const setupRealtime = () => {
    personalNotificationsChannel?.unsubscribe()
    requestsChannel?.unsubscribe()
    feedbacksChannel?.unsubscribe()
    personalNotificationsChannel = null
    requestsChannel = null
    feedbacksChannel = null

    const userId = currentUserId()
    if (!userId) return

    personalNotificationsChannel = supabase
      .channel(`issue-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'process_issue_request_notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        async () => {
          await fetchUnreadCount()
          await fetchNotifications()
        },
      )
      .subscribe()

    requestsChannel = supabase
      .channel('issue-requests-public')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'process_issue_requests' },
        async () => {
          await fetchRequests()
        },
      )
      .subscribe()

    feedbacksChannel = supabase
      .channel('issue-feedbacks-public')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'process_issue_request_feedbacks' },
        async () => {
          await fetchFeedbacks()
        },
      )
      .subscribe()
  }

  watch(
    session,
    async () => {
      await fetchMyWorkMan()
      await fetchUnreadCount()
      await fetchNotifications()
      await fetchRequests()
      setupRealtime()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    personalNotificationsChannel?.unsubscribe()
    requestsChannel?.unsubscribe()
    feedbacksChannel?.unsubscribe()
  })

  return {
    notifications,
    requestAlerts,
    completionAlerts,
    requests,
    feedbackMap,
    unreadCount,
    loading,
    error,
    fetchUnreadCount,
    fetchNotifications,
    fetchRequests,
    markAsRead,
    markAllAsRead,
    addFeedback,
    canReplyRequest,
    canDeleteRequest,
    markRequestCompleted,
    deleteRequest,
    dismissCompletionAlert,
  }
}
