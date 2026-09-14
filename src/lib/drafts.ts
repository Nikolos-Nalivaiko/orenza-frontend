export const OBJECT_DRAFT_PREFIX = 'orenza.objects.draft.'

const LEGACY_OBJECT_DRAFT_KEY = 'orenza.objects.draft'

export function objectDraftKey(
  userId: number | null | undefined,
  workspaceId: number | null | undefined,
): string | null {
  return userId == null || workspaceId == null
    ? null
    : `${OBJECT_DRAFT_PREFIX}${userId}.${workspaceId}`
}

export function isObjectDraftKey(key: string): boolean {
  return key === LEGACY_OBJECT_DRAFT_KEY || key.startsWith(OBJECT_DRAFT_PREFIX)
}

export function forgetObjectDrafts(storage?: Storage): void {
  try {
    const target = storage ?? localStorage
    const keys: string[] = []

    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index)

      if (key !== null && isObjectDraftKey(key)) {
        keys.push(key)
      }
    }

    for (const key of keys) {
      target.removeItem(key)
    }
  } catch {
    return
  }
}
