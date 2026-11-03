<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDialog } from '@/composables/useDialog'
import { fetchLotInfos, fetchRegisteredLotRounds } from '@/features/quality-list/services/quality.service'
import type { QualityListRow, QualityLotInfo } from '@/features/quality-list/types/quality'
import { emptyManualExpansion, type ManualExpansionInput } from '@/features/quality-list/utils/manualExpansion'

const props = defineProps<{
  item: QualityListRow | null
}>()

const emit = defineEmits<{
  close: []
  assign: [payload: { round: string; lot: QualityLotInfo | null }]
  saveManual: [payload: ManualExpansionInput]
}>()

const { alert } = useDialog()
const busy = ref(false)
const activeRound = ref('')
const choices = ref<QualityLotInfo[]>([])
const rounds = ref<string[]>([])
const draft = ref<ManualExpansionInput>(emptyManualExpansion())

watch(
  () => props.item,
  (item) => {
    busy.value = false
    activeRound.value = ''
    choices.value = []
    rounds.value = []
    draft.value = item
      ? {
          lotNumH2: item.lotNumH2,
          lotNameH2: item.lotNameH2,
          lotNumStartH2: limitRange(item.lotNumStartH2),
          lotNumEndH2: limitRange(item.lotNumEndH2),
        }
      : emptyManualExpansion()
    if (!item?.testDate) return
    void loadRounds(item.testDate)
  },
  { immediate: true },
)

async function loadRounds(testDate: string) {
  try {
    rounds.value = await fetchRegisteredLotRounds(testDate)
  } catch (error) {
    await alert(error instanceof Error ? error.message : '확관차수를 불러오지 못했습니다.')
  }
}

function usableLots(lots: QualityLotInfo[]) {
  return lots.filter((lot) => String(lot.lotName ?? '').trim() && Number(lot.lotNum) > 0)
}

async function chooseRound(round: string) {
  if (!props.item || busy.value) return
  busy.value = true
  activeRound.value = round
  choices.value = []
  try {
    const lots = usableLots(await fetchLotInfos(props.item.testDate, round))
    if (lots.length > 1) {
      choices.value = lots
      return
    }
    emit('assign', { round, lot: lots[0] ?? null })
    emit('close')
  } catch (error) {
    await alert(error instanceof Error ? error.message : '확관차수를 지정하지 못했습니다.')
  } finally {
    busy.value = false
  }
}

function chooseLot(lot: QualityLotInfo) {
  if (!activeRound.value || busy.value) return
  emit('assign', { round: activeRound.value, lot })
  emit('close')
}

function limitRange(value: string) {
  return value.replace(/\D/g, '').slice(0, 5)
}

function saveManual() {
  emit('saveManual', {
    lotNumH2: draft.value.lotNumH2.trim(),
    lotNameH2: draft.value.lotNameH2.trim(),
    lotNumStartH2: limitRange(draft.value.lotNumStartH2),
    lotNumEndH2: limitRange(draft.value.lotNumEndH2),
  })
  emit('close')
}

function clearManual() {
  draft.value = emptyManualExpansion()
  saveManual()
}

function lotLabel(lot: QualityLotInfo) {
  const num = String(lot.lotNum).slice(-3)
  const typeName = String(lot.lotType ?? '').trim()
  return typeName ? `${typeName} ${lot.lotName} (${num})` : `${lot.lotName} (${num})`
}
</script>

<template>
  <div v-if="item" class="round-overlay" @click.self="emit('close')">
    <div class="round-box">
      <div class="round-head">
        <p class="round-title">확관차수</p>
        <button type="button" class="round-close" @click="emit('close')">닫기</button>
      </div>
      <div class="round-options">
        <button
          v-for="round in rounds"
          :key="round"
          type="button"
          class="round-btn"
          :class="{ 'round-btn--on': round === activeRound || (!activeRound && round === item.lotRound) }"
          :disabled="busy"
          @click="chooseRound(round)"
        >
          {{ round }}
        </button>
      </div>
      <div v-if="choices.length > 1" class="round-lots">
        <button
          v-for="lot in choices"
          :key="`${lot.lotType}-${lot.lotName}-${lot.lotNum}`"
          type="button"
          class="round-lot"
          @click="chooseLot(lot)"
        >
          {{ lotLabel(lot) }}
        </button>
      </div>
      <form class="round-manual" @submit.prevent="saveManual">
        <p class="round-label">수기입력</p>
        <div class="round-pair">
          <label class="round-field">
            로트번호
            <input v-model="draft.lotNumH2" type="text" inputmode="numeric" />
          </label>
          <label class="round-field">
            이름
            <input v-model="draft.lotNameH2" type="text" />
          </label>
        </div>
        <div class="round-pair">
          <label class="round-field">
            시작번호
            <input
              v-model="draft.lotNumStartH2"
              type="text"
              inputmode="numeric"
              maxlength="5"
              @input="draft.lotNumStartH2 = limitRange(draft.lotNumStartH2)"
            />
          </label>
          <label class="round-field">
            끝번호
            <input
              v-model="draft.lotNumEndH2"
              type="text"
              inputmode="numeric"
              maxlength="5"
              @input="draft.lotNumEndH2 = limitRange(draft.lotNumEndH2)"
            />
          </label>
        </div>
        <div class="round-manual-actions">
          <button type="submit" class="round-save">저장</button>
          <button type="button" class="round-clear" @click="clearManual">지우기</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.round-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 16px;
}

.round-box {
  box-sizing: border-box;
  width: 100%;
  max-width: 420px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
}

.round-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.round-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.round-close {
  padding: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.round-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 8px;
}

.round-btn,
.round-lot {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #1e293b;
  font-weight: 700;
  cursor: pointer;
}

.round-btn {
  padding: 12px 0;
  font-size: 14px;
}

.round-btn--on {
  border-color: #0284c7;
  background: #e0f2fe;
  color: #0369a1;
}

.round-btn:disabled {
  cursor: default;
}

.round-lots {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.round-lot {
  padding: 12px;
  font-size: 13px;
  text-align: left;
}

.round-manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}

.round-label {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.round-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
}

.round-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.round-field input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  outline: none;
}

.round-field input:focus {
  border-color: #0284c7;
}

.round-manual-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.round-save,
.round-clear {
  padding: 10px 0;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.round-save {
  border: 1px solid #0284c7;
  background: #e0f2fe;
  color: #0369a1;
}

.round-clear {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
}
</style>
