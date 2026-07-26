'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Program } from '@/lib/engine'

export type SaveState = 'saved' | 'saving' | 'error'

export const STORAGE_KEY = 'gym-planner:editId'

export function useProgram(initial: { program: Program; editId?: string; viewId?: string }) {
  const [program, setProgramState] = useState(initial.program)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [editId, setEditId] = useState<string | undefined>(initial.editId)
  const [viewId, setViewId] = useState<string | undefined>(initial.viewId)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const latest = useRef(program)
  const ids = useRef({ editId, viewId })
  ids.current = { editId, viewId }

  const save = useCallback(async () => {
    setSaveState('saving')
    try {
      if (!ids.current.editId) {
        const res = await fetch('/api/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: latest.current }),
        })
        if (!res.ok) throw new Error('save failed')
        const { editId: e, viewId: v } = await res.json()
        setEditId(e)
        setViewId(v)
        localStorage.setItem(STORAGE_KEY, e)
      } else {
        const res = await fetch(`/api/programs/${ids.current.editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: latest.current }),
        })
        if (!res.ok) throw new Error('save failed')
      }
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [])

  const setProgram = useCallback(
    (update: Program | ((p: Program) => Program)) => {
      setProgramState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update
        latest.current = next
        clearTimeout(timer.current)
        timer.current = setTimeout(save, 1000)
        return next
      })
    },
    [save],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return { program, setProgram, saveState, editId, viewId, retry: save }
}
