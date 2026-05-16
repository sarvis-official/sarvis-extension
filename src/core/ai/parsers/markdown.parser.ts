import {
    ParsedCodeBlock,
    ParsedMarkdown,
} from "../types";

export function parseMarkdown(
    markdown: string
): ParsedMarkdown {
    const headings =
        markdown.match(/^#+\s.+$/gm) || [];

    const codeBlocks: ParsedCodeBlock[] =
        [];

    const regex =
        /```(\w+)?\n([\s\S]*?)```/g;

    let match: RegExpExecArray | null;

    while (
        (match = regex.exec(markdown))
    ) {
        codeBlocks.push({
            language:
                match[1] || "plaintext",

            code: match[2].trim(),
        });
    }

    return {
        headings,

        codeBlocks,

        content: markdown,
    };
}