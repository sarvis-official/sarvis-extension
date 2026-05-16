export function removeMarkdown(
    markdown: string
) {
    return markdown
        .replace(/```[\s\S]*?```/g, "")
        .replace(/#+\s/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .trim();
}

export function extractMarkdownCode(
    markdown: string
) {
    const regex =
        /```(\w+)?\n([\s\S]*?)```/g;

    const blocks = [];

    let match:
        | RegExpExecArray
        | null;

    while (
        (match = regex.exec(markdown))
    ) {
        blocks.push({
            language:
                match[1] || "plaintext",

            code: match[2],
        });
    }

    return blocks;
}