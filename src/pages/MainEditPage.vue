<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainRegisterView from '@/features/main-register/MainRegisterView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { supabase } from '@/lib/supabase'
import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

const route = useRoute()
const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)

const companySearchText = ref('')
const companySearchLoading = ref(false)
const companyDialogOpen = ref(false)
const companySearchResults = ref([])
const pageLoading = ref(true)
const saving = ref(false)
const saveError = ref('')
const targetDateLabel = ref('')
const targetDateIso = ref('')

const canRegisterCompany = computed(() => isAdminRole(profile.value?.role) || isDesignDepartment(profile.value?.department))
const rowId = computed(() => String(route.params.id ?? '').trim())

const form = reactive({
  companyInfo: null,
  uid: '',
  name: '',
  company: '',
  place: '',
  area: '',
  initial: '',
  deliveryDueDate: '',
  head: '',
  hole: '',
  groove: '',
  weight: '',
  memo: '',
  isTest: true,
  workType: '용접/무용접',
})

const parseKoreanDateLabel = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})년 (\d{2})월 (\d{2})일$/)
  if (!matched) return ''
  const [, year, month, day] = matched
  return `${year}-${month}-${day}`
}

const formatKoreanDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return ''
  const [, year, month, day] = matched
  return `${year}년 ${month}월 ${day}일`
}

const sanitizeInteger = (value) => String(value ?? '').replace(/\D/g, '')

const sanitizeWeight = (value) => {
  const raw = String(value ?? '').replace(/[^\d.]/g, '')
  const [integerPart = '', decimalPart = ''] = raw.split('.')
  return decimalPart ? `${integerPart}.${decimalPart.slice(0, 1)}` : integerPart
}

const updateForm = (field, value) => {
  if (field === 'head' || field === 'hole' || field === 'groove') {
    form[field] = sanitizeInteger(value)
    return
  }
  if (field === 'weight') {
    form.weight = sanitizeWeight(value)
    return
  }
  if (field === 'isTest') {
    form.isTest = Boolean(value)
    return
  }
  form[field] = String(value ?? '')
}

const allowedControlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End', 'Enter']

const handleNumericKeydown = (event) => {
  if (event.ctrlKey || event.metaKey) return
  if (allowedControlKeys.includes(event.key)) return
  if (/^\d$/.test(event.key)) return
  event.preventDefault()
}

const handleWeightKeydown = (event) => {
  if (event.ctrlKey || event.metaKey) return
  if (allowedControlKeys.includes(event.key)) return
  if (/^\d$/.test(event.key)) return
  if (event.key === '.' && !String(event.target?.value ?? '').includes('.')) return
  event.preventDefault()
}

const goBack = () => {
  router.push({
    name: 'main',
    query: {
      date: typeof route.query.date === 'string' ? route.query.date : targetDateIso.value || undefined,
      q: typeof route.query.q === 'string' ? route.query.q : undefined,
    },
  })
}

const goCompanyRegister = () => {
  router.push({
    name: 'company-register',
    query: {
      returnTo: 'main-edit',
      id: rowId.value,
      date: typeof route.query.date === 'string' ? route.query.date : targetDateIso.value || undefined,
      q: typeof route.query.q === 'string' ? route.query.q : undefined,
      companySearch: String(companySearchText.value ?? '').trim() || undefined,
    },
  })
}

const searchCompanies = async () => {
  const term = String(companySearchText.value ?? '').trim()
  if (!term) return

  saveError.value = ''
  companySearchLoading.value = true
  companyDialogOpen.value = true
  companySearchResults.value = []

  const { data, error } = await supabase
    .from('company_list')
    .select('id,company,place,full_name,manager_id')
    .ilike('full_name', `%${term}%`)
    .order('full_name', { ascending: true })
    .limit(30)

  companySearchLoading.value = false
  if (error) {
    saveError.value = `회사 검색 실패: ${error.message}`
    return
  }

  const managerIds = [...new Set((data ?? []).map((item) => item.manager_id).filter(Boolean))]
  let managerNameMap = {}

  if (managerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name')
      .in('id', managerIds)

    managerNameMap = Object.fromEntries((profiles ?? []).map((item) => [item.id, String(item.name ?? '').trim()]))
  }

  companySearchResults.value = (data ?? []).map((item) => ({
    id: item.id,
    company: String(item.company ?? '').trim(),
    place: String(item.place ?? '').trim(),
    fullName: String(item.full_name ?? '').trim(),
    managerId: String(item.manager_id ?? '').trim(),
    managerName: String(managerNameMap[item.manager_id] ?? '').trim() || '담당자 미지정',
  }))
}

const selectCompany = (item) => {
  form.companyInfo = item.id
  form.uid = item.managerId || ''
  form.name = item.managerName || '담당자 미지정'
  form.company = item.company
  form.place = item.place
  companyDialogOpen.value = false
}

const fetchRow = async () => {
  pageLoading.value = true
  saveError.value = ''

  const { data, error } = await supabase
    .from('product_list')
    .select('id,company_info,uid,name,company,place,area,initial,delivery_due_date,head,hole,groove,weight,memo,not_test,work_type,test_date')
    .eq('id', rowId.value)
    .single()

  pageLoading.value = false

  if (error || !data) {
    saveError.value = `수정 데이터 조회 실패: ${error?.message || '대상을 찾을 수 없습니다.'}`
    return
  }

  form.companyInfo = data.company_info ?? null
  form.uid = String(data.uid ?? '').trim()
  form.name = String(data.name ?? '').trim()
  form.company = String(data.company ?? '').trim()
  form.place = String(data.place ?? '').trim()
  form.area = String(data.area ?? '').trim()
  form.initial = String(data.initial ?? '').trim()
  form.deliveryDueDate = String(data.delivery_due_date ?? '').trim()
  form.head = data.head == null ? '' : String(data.head)
  form.hole = data.hole == null ? '' : String(data.hole)
  form.groove = data.groove == null ? '' : String(data.groove)
  form.weight = data.weight == null ? '' : String(data.weight)
  form.memo = String(data.memo ?? '')
  form.isTest = !Boolean(data.not_test)
  form.workType = String(data.work_type ?? '').trim() || '용접/무용접'

  targetDateLabel.value = String(data.test_date ?? '').trim() || formatKoreanDate(route.query.date)
  targetDateIso.value =
    (typeof route.query.date === 'string' ? route.query.date : '') || parseKoreanDateLabel(data.test_date)
}

const submit = async () => {
  saveError.value = ''
  if (!form.companyInfo || !form.company || !form.place) {
    saveError.value = '회사 검색 후 회사명/현장명을 선택해주세요.'
    return
  }
  if (!String(form.area ?? '').trim()) {
    saveError.value = '구역명을 입력해주세요.'
    return
  }

  saving.value = true

  const fullText = [form.name, form.company, form.place, form.area, form.initial, form.memo]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')

  const { error } = await supabase
    .from('product_list')
    .update({
      company_info: form.companyInfo,
      uid: form.uid || null,
      name: form.name || '',
      company: String(form.company).trim(),
      place: String(form.place).trim(),
      area: String(form.area).trim(),
      initial: String(form.initial).trim() || null,
      head: form.head === '' ? null : Number(form.head),
      hole: form.hole === '' ? null : Number(form.hole),
      groove: form.groove === '' ? null : Number(form.groove),
      weight: form.weight === '' ? null : Number(form.weight),
      delivery_due_date: form.deliveryDueDate || null,
      memo: String(form.memo).trim() || '',
      not_test: !form.isTest,
      work_type: form.workType,
      full_text: fullText,
    })
    .eq('id', rowId.value)

  saving.value = false

  if (error) {
    saveError.value = `수정 실패: ${error.message}`
    return
  }

  goBack()
}

onMounted(async () => {
  const initialCompanySearch = typeof route.query.companySearch === 'string' ? route.query.companySearch.trim() : ''
  await fetchRow()

  if (!initialCompanySearch) return

  companySearchText.value = initialCompanySearch
  await searchCompanies()

  router.replace({
    name: 'main-edit',
    params: { id: rowId.value },
    query: {
      date: typeof route.query.date === 'string' ? route.query.date : targetDateIso.value || undefined,
      q: typeof route.query.q === 'string' ? route.query.q : undefined,
    },
  })
})
</script>

<template>
  <section v-if="pageLoading" class="flex min-h-screen items-center justify-center bg-white px-4">
    <p class="text-sm font-semibold text-slate-500">수정 데이터를 불러오는 중...</p>
  </section>
  <section v-else-if="saveError && !targetDateLabel" class="flex min-h-screen items-center justify-center bg-white px-4">
    <div class="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
      {{ saveError }}
    </div>
  </section>
  <MainRegisterView
    v-else
    page-title="생산계획 수정"
    submit-label="수정"
    :target-date-label="targetDateLabel"
    :company-search-text="companySearchText"
    :company-search-loading="companySearchLoading"
    :company-dialog-open="companyDialogOpen"
    :company-search-results="companySearchResults"
    :can-register-company="canRegisterCompany"
    :form="form"
    :saving="saving"
    :save-error="saveError"
    @go-back="goBack"
    @go-company-register="goCompanyRegister"
    @company-search-text-change="companySearchText = $event"
    @company-search-enter="searchCompanies"
    @select-company="selectCompany"
    @close-company-dialog="companyDialogOpen = false"
    @update-form="updateForm"
    @numeric-keydown="handleNumericKeydown"
    @weight-keydown="handleWeightKeydown"
    @submit="submit"
  />
</template>
