// app/api/iris/drafts/route.ts
import { NextResponse } from 'next/server';
import { saveIrisDraft } from '@/app/actions/iris';

export async function POST(req: Request) {
  try {
    const { leadId, actionKey, payload } = await req.json();
    const result = await saveIrisDraft({ leadId, actionKey, payload });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}