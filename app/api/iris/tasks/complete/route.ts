// app/api/iris/tasks/complete/route.ts
import { NextResponse } from 'next/server';
import { completeTask } from '@/app/actions/iris';

export async function PATCH(req: Request) {
  try {
    const { leadId, taskId, taskConfigId } = await req.json();
    const result = await completeTask({ leadId, taskId, taskConfigId });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}