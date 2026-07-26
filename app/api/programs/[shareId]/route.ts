import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: { shareId: string } }

export async function GET(_req: Request, { params }: Params) {
  const { shareId } = params
  const record = await prisma.program.findFirst({
    where: { OR: [{ editId: shareId }, { viewId: shareId }] },
  })
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (record.editId === shareId) {
    return NextResponse.json({
      data: record.data,
      access: 'edit',
      editId: record.editId,
      viewId: record.viewId,
    })
  }
  return NextResponse.json({ data: record.data, access: 'view', viewId: record.viewId })
}

export async function PUT(req: Request, { params }: Params) {
  const { shareId } = params
  const record = await prisma.program.findFirst({
    where: { OR: [{ editId: shareId }, { viewId: shareId }] },
  })
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (record.editId !== shareId) return NextResponse.json({ error: 'read-only link' }, { status: 403 })
  const body = await req.json()
  if (!body.data) return NextResponse.json({ error: 'data required' }, { status: 400 })
  await prisma.program.update({ where: { id: record.id }, data: { data: body.data } })
  return NextResponse.json({ ok: true })
}
