export interface ChatMessage {
    role:
    | "system"
    | "user"
    | "assistant";

    content: string;
}

export interface ChatCompletionRequest {
    model?: string;

    messages: ChatMessage[];

    temperature?: number;

    max_tokens?: number;

    stream?: boolean;
}

export interface ChatCompletionChoice {
    index: number;

    message: ChatMessage;

    finish_reason: string;
}

export interface ChatCompletionResponse {
    id?: string;

    object?: string;

    created?: number;

    model?: string;

    choices: ChatCompletionChoice[];
}