import { supabase } from '@/lib/supabase'
import type { AttendanceFormState } from '../types/attendance'

export async function submitGuestRequest(
  userId: string,
  form: AttendanceFormState,
  signatureUrl: string,
): Promise<void> {
  const { error } = await supabase.from('attendance_requests').insert({
    user_id: userId,
    user_name: form.selectedEmployeeName,
    department: form.selectedDepartment,
    leave_type: form.leaveType,
    start_date: form.startDate,
    end_date: form.endDate,
    days_count: form.daysCount,
    reason: form.reason,
    status: '대기중',
    evidence_urls: form.evidenceUrls ?? [],
    signature_url: signatureUrl,
  })

  if (error) throw error
}
