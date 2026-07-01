export function parseDigitsInput(event: Event): number {
  const target = event.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '')
  target.value = digits
  return digits ? Number(digits) : 0
}
