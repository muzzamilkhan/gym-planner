'use client'

import { useEffect, useState } from 'react'
import type { Program } from '@/lib/engine'
import { defaultProgram } from '@/lib/defaults'
import { STORAGE_KEY } from '@/hooks/use-program'
import { Editor } from '@/components/editor'

export default function Home() {
  const [initial, setInitial] = useState<{ program: Program; editId?: string; viewId?: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setInitial({ program: defaultProgram() })
      return
    }
    fetch(`/api/programs/${stored}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) =>
        body.access === 'edit'
          ? setInitial({ program: body.data, editId: body.editId, viewId: body.viewId })
          : setInitial({ program: defaultProgram() }),
      )
      .catch(() => setInitial({ program: defaultProgram() }))
  }, [])

  if (!initial) return null
  return <Editor initial={initial} />
}
