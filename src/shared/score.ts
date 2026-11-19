export type ScoreTier = 'top' | 'mid' | 'low' | 'none'

export type ScoreView = {
  label: string
  tier: ScoreTier
  value: number | null
}

export function parseScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.endsWith('%')
      ? trimmed.slice(0, -1).trim()
      : trimmed
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function scorePresentation(value: number | null | undefined): ScoreView {
  if (value === null || value === undefined) {
    return { label: '—', tier: 'none', value: null }
  }
  const score = Number(value)
  if (!Number.isFinite(score)) {
    return { label: '—', tier: 'none', value: null }
  }
  const rounded = Math.round(score)
  return {
    label: `${rounded}%`,
    tier: score >= 95 ? 'top' : score >= 60 ? 'mid' : 'low',
    value: rounded,
  }
}
