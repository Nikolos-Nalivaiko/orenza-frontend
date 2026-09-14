import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import {
  buildEmployeePayload,
  normalizeEmployee,
  type Employee,
  type EmployeeForm,
  type EmployeeStatus,
} from '@/lib/employees'
import { api, ApiError } from '@/lib/http'

export const useEmployeesStore = defineStore('employees', () => {
  const progress = useProgressStore()
  const workspaces = useWorkspacesStore()

  const items = ref<Employee[]>([])

  const isLoading = ref(true)
  const isSaving = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  function employeesPath(): string | null {
    const slug = workspaces.current?.slug

    if (slug === undefined || !workspaces.hasTeam) {
      return null
    }

    return `/workspaces/${slug}/employees`
  }

  function message(cause: unknown, fallback: string): string {
    return cause instanceof ApiError ? cause.message : fallback
  }

  function find(id: number | null): Employee | null {
    return id === null ? null : (items.value.find((item) => item.id === id) ?? null)
  }

  function apply(next: Employee): void {
    const known = find(next.id) !== null

    items.value = known
      ? items.value.map((item) => (item.id === next.id ? next : item))
      : [...items.value, next]
  }

  async function load(): Promise<void> {
    const path = employeesPath()

    if (path === null) {
      items.value = []
      isLoading.value = false
      loaded.value = true

      return
    }

    isLoading.value = true
    error.value = null

    try {
      const list = await progress.track(api.get<Employee[]>(path))

      if (employeesPath() !== path) {
        return
      }

      items.value = list.map(normalizeEmployee)
    } catch (cause) {
      error.value = message(cause, 'Не вдалося завантажити співробітників.')
    } finally {
      isLoading.value = false
      loaded.value = true
    }
  }

  let pending: Promise<void> | null = null

  function fetchEmployees(): Promise<void> {
    pending ??= load().finally(() => {
      pending = null
    })

    return pending
  }

  async function fetchEmployee(id: number): Promise<void> {
    const path = employeesPath()

    if (path === null) {
      isLoading.value = false

      return
    }

    error.value = null

    try {
      const employee = await progress.track(api.get<Employee>(`${path}/${id}`))

      apply(normalizeEmployee(employee))
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        items.value = items.value.filter((item) => item.id !== id)

        return
      }

      error.value = message(cause, 'Не вдалося відкрити картку співробітника.')
    } finally {
      isLoading.value = false
    }
  }

  watch(
    () => workspaces.currentId,
    () => {
      items.value = []
      error.value = null
      loaded.value = false
      isLoading.value = true

      pending = null

      void fetchEmployees()
    },
  )

  async function createEmployee(form: EmployeeForm): Promise<Employee | null> {
    const path = employeesPath()

    if (path === null) {
      error.value = 'В особистому просторі команди немає.'

      return null
    }

    isSaving.value = true
    error.value = null

    try {
      const created = await progress.track(api.post<Employee>(path, buildEmployeePayload(form)))
      const employee = normalizeEmployee(created)

      items.value = [...items.value, employee]

      return employee
    } catch (cause) {
      error.value = message(cause, 'Не вдалося додати співробітника.')

      return null
    } finally {
      isSaving.value = false
    }
  }

  function addEmployee(name: string): Promise<Employee | null> {
    return createEmployee({ name, role: '', phone: '', email: '' })
  }

  async function patch(
    id: number,
    changes: Record<string, unknown>,
    fallback: string,
  ): Promise<void> {
    const path = employeesPath()
    const before = find(id)

    if (path === null || before === null) {
      return
    }

    error.value = null

    try {
      const updated = await progress.track(api.patch<Employee>(`${path}/${id}`, changes))

      apply(normalizeEmployee(updated))
    } catch (cause) {
      apply(before)
      error.value = message(cause, fallback)
    }
  }

  async function updateEmployee(id: number, form: EmployeeForm): Promise<void> {
    await patch(id, { ...buildEmployeePayload(form) }, 'Не вдалося зберегти зміни.')
  }

  async function setEmployeeStatus(id: number, status: EmployeeStatus): Promise<void> {
    await patch(id, { status }, 'Не вдалося змінити статус.')
  }

  async function setEmployeeNotes(id: number, notes: string): Promise<void> {
    await patch(id, { notes: notes.trim() }, 'Не вдалося зберегти опис.')
  }

  async function removeEmployee(id: number): Promise<boolean> {
    const path = employeesPath()

    if (path === null) {
      return false
    }

    error.value = null

    try {
      await progress.track(api.delete(`${path}/${id}`))
    } catch (cause) {
      error.value = message(cause, 'Не вдалося видалити співробітника.')

      return false
    }

    items.value = items.value.filter((item) => item.id !== id)

    return true
  }

  function reset(): void {
    error.value = null
  }

  return {
    items,
    isLoading,
    isSaving,
    loaded,
    error,
    find,
    reset,
    fetchEmployees,
    fetchEmployee,
    createEmployee,
    addEmployee,
    updateEmployee,
    setEmployeeStatus,
    setEmployeeNotes,
    removeEmployee,
  }
})
