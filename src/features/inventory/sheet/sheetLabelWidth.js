const ASCII_CHAR_PX = 9
const CJK_CHAR_PX = 13
const CELL_PADDING_PX = 20
const MIN_GROUP_COL_PX = 72
const MIN_SPEC_COL_PX = 52
const SUM_COL_PX = 64
const IN_SUM_COL_COUNT = 3
const OUT_SUM_COL_COUNT = 3

export const IN_SUM_BLOCK_PX = SUM_COL_PX * IN_SUM_COL_COUNT
export const OUT_SUM_BLOCK_PX = SUM_COL_PX * OUT_SUM_COL_COUNT
export const SUM_BLOCK_PX = IN_SUM_BLOCK_PX

export const measureSheetLabelPx = (text) => {
  let width = 0
  for (const char of String(text ?? '')) {
    width += char.charCodeAt(0) > 127 ? CJK_CHAR_PX : ASCII_CHAR_PX
  }
  return width
}

const evenCeil = (value, min) => {
  const padded = Math.max(min, value + CELL_PADDING_PX)
  return Math.ceil(padded / 2) * 2
}

export const buildSheetLabelColumnWidths = (materials) => {
  let maxGroup = 0
  let maxSpec = 0
  for (const material of materials ?? []) {
    maxGroup = Math.max(maxGroup, measureSheetLabelPx(material.group))
    maxSpec = Math.max(maxSpec, measureSheetLabelPx(material.spec))
  }

  const groupColWidth = evenCeil(maxGroup, MIN_GROUP_COL_PX)
  const specColWidth = evenCeil(maxSpec, MIN_SPEC_COL_PX)

  return {
    groupColWidth,
    specColWidth,
    labelBlockWidth: groupColWidth + specColWidth,
  }
}
