import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { prisma } from '@/lib/db'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10)

export async function POST(req: Request) {
  const body = await req.json()

  if (typeof body.copyOf === 'string') {
    const source = await prisma.program.findFirst({
      where: { OR: [{ editId: body.copyOf }, { viewId: body.copyOf }] },
    })
    if (!source) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const created = await prisma.program.create({
      data: { editId: nanoid(), viewId: nanoid(), data: source.data as object, parentId: source.id },
    })
    return NextResponse.json({ editId: created.editId, viewId: created.viewId })
  }

  if (!body.data) return NextResponse.json({ error: 'data required' }, { status: 400 })
  const created = await prisma.program.create({
    data: { editId: nanoid(), viewId: nanoid(), data: body.data },
  })
  return NextResponse.json({ editId: created.editId, viewId: created.viewId })
}
