export function stripThinkTags(
    text: string
): string {
    return text
        .replace(
            /<think>[\s\S]*?<\/think>/gi,
            ""
        )

        .replace(
            /<think>.*$/gim,
            ""
        )

        .trim();
}