export const SECRET_KEY = 'sarvis.apiKey';

export type SarvisMode = 'conservative' | 'balanced' | 'creative';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface FilePatch {
    file: string;
    content: string;
}

export interface DebugResult {
    markdown: string;
    confidence: number;
    patches: FilePatch[];
}