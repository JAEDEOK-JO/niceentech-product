<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDialog } from '@/composables/useDialog'
import { fetchLotInfos, fetchRegisteredLotRounds } from '@/features/quality-list/services/quality.service'
import type { QualityListRow, QualityLotInfo } from '@/features/quality-list/types/quality'

const props = defineProps<{
  item: QualityListRow | null
}>()

const emit = defineEmits<{
  close: []
  assign: [payload: { round: string; lot: QualityLotInfo | null }]
}>()

const { alert } = useDialog()
const busy = ref(false)
const activeRound = ref('')
const choices = ref<QualityLotInfo[]>([])
const rounds = ref<string[]>([])

watch(
  () => props.item,
  (item) => {
    busy.value = false
    activeRound.value = ''
    choices.value = []
    rounds.value = []
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
  width: 100%;
  max-width: 320px;
  padding: 24px;
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
</style>
