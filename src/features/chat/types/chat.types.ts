export interface ChatMessage {
    role:
    | "user"
    | "assistant"
    | "system";

    content: string;
}

export interface ChatRequest {
    message: string;

    context?: string;
}

export interface ChatResponse {
    content: string;
}