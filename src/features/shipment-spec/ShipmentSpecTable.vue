<script setup>
import { shipmentSpecDisplayText } from './shipmentSpecDisplayText'
import { hasShipmentSpecOutput, remarksForBadges } from './shipmentSpecOutput'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})

const emit = defineEmits(['select'])

const text = shipmentSpecDisplayText
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table class="min-w-full border-collapse text-sm">
      <thead class="bg-slate-50">
        <tr>
          <th class="w-24 border border-slate-200 px-3 py-2 text-center font-bold text-slate-700">도번</th>
          <th class="w-24 border border-slate-200 px-3 py-2 text-center font-bold text-slate-700">담당</th>
          <th class="border border-slate-200 px-3 py-2 text-center font-bold text-slate-700">회사명</th>
          <th class="border border-slate-200 px-3 py-2 text-center font-bold text-slate-700">현장명</th>
          <th class="border border-slate-200 px-3 py-2 text-center font-bold text-slate-700">구역명</th>
          <th class="border border-slate-200 px-3 py-2 text-center font-bold text-slate-700">출력</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="6" class="border border-slate-200 px-3 py-8 text-center text-slate-500">불러오는 중</td>
        </tr>
        <tr v-else-if="errorMessage">
          <td colspan="6" class="border border-slate-200 px-3 py-8 text-center font-bold text-rose-600">{{ errorMessage }}</td>
        </tr>
        <tr v-else-if="rows.length === 0">
          <td colspan="6" class="border border-slate-200 px-3 py-8 text-center text-slate-400">-</td>
        </tr>
        <template v-else>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="cursor-pointer"
            :class="hasShipmentSpecOutput(row.shipment_spec_remarks)
              ? 'bg-emerald-50 hover:bg-emerald-100 [&>td]:bg-emerald-50 hover:[&>td]:bg-emerald-100'
              : 'hover:bg-slate-50'"
            @click="emit('select', row)"
          >
            <td class="border border-slate-200 px-3 py-2 text-center text-slate-800">{{ text(row.initial) }}</td>
            <td class="border border-slate-200 px-3 py-2 text-center text-slate-800">{{ text(row.name) }}</td>
            <td class="border border-slate-200 px-3 py-2 text-center text-slate-800">{{ text(row.company) }}</td>
            <td class="border border-slate-200 px-3 py-2 text-center text-slate-800">{{ text(row.place) }}</td>
            <td class="border border-slate-200 px-3 py-2 text-center text-slate-800">{{ text(row.area) }}</td>
            <td class="border border-slate-200 px-3 py-2 text-center">
              <div class="flex flex-wrap justify-center gap-1">
                <span
                  v-for="(badge, index) in remarksForBadges(row.shipment_spec_remarks)"
                  :key="`${row.id}-${index}`"
                  class="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800"
                >{{ badge }}</span>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
