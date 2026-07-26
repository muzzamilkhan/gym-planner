'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import type { Program } from '@/lib/engine'
import type { SaveState } from '@/hooks/use-program'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ThemeToggle } from '@/components/theme-toggle'

function CopyLinkRow({ label, id }: { label: string; id?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2"
      disabled={!id}
      onClick={() => {
        if (!id) return
        navigator.clipboard.writeText(`${location.origin}/s/${id}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied!' : label}
    </Button>
  )
}

export function Header({
  program,
  readOnly,
  saveState,
  editId,
  viewId,
  retry,
  onCopyProgram,
  onChangeName,
  onChangeDescription,
}: {
  program: Program
  readOnly: boolean
  saveState: SaveState
  editId?: string
  viewId?: string
  retry: () => void
  onCopyProgram?: () => void
  onChangeName: (name: string) => void
  onChangeDescription: (description: string) => void
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-3">
      <div className="min-w-0 flex-1">
        {readOnly ? (
          <>
            <h1 className="truncate text-lg font-semibold">{program.name}</h1>
            {program.description && (
              <p className="truncate text-sm text-muted-foreground">{program.description}</p>
            )}
          </>
        ) : (
          <>
            <input
              aria-label="Program name"
              className="w-full max-w-md rounded bg-transparent px-1 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
              value={program.name}
              onChange={(e) => onChangeName(e.target.value)}
            />
            <input
              aria-label="Program description"
              placeholder="Add a description…"
              className="w-full max-w-md rounded bg-transparent px-1 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={program.description}
              onChange={(e) => onChangeDescription(e.target.value)}
            />
          </>
        )}
      </div>

      {!readOnly && (
        <div className="text-xs text-muted-foreground">
          {saveState === 'saved' && 'Saved'}
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'error' && (
            <button className="text-destructive underline" onClick={retry}>
              Save failed — Retry
            </button>
          )}
        </div>
      )}

      {readOnly ? (
        onCopyProgram && (
          <Button onClick={onCopyProgram} className="gap-2">
            <Copy className="h-4 w-4" /> Copy this program
          </Button>
        )
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1">
            <CopyLinkRow label="Copy view link" id={viewId} />
            <CopyLinkRow label="Copy edit link" id={editId} />
            {!editId && (
              <p className="px-3 py-1 text-xs text-muted-foreground">Saves first — make a change.</p>
            )}
          </PopoverContent>
        </Popover>
      )}

      <ThemeToggle />
    </header>
  )
}
