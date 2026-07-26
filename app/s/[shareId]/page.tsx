'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Program } from '@/lib/engine'
import { STORAGE_KEY } from '@/hooks/use-program'
import { Editor } from '@/components/editor'

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; program: Program; access: 'edit' | 'view'; editId?: string; viewId?: string }

export default function SharedProgram() {
  const { shareId } = useParams<{ shareId: string }>()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    fetch(`/api/programs/${shareId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) =>
        setState({ status: 'ready', program: b.data, access: b.access, editId: b.editId, viewId: b.viewId }),
      )
      .catch(() => setState({ status: 'missing' }))
  }, [shareId])

  if (state.status === 'loading') return null
  if (state.status === 'missing') {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="text-lg font-medium">Program not found</p>
          <a className="text-primary underline" href="/">
            Build your own
          </a>
        </div>
      </main>
    )
  }

  const copy = async () => {
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copyOf: shareId }),
    })
    if (!res.ok) return
    const { editId } = await res.json()
    localStorage.setItem(STORAGE_KEY, editId)
    location.href = '/'
  }

  return (
    <Editor
      initial={{ program: state.program, editId: state.editId, viewId: state.viewId }}
      readOnly={state.access === 'view'}
      onCopyProgram={state.access === 'view' ? copy : undefined}
    />
  )
}
