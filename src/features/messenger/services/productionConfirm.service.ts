import { supabase } from '@/lib/supabase'
import type { ConfirmOptionId } from '../utils/productionRequestMessage'
import {
  computeRecheckAt,
  getConfirmOptionLabel,
  isConfirmProgressOption,
} from '../utils/productionRequestMessage'

export async function confirmProductionRequestMessage(input: {
  messageId: string
  optionId: ConfirmOptionId
}) {
  const optionLabel = getConfirmOptionLabel(input.optionId)
  const isProgress = isConfirmProgressOption(input.optionId)
  const status = input.optionId === 'work_done'
    ? 'work_done'
    : input.optionId === 'welding_done'
      ? 'welding_done'
      : 'in_progress'

  const recheckAt = isProgress ? computeRecheckAt(input.optionId) : null

  const { data, error } = await supabase.rpc('confirm_chat_production_request', {
    p_message_id: input.messageId,
    p_option_id: input.optionId,
    p_option_label: optionLabel,
    p_status: status,
    p_recheck_at: recheckAt,
  })

  if (error) return { ok: false as const, reason: error.message }
  return { ok: true as const, data }
}

export async function processDueScheduledMessages() {
  const { data, error } = await supabase.rpc('process_chat_scheduled_messages', { p_limit: 50 })
  if (error) return { ok: false as const, reason: error.message, count: 0 }
  return { ok: true as const, count: Number(data ?? 0) }
}
