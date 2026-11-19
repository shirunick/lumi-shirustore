export const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export const UUID_RE = new RegExp(`^${UUID_PATTERN}$`, 'i')

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
