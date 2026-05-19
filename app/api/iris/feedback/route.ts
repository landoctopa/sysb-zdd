// app/api/iris/feedback/route.ts
import { NextResponse } from 'next/server';
import { submitTaskFeedback } from '@/app/actions/iris';

export async function POST(req: Request) {
  try {
    const { leadId, taskConfigId, answers, savesTo } = await req.json();
    const result = await submitTaskFeedback({ leadId, taskConfigId, answers, savesTo });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}