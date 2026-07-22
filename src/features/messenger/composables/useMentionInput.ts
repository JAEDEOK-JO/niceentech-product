import { computed, ref, type Ref } from 'vue'
import {
  filterMentionMembers,
  getActiveMentionRange,
  insertMentionAtRange,
  resolveMentionedUserIds,
  type MentionMember,
} from '../utils/mentionText'

export function useMentionInput(options: {
  messageInput: Ref<string>
  members: Ref<MentionMember[]>
  myUserId: Ref<string>
  textareaRef: Ref<HTMLTextAreaElement | null>
}) {
  const mentionOpen = ref(false)
  const mentionQuery = ref('')
  const mentionStart = ref(-1)
  const mentionIndex = ref(0)
  const selectedMentions = ref<MentionMember[]>([])

  const filteredMembers = computed(() =>
    filterMentionMembers(options.members.value, mentionQuery.value, options.myUserId.value),
  )

  const closeMention = () => {
    mentionOpen.value = false
    mentionQuery.value = ''
    mentionStart.value = -1
    mentionIndex.value = 0
  }

  const syncMentionFromCaret = () => {
    const el = options.textareaRef.value
    const caret = el?.selectionStart ?? options.messageInput.value.length
    const range = getActiveMentionRange(options.messageInput.value, caret)
    if (!range) {
      closeMention()
      return
    }
    mentionOpen.value = true
    mentionQuery.value = range.query
    mentionStart.value = range.start
    if (mentionIndex.value >= filteredMembers.value.length) {
      mentionIndex.value = Math.max(0, filteredMembers.value.length - 1)
    }
  }

  const selectMention = (member: MentionMember) => {
    const el = options.textareaRef.value
    const caret = el?.selectionStart ?? options.messageInput.value.length
    const range =
      mentionStart.value >= 0
        ? { start: mentionStart.value, query: mentionQuery.value }
        : getActiveMentionRange(options.messageInput.value, caret)

    if (!range) return

    const inserted = insertMentionAtRange(
      options.messageInput.value,
      range,
      caret,
      member.display_name,
    )
    options.messageInput.value = inserted.text

    if (!selectedMentions.value.some((m) => m.user_id === member.user_id)) {
      selectedMentions.value = [...selectedMentions.value, member]
    }

    closeMention()

    requestAnimationFrame(() => {
      const target = options.textareaRef.value
      if (!target) return
      target.focus()
      target.setSelectionRange(inserted.caret, inserted.caret)
    })
  }

  const handleMentionKeydown = (e: KeyboardEvent): boolean => {
    if (!mentionOpen.value || filteredMembers.value.length === 0) return false

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % filteredMembers.value.length
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value =
        (mentionIndex.value - 1 + filteredMembers.value.length) % filteredMembers.value.length
      return true
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const target = filteredMembers.value[mentionIndex.value]
      if (target) selectMention(target)
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeMention()
      return true
    }
    return false
  }

  const resetSelectedMentions = () => {
    selectedMentions.value = []
  }

  const getMentionedUserIdsForSend = (content: string) =>
    resolveMentionedUserIds(content, selectedMentions.value)

  return {
    mentionOpen,
    mentionQuery,
    mentionIndex,
    filteredMembers,
    selectedMentions,
    syncMentionFromCaret,
    selectMention,
    handleMentionKeydown,
    closeMention,
    resetSelectedMentions,
    getMentionedUserIdsForSend,
  }
}
