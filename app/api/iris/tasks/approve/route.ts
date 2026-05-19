// app/api/iris/tasks/approve/route.ts
import { NextResponse } from 'next/server';
import { approveTask } from '@/app/actions/iris';

export async function PATCH(req: Request) {
  try {
    const { leadId, taskId } = await req.json();
    const result = await approveTask({ leadId, taskId });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}