import { BASE_SYSTEM_PROMPT } from "../../../core/ai/prompts/base.prompt";

export function buildChatPrompt(
    message: string,
    context?: string
) {
    return `
${BASE_SYSTEM_PROMPT}

You are helping a developer.

Context:
${context || "No context"}

User Message:
${message}
`;
}