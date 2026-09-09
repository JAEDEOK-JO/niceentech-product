const MEMO_MAX_LINES = 3

export const fitSheetMemoHeight = (el, maxLines = MEMO_MAX_LINES) => {
  if (!el) return
  el.style.height = '0px'
  const styles = window.getComputedStyle(el)
  const fontSize = Number.parseFloat(styles.fontSize) || 12
  const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.35
  const maxHeight = lineHeight * maxLines
  el.style.height = `${Math.min(maxHeight, Math.max(lineHeight, el.scrollHeight))}px`
}
