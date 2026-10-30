<script setup>
defineProps({
  label: { type: String, default: '' },
  collapsed: { type: Boolean, default: false },
})

defineEmits(['toggle'])
</script>

<template>
  <button
    type="button"
    class="group-toggle"
    :aria-expanded="collapsed ? 'false' : 'true'"
    @click="$emit('toggle')"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.group-toggle {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 900;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}
</style>
