<script setup>
defineProps({
  material: { type: String, required: true },
  section: { type: String, default: '' },
  showSections: { type: Boolean, default: true },
})

const emit = defineEmits(['update:material', 'update:section'])

const materials = [
  { key: 'raw', label: '원자재' },
  { key: 'subsidiary', label: '부자재' },
]

const sections = [
  { key: 'summary', label: '총괄' },
  { key: 'production', label: '생산' },
  { key: 'in', label: '입고' },
  { key: 'out', label: '산출' },
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <div class="flex items-center gap-1.5">
      <button
        v-for="tab in materials"
        :key="tab.key"
        type="button"
        class="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-extrabold transition-colors"
        :class="
          material === tab.key
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        "
        @click="emit('update:material', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div v-if="showSections" class="flex items-center gap-1">
      <button
        v-for="child in sections"
        :key="child.key"
        type="button"
        class="inline-flex h-7 items-center justify-center rounded-md border px-2 text-[11px] font-extrabold transition-colors"
          :class="
            section === child.key
              ? 'border-orange-800 bg-orange-700 text-white'
              : 'border-orange-300 bg-white text-orange-800 hover:bg-orange-50'
          "
        @click="emit('update:section', child.key)"
      >
        {{ child.label }}
      </button>
    </div>
  </div>
</template>
