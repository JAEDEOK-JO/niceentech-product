<script setup lang="ts">
import { computed } from 'vue'
import { splitMentionBodyAndTags, type MentionMember } from '../utils/mentionText'

const props = defineProps<{
  content: string
  members?: MentionMember[]
  /** 내 말풍선(보라) 여부 — 보색(노랑) 사용 */
  mine?: boolean
}>()

const parsed = computed(() => splitMentionBodyAndTags(props.content, props.members ?? []))

/** 보라(#4f46e5) 보색 ≈ 노랑 */
const mentionClass = computed(() =>
  props.mine ? 'font-semibold text-[#fde047]' : 'font-semibold text-[#c2410c]',
)
</script>

<template>
  <div class="min-w-0">
    <p
      v-if="parsed.body"
      class="whitespace-pre-wrap break-words"
    >{{ parsed.body }}</p>
    <div
      v-if="parsed.mentions.length > 0"
      class="flex flex-col gap-0.5"
      :class="parsed.body ? 'mt-1.5' : ''"
    >
      <span
        v-for="(item, index) in parsed.mentions"
        :key="`${item.value}-${index}`"
        :class="mentionClass"
      >{{ item.value }}</span>
    </div>
  </div>
</template>
