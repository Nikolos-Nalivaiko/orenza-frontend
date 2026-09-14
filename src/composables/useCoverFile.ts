import { onBeforeUnmount, ref } from 'vue'
import {
  CENTER_FOCUS,
  COVER_TYPES,
  COVER_UPLOAD_SIDE,
  coverFileProblem,
  coverSizeProblem,
  type CoverDraft,
} from '@/lib/cover'
import { prepareImageUpload } from '@/lib/image'

export function useCoverFile() {
  const preparing = ref(false)
  const problem = ref<string | null>(null)
  const previews = new Set<string>()

  async function prepare(file: File): Promise<CoverDraft | null> {
    problem.value = coverFileProblem(file)

    if (problem.value !== null) {
      return null
    }

    preparing.value = true

    try {
      const prepared = await prepareImageUpload(file, COVER_UPLOAD_SIDE, COVER_TYPES)

      problem.value = coverSizeProblem(prepared.width, prepared.height)

      if (problem.value !== null) {
        return null
      }

      const preview = URL.createObjectURL(prepared.file)

      previews.add(preview)

      return {
        file: prepared.file,
        preview,
        width: prepared.width,
        height: prepared.height,
        focus: { ...CENTER_FOCUS },
      }
    } catch {
      problem.value = 'Браузер не зміг відкрити це зображення. Спробуйте JPG або PNG.'

      return null
    } finally {
      preparing.value = false
    }
  }

  function release(draft: CoverDraft | null): void {
    if (draft !== null && previews.has(draft.preview)) {
      URL.revokeObjectURL(draft.preview)
      previews.delete(draft.preview)
    }
  }

  function clearProblem(): void {
    problem.value = null
  }

  onBeforeUnmount(() => {
    for (const preview of previews) {
      URL.revokeObjectURL(preview)
    }

    previews.clear()
  })

  return { preparing, problem, prepare, release, clearProblem }
}
