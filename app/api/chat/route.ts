import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ChatRequest {
    messages: {
        role: 'user' | 'assistant';
        content: string;
        image?: string;
    }[];
    context?: {
        videoId?: string;
        currentTimestamp?: number;
    };
}

export async function POST(request: Request) {
    try {
        const body: ChatRequest = await request.json();
        const { messages } = body;

        if (!messages || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Messages are required' },
                { status: 400 }
            );
        }

        const lastMessage = messages[messages.length - 1];
        const hasImage = !!lastMessage.image;
        const userText = lastMessage.content.toLowerCase();

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        let responseContent = '';

        if (hasImage) {
            responseContent = "I've analyzed the image you uploaded. ";

            if (userText.includes('change') || userText.includes('modify')) {
                responseContent += "I see what you want to change. I'll apply those stylistic adjustments to your video based on this reference.";
            } else if (userText.includes('background')) {
                responseContent += "Cool background concept. I can use this to generate a similar environment for your video.";
            } else if (userText.includes('color') || userText.includes('style')) {
                responseContent += "I've extracted the color palette and style from this image to apply to your project.";
            } else {
                responseContent += "It looks great! I'll use it as a visual reference for the video generation.";
            }
        } else {
            if (userText.includes('music') || userText.includes('audio') || userText.includes('sound')) {
                responseContent = "I can help with the audio. Would you like me to generate a soundtrack or adjust the volume levels?";
            } else if (userText.includes('cut') || userText.includes('trim') || userText.includes('shorten')) {
                responseContent = "I can help you trim the video. Just let me know which specific parts you'd like to keep or remove.";
            } else if (userText.includes('export') || userText.includes('save')) {
                responseContent = "Ready to export? You can click the 'Export Video' button in the top right when you're done editing.";
            } else {
                responseContent = "Understood. I'm updating your project based on your instructions. Is there anything specific regarding the style or mood you'd like to adjust?";
            }
        }

        return NextResponse.json({
            success: true,
            message: {
                role: 'assistant',
                content: responseContent
            }
        });

    } catch (error) {
        console.error('[Chat] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Chat processing failed' },
            { status: 500 }
        );
    }
}
