<script setup>
import { computed } from 'vue'
import { sanitizeChatbotHtml } from './sanitizeChatbotHtml'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const view = computed(() => sanitizeChatbotHtml(props.content))
</script>

<template>
  <div v-if="view.html" class="chatbot-html text-[15px] leading-7 text-slate-800" v-html="view.htmlText" />
  <p v-else class="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{{ view.text }}</p>
</template>

<style scoped>
.chatbot-html :deep(h3) {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.chatbot-html :deep(p) {
  margin: 0 0 10px;
}

.chatbot-html :deep(ul),
.chatbot-html :deep(ol) {
  margin: 0 0 10px;
  padding-left: 1.2rem;
}

.chatbot-html :deep(table) {
  width: 100%;
  margin: 0 0 12px;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.4;
}

.chatbot-html :deep(th),
.chatbot-html :deep(td) {
  padding: 8px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.chatbot-html :deep(th) {
  background: #f8fafc;
  font-size: 12px;
  font-weight: 800;
  color: #64748b;
}

.chatbot-html :deep(tr:last-child td) {
  border-bottom: 0;
}

.chatbot-html :deep(.chart) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 8px;
}

.chatbot-html :deep(.bar) {
  display: flex;
  min-width: 96px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 8px;
  background: #f59e0b;
  padding: 6px 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.chatbot-html :deep(.bar b) {
  font-weight: 800;
}
</style>
