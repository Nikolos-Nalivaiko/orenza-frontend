import { describe, expect, it } from 'vitest'
import { forgetObjectDrafts, isObjectDraftKey, objectDraftKey } from '../drafts'

function memoryStorage(entries: Record<string, string>): Storage {
  const items = new Map(Object.entries(entries))

  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  }
}

describe('objectDraftKey', () => {
  it('привʼязує чернетку до людини й простору', () => {
    expect(objectDraftKey(4, 8)).toBe('orenza.objects.draft.4.8')
    expect(objectDraftKey(4, 9)).not.toBe(objectDraftKey(4, 8))
    expect(objectDraftKey(5, 8)).not.toBe(objectDraftKey(4, 8))
  })

  it('без людини чи простору чернетки немає', () => {
    expect(objectDraftKey(null, 8)).toBeNull()
    expect(objectDraftKey(4, undefined)).toBeNull()
  })
})

describe('forgetObjectDrafts', () => {
  it('прибирає всі чернетки обʼєктів, включно зі старим спільним ключем', () => {
    const storage = memoryStorage({
      'orenza.objects.draft': '{}',
      'orenza.objects.draft.4.8': '{}',
      'orenza.objects.draft.5.9': '{}',
      'orenza.objects.view': 'cards',
      'orenza.sidebar.collapsed': '1',
    })

    forgetObjectDrafts(storage)

    expect(storage.length).toBe(2)
    expect(storage.getItem('orenza.objects.view')).toBe('cards')
    expect(storage.getItem('orenza.sidebar.collapsed')).toBe('1')
  })

  it('розпізнає лише ключі чернеток', () => {
    expect(isObjectDraftKey('orenza.objects.draft.1.2')).toBe(true)
    expect(isObjectDraftKey('orenza.objects.draftish')).toBe(false)
    expect(isObjectDraftKey('orenza.objects.view')).toBe(false)
  })
})
