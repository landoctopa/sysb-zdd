import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildSignalAnalysisPrompt } from '@/lib/skills/registry';

export async function POST(req: Request) {
    try {
        // 1. Ingest the raw signal parameter from the frontend request
        const { rawSignalId } = await req.json();
        if (!rawSignalId) {
            return NextResponse.json({ error: 'Missing rawSignalId parameter' }, { status: 400 });
        }

        // 2. Initialize the Supabase server client
        const supabase = await createClient();

        // 3. Authenticate the user context to enforce cross-tenant isolation
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 4. Fetch the target raw signal trigger record from the global table index
        const { data: rawSignal, error: rawError } = await supabase
            .from('raw_signals')
            .select('*')
            .eq('id', rawSignalId)
            .single();

        if (rawError || !rawSignal) {
            return NextResponse.json({ error: 'Source market signal not found' }, { status: 404 });
        }

        // 5. Fetch user profile alignment data to feed Iris's skills
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*') // Changed from narrow string columns to '*' to match the full Row type
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User target profile metrics not found' }, { status: 404 });
        }

        // 6. Call our type-safe prompt compiler to combine active skills and database context
        const requestedSkills = ['trigger-event-detection', 'ideal-customer-profile-matching'];
        const finalSystemPrompt = buildSignalAnalysisPrompt(requestedSkills, { profile, rawSignal });

        // 7. Dispatch the request to the DeepSeek chat completions array
        const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional business analyst. Output valid JSON matching the exact key signatures requested by the user.'
                    },
                    {
                        role: 'user',
                        content: finalSystemPrompt
                    },
                ],
                // Forces DeepSeek to adhere strictly to a JSON schema output
                response_format: { type: 'json_object' },
            }),
        });

        // 8. Handle API network exceptions cleanly
        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('[Iris Ingestion Analysis Error]:', aiResponse.status, errorText);
            return NextResponse.json({ error: 'Strategic generation failed' }, { status: 502 });
        }

        const aiData = await aiResponse.json();
        const dossier = JSON.parse(aiData.choices[0].message.content);

        // 9. Return the parsed strategic dossier payload directly back to the browser
        return NextResponse.json(dossier);

    } catch (err: any) {
        console.error('[api/signals/analyze/POST Exception]:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}