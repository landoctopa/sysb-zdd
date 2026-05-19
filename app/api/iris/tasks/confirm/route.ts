// app/api/iris/tasks/confirm/route.ts
import { NextResponse } from 'next/server';
import { confirmAndCreateTasks } from '@/app/actions/iris';

export async function POST(req: Request) {
  try {
    const { leadId, tasks } = await req.json();
    const result = await confirmAndCreateTasks({ leadId, tasks });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}