export function benchDisplayName(name: string | null, createdAt: string): string {
  if (name) return name
  const d = new Date(createdAt)
  return `Bank vom ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
}
