const inspectorThemes = {
  민뚜라: {
    label: 'text-cyan-800',
    thead: 'bg-slate-100 text-slate-700',
  },
  진민택: {
    label: 'text-fuchsia-800',
    thead: 'bg-slate-100 text-slate-700',
  },
} as const

export const getInspectorTheme = (inspector: string) =>
  inspectorThemes[inspector as keyof typeof inspectorThemes] ?? {
    label: 'text-slate-700',
    thead: 'bg-slate-100 text-slate-700',
  }

export const tableHeaderClass = 'border border-slate-300 px-2 py-1.5 text-center text-[11px] font-semibold'
export const tableCellClass = 'border border-slate-300 px-2 py-1.5 text-center'
