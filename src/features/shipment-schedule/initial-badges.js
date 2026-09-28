export function splitInitials(value) {
  return String(value ?? '')
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function joinInitials(tokens) {
  return tokens
    .map((token) => String(token ?? '').trim())
    .filter(Boolean)
    .join(', ')
}
