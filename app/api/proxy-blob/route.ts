import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const response = await fetch(url);
        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch image: ${response.statusText}` }, { status: response.status });
        }

        const blob = await response.blob();
        const headers = new Headers();
        headers.set('Content-Type', blob.type);
        headers.set('Content-Length', blob.size.toString());

        return new NextResponse(blob, { headers });
    } catch (error: any) {
        console.error('Proxy blob error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
