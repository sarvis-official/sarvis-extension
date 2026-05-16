import { stripThinkTags } from "../../../core/ai/parsers/think.parser";

export function parseChatResponse(
    response: string
) {
    return stripThinkTags(
        response
    ).trim();
}