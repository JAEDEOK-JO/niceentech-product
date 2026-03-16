<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CompanyRegisterView from '@/features/company-register/CompanyRegisterView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { supabase } from '@/lib/supabase'
import { isAdminRole, isDesignDepartment } from '@/utils/adminAccess'

const route = useRoute()
const router = useRouter()
const { session } = useAuth()
const { profile } = useProfile(session)

const managers = ref([])
const loadingManagers = ref(false)
const saving = ref(false)
const saveError = ref('')
const today = new Date()
const defaultRegistrationMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

const form = reactive({
  company: '',
  place: '',
  totalHeadCount: '',
  directorName: '',
  directorPhone: '',
  siteAddress: '',
  companyType: '아파트',
  businessRegistrationNumber: '',
  registrationMonth: defaultRegistrationMonth,
  startDate: '',
  endDate: '',
  managerId: '',
})

const fullNamePreview = computed(() =>
  [form.company, form.place]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' '),
)
const canManageCompany = computed(() => isAdminRole(profile.value?.role) || isDesignDepartment(profile.value?.department))

const goBack = () => {
  if (route.query.returnTo === 'main-register') {
    router.push({
      name: 'main-register',
      query: {
        date: typeof route.query.date === 'string' ? route.query.date : undefined,
        q: typeof route.query.q === 'string' ? route.query.q : undefined,
        companySearch: typeof route.query.companySearch === 'string' ? route.query.companySearch : undefined,
      },
    })
    return
  }

  router.push({ name: 'main' })
}

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '')

const formatMobilePhoneNumber = (value) => {
  const digits = digitsOnly(value).slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

const updateForm = (field, value) => {
  if (field === 'startDate' || field === 'endDate') {
    form[field] = String(value ?? '').replace(/\D/g, '')
    return
  }
  if (field === 'totalHeadCount') {
    form.totalHeadCount = digitsOnly(value)
    return
  }
  if (field === 'directorPhone') {
    form.directorPhone = formatMobilePhoneNumber(value)
    return
  }
  if (field === 'businessRegistrationNumber') {
    form.businessRegistrationNumber = digitsOnly(value).slice(0, 11)
    return
  }
  form[field] = String(value ?? '')
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

const submit = async () => {
  saveError.value = ''

  const company = String(form.company ?? '').trim()
  const place = String(form.place ?? '').trim()
  const fullName = fullNamePreview.value

  if (!company) {
    saveError.value = '회사명을 입력해주세요.'
    return
  }

  if (!place) {
    saveError.value = '현장명을 입력해주세요.'
    return
  }

  if (!fullName) {
    saveError.value = '회사명과 현장명을 확인해주세요.'
    return
  }

  saving.value = true

  const { data: existingCompany, error: existingError } = await supabase
    .from('company_list')
    .select('id')
    .eq('full_name', fullName)
    .maybeSingle()

  if (existingError) {
    saving.value = false
    saveError.value = `중복 확인 실패: ${existingError.message}`
    return
  }

  if (existingCompany?.id) {
    saving.value = false
    saveError.value = '이미 등록된 회사/현장입니다.'
    return
  }

  const { error } = await supabase.from('company_list').insert({
    company,
    place,
    full_name: fullName,
    total_head_count: form.totalHeadCount ? Number(form.totalHeadCount) : null,
    director_name: String(form.directorName ?? '').trim() || null,
    director_phone: digitsOnly(form.directorPhone) || null,
    site_address: String(form.siteAddress ?? '').trim() || null,
    company_type: String(form.companyType ?? '').trim() || null,
    business_registration_number: digitsOnly(form.businessRegistrationNumber) || null,
    registration_month: form.registrationMonth ? `${form.registrationMonth}-01` : null,
    start_date: form.startDate ? Number(form.startDate) : 0,
    end_date: form.endDate ? Number(form.endDate) : 0,
    manager_id: form.managerId || null,
  })

  saving.value = false

  if (error) {
    saveError.value = `회사 등록 실패: ${error.message}`
    return
  }

  if (route.query.returnTo === 'main-register') {
    router.push({
      name: 'main-register',
      query: {
        date: typeof route.query.date === 'string' ? route.query.date : undefined,
        q: typeof route.query.q === 'string' ? route.query.q : undefined,
        companySearch: fullName,
      },
    })
    return
  }

  router.push({ name: 'main' })
}

onMounted(async () => {
  await fetchManagers()
})
</script>

<template>
  <CompanyRegisterView
    v-if="canManageCompany"
    :form="form"
    :managers="managers"
    :loading-managers="loadingManagers"
    :saving="saving"
    :save-error="saveError"
    :full-name-preview="fullNamePreview"
    @go-back="goBack"
    @update-form="updateForm"
    @submit="submit"
  />
</template>
