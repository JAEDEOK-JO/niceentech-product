export const TARGET_DIAMETERS = ['32', '40', '50', '65', '80', '100', '125', '150'] as const
export const DIAMETER_VALUES = ['25', ...TARGET_DIAMETERS, 'other', 'unknown'] as const

export const PAGE_KINDS = ['detail', 'detail_with_instructions', 'cover', 'work_order', 'material_table', 'other'] as const

const text = { type: 'string' }
const integer = { type: 'integer' }
const unit = { type: 'number' }

const strictObject = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
})

const quantityNote = strictObject({
  text,
  scope: text,
})

export const pipeRecordSchema = strictObject({
  scope: text,
  pipe_no: text,
  pipe_part: text,
  location: text,
  region: strictObject({ x0: unit, y0: unit, x1: unit, y1: unit }),
  body_diameter: { type: 'string', enum: [...DIAMETER_VALUES] },
  has_hole: { type: 'string', enum: ['yes', 'no', 'unknown'] },
  total_length: text,
  hole_dimension: text,
  ea_text: text,
  set_text: text,
  multiplier: integer,
  multiplier_basis: text,
  status: { type: 'string', enum: ['included', 'excluded', 'uncertain'] },
  reason: text,
})

export const surveySchema = strictObject({
  pages: {
    type: 'array',
    items: strictObject({
      pdf_page: integer,
      page_kind: { type: 'string', enum: [...PAGE_KINDS] },
      analyze: { type: 'boolean' },
      reason: text,
    }),
  },
  shared_notes: {
    type: 'array',
    items: strictObject({
      source_page: integer,
      text,
      applies_to_pages: { type: 'array', items: integer },
      scope: text,
    }),
  },
})

export const pageSchema = strictObject({
  page: strictObject({
    page_kind: { type: 'string', enum: [...PAGE_KINDS] },
    analyzed: { type: 'boolean' },
    exclusion_reason: text,
    quantity_notes: { type: 'array', items: quantityNote },
    fully_read: { type: 'boolean' },
    unread_reason: text,
  }),
  records: { type: 'array', items: pipeRecordSchema },
})

export const zoomSchema = strictObject({
  found: { type: 'boolean' },
  records: { type: 'array', items: pipeRecordSchema },
})
