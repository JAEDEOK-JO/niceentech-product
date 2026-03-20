<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CompanyListView from '@/features/company-list/CompanyListView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { supabase } from '@/lib/supabase'
import { normalizeCompanyType } from '@/constants/companyTypes'
import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)

const rows = ref([])
const managers = ref([])
const loading = ref(false)
const loadingManagers = ref(false)
const saveError = ref('')
const searchText = ref('')
const savingIds = ref([])
const showExpectedOnly = ref(false)

const canManageCompany = computed(() => isAdminRole(profile.value?.role) || isDesignDepartment(profile.value?.department))

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '')

const formatMobilePhoneNumber = (value) => {
  const digits = digitsOnly(value).slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

const formatCompactDateToIso = (value) => {
  const raw = digitsOnly(value)
  if (raw.length !== 8) return ''
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

const formatIsoToCompactDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return 0
  return Number(`${matched[1]}${matched[2]}${matched[3]}`)
}

const normalizeRow = (row) => ({
  id: row.id,
  company: String(row.company ?? '').trim(),
  place: String(row.place ?? '').trim(),
  fullName: String(row.full_name ?? '').trim(),
  totalHeadCount: row.total_head_count == null ? '' : String(row.total_head_count),
  directorName: String(row.director_name ?? '').trim(),
  directorPhone: formatMobilePhoneNumber(row.director_phone),
  siteAddress: String(row.site_address ?? '').trim(),
  companyType: normalizeCompanyType(row.company_type),
  businessRegistrationNumber: String(row.business_registration_number ?? '').trim(),
  registrationMonth: String(row.registration_month ?? '').slice(0, 7),
  startDate: formatCompactDateToIso(row.start_date),
  endDate: formatCompactDateToIso(row.end_date),
  managerId: row.manager_id ? String(row.manager_id) : '',
  originalManagerId: row.manager_id ? String(row.manager_id) : '',
  orderConfirmed: row.order_confirmed == null ? true : Boolean(row.order_confirmed),
  siteCompleted: Boolean(row.site_completed),
})

const syncProductListManager = async ({ companyInfo, managerId }) => {
  const manager = managers.value.find((item) => item.id === managerId) ?? null
  const { error } = await supabase
    .from('product_list')
    .update({
      uid: managerId || null,
      name: manager?.name || '',
    })
    .eq('company_info', companyInfo)

  if (error) {
    return { ok: false, message: `생산계획 담당자 반영 실패: ${error.message}` }
  }

  return { ok: true }
}

const fetchRows = async () => {
  loading.value = true
  saveError.value = ''

  const { data, error } = await supabase
    .from('company_list')
    .select('id,company,place,full_name,total_head_count,director_name,director_phone,site_address,company_type,business_registration_number,registration_month,start_date,end_date,manager_id,order_confirmed,site_completed')
    .order('id', { ascending: false })

  loading.value = false

  if (error) {
    saveError.value = `회사 목록 조회 실패: ${error.message}`
    rows.value = []
    return
  }

  rows.value = (data ?? []).map(normalizeRow)
}

const fetchManagers = async () => {
  loadingManagers.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,department')
    .ilike('department', '%설계%')
    .order('name', { ascending: true })

  loadingManagers.value = false

  if (error) {
    saveError.value = `담당자 목록 조회 실패: ${error.message}`
    return
  }

  managers.value = (data ?? []).map((item) => ({
    id: item.id,
    name: String(item.name ?? '').trim(),
    department: String(item.department ?? '').trim(),
  }))
}

const filteredRows = computed(() => {
  const keywords = String(searchText.value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  const baseRows = showExpectedOnly.value
    ? rows.value.filter((row) => !Boolean(row.orderConfirmed))
    : rows.value

  if (keywords.length === 0) return baseRows

  return baseRows.filter((row) => {
    const target = `${String(row.company ?? '').toLowerCase()} ${String(row.place ?? '').toLowerCase()}`
    return keywords.every((keyword) => target.includes(keyword))
  })
})

const updateRow = (rowId, field, value) => {
  const target = rows.value.find((item) => item.id === rowId)
  if (!target) return

  if (field === 'totalHeadCount') {
    target.totalHeadCount = digitsOnly(value)
    return
  }
  if (field === 'directorPhone') {
    target.directorPhone = formatMobilePhoneNumber(value)
    return
  }
  if (field === 'businessRegistrationNumber') {
    target.businessRegistrationNumber = digitsOnly(value).slice(0, 11)
    return
  }
  if (field === 'companyType') {
    target.companyType = normalizeCompanyType(value)
    return
  }
  if (field === 'orderConfirmed' || field === 'siteCompleted') {
    target[field] = Boolean(value)
    return
  }

  target[field] = String(value ?? '')
}

const saveRow = async (rowId) => {
  saveError.value = ''
  const target = rows.value.find((item) => item.id === rowId)
  if (!target) return
  const managerChanged = target.originalManagerId !== target.managerId

  const company = String(target.company ?? '').trim()
  const place = String(target.place ?? '').trim()
  const fullName = [company, place].filter(Boolean).join(' ')

  if (!company) {
    saveError.value = '회사명을 입력해주세요.'
    return
  }
  if (!place) {
    saveError.value = '현장명을 입력해주세요.'
    return
  }

  savingIds.value = [...savingIds.value, rowId]

  const { data: duplicateRow, error: duplicateError } = await supabase
    .from('company_list')
    .select('id')
    .eq('full_name', fullName)
    .neq('id', rowId)
    .maybeSingle()

  if (duplicateError) {
    savingIds.value = savingIds.value.filter((id) => id !== rowId)
    saveError.value = `중복 확인 실패: ${duplicateError.message}`
    return
  }

  if (duplicateRow?.id) {
    savingIds.value = savingIds.value.filter((id) => id !== rowId)
    saveError.value = '이미 같은 회사명/현장명 조합이 있습니다.'
    return
  }

  const { error } = await supabase
    .from('company_list')
    .update({
      company,
      place,
      full_name: fullName,
      total_head_count: target.totalHeadCount ? Number(target.totalHeadCount) : null,
      director_name: String(target.directorName ?? '').trim() || null,
      director_phone: digitsOnly(target.directorPhone) || null,
      site_address: String(target.siteAddress ?? '').trim() || null,
      company_type: normalizeCompanyType(target.companyType) || null,
      business_registration_number: digitsOnly(target.businessRegistrationNumber) || null,
      registration_month: target.registrationMonth ? `${target.registrationMonth}-01` : null,
      start_date: target.startDate ? formatIsoToCompactDate(target.startDate) : 0,
      end_date: target.endDate ? formatIsoToCompactDate(target.endDate) : 0,
      manager_id: target.managerId || null,
      order_confirmed: Boolean(target.orderConfirmed),
      site_completed: Boolean(target.siteCompleted),
    })
    .eq('id', rowId)

  savingIds.value = savingIds.value.filter((id) => id !== rowId)

  if (error) {
    saveError.value = `회사 저장 실패: ${error.message}`
    return
  }

  if (managerChanged) {
    const syncResult = await syncProductListManager({
      companyInfo: rowId,
      managerId: target.managerId,
    })
    if (!syncResult.ok) {
      saveError.value = syncResult.message
      return
    }
  }

  target.fullName = fullName
  target.originalManagerId = target.managerId
}

const goBack = () => {
  router.push({ name: 'main' })
}

let hasFetchedInitialData = false

watch(
  canManageCompany,
  async (enabled) => {
    if (!enabled || hasFetchedInitialData) return
    hasFetchedInitialData = true
    await Promise.all([fetchRows(), fetchManagers()])
  },
  { immediate: true },
)
</script>

<template>
  <CompanyListView
    v-if="canManageCompany"
    :rows="filteredRows"
    :managers="managers"
    :loading="loading"
    :loading-managers="loadingManagers"
    :save-error="saveError"
    :search-text="searchText"
    :show-expected-only="showExpectedOnly"
    :total-count="filteredRows.length"
    :saving-ids="savingIds"
    @go-back="goBack"
    @refresh="fetchRows"
    @update-search="searchText = $event"
    @toggle-expected-only="showExpectedOnly = !showExpectedOnly"
    @update-row="updateRow"
    @save-row="saveRow"
  />
</template>
