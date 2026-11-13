<script setup>
defineProps({
  url: {
    type: String,
    default: '',
  },
  count: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['open'])
</script>

<template>
  <button
    v-if="count > 0 && url"
    type="button"
    class="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100"
    @click="emit('open')"
  >
    <img :src="url" alt="" class="h-full w-full object-cover" />
    <span class="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
      {{ count }}장
    </span>
  </button>
  <div
    v-else
    class="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300"
  >
    <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M20.5 16.5l-4.5-4-3.5 3-2-1.5-6.5 5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
</template>
