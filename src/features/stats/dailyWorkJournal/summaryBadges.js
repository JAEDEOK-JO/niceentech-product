const BADGE_CLASSES = {
  emerald: 'bg-emerald-600',
  cyan: 'bg-cyan-600',
  amber: 'bg-amber-600',
  violet: 'bg-violet-600',
}

export function processBadgeClass(accent) {
  return BADGE_CLASSES[accent] ?? BADGE_CLASSES.emerald
}
