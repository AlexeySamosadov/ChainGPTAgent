import { NextResponse } from 'next/server';
import { chainGPT } from '@/lib/chaingpt/client';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { description } = body;

        if (!description) {
            return NextResponse.json({ error: 'Description required' }, { status: 400 });
        }

        const result = await chainGPT.generateContract(description);
        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }
}
