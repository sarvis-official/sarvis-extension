import { ChatCompletionRequest } from "./response";

export function buildChatRequest(
    request: ChatCompletionRequest
) {
    return {
        model:
            request.model || "sarvam-m",

        messages: request.messages.filter(
            (message) =>
                typeof message.content ===
                "string" &&
                message.content.trim()
                    .length > 0
        ),

        temperature:
            request.temperature ?? 0.3,

        max_tokens:
            request.max_tokens ?? 2048,

        stream: request.stream ?? false,
    };
}