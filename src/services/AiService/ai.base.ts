import { ChatMessage } from '../../types';

const API_URL = 'https://api.sarvam.ai/v1/chat/completions';
const MODEL = 'sarvam-m';

export async function post<T>(
    apiKey: string,
    messages: ChatMessage[],
    options: { max_tokens?: number; temperature?: number; stop?: string[] } = {},
    signal?: AbortSignal
): Promise<T | null> {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        signal,
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: options.max_tokens ?? 1000,
            temperature: options.temperature ?? 0.3,
            ...(options.stop ? { stop: options.stop } : {})
        })
    });

    if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid API key. Please update it via the ⚙ button.');
        if (res.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
        throw new Error(`API Error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return (data?.choices?.[0]?.message?.content ?? null) as T | null;
}

export function stripThinkTags(text: string): string {
    return text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<think>.*$/gim, '')
        .trim();
}
