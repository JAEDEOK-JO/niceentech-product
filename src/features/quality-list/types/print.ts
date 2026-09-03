import type { QualityListRow } from './quality'

export interface MainPipeGroupItem {
  originalIndex: number
  company: string
  place: string
  area: string
  initial: string
  data: QualityListRow
}

export interface MainPipeGroupableGroup {
  key: string
  company: string
  place: string
  items: MainPipeGroupItem[]
}

export type PipeCardType = 'small' | 'large'

export interface PrintEntry {
  indices: number[]
  items: MainPipeGroupItem[]
  isGrouped: boolean
}

export interface PrintEntryWithType {
  entry: PrintEntry
  type: PipeCardType
}

export interface MainPipeQuantities {
  m65: number
  m80: number
  m100: number
  m125: number
  m150: number
  m200: number
}

export interface MainPipeCardView {
  indexLabel: string
  initial: string
  companyPlace: string
  area: string
  lotCode: string
  lotRange: string
  rows: Array<{
    label: string
    value: string
    grey: boolean
  }>
}

export interface BranchPipeItem {
  originalIndex: number
  row: QualityListRow
  lotText: string
}

export const BRANCH_BUNDLES = [1, 2, 3, 4, 5, 6] as const
export const BRANCH_SIZES = ['a32', 'a40', 'a50', 'a65'] as const
export const BRANCH_SIZE_LABELS = ['A32', 'A40', 'A50', 'A65'] as const

export type BranchBundle = (typeof BRANCH_BUNDLES)[number]
export type BranchSize = (typeof BRANCH_SIZES)[number]
