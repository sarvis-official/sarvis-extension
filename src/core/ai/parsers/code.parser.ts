import { ParsedCodeBlock } from "../types";

export function extractCodeBlocks(
    text: string
): ParsedCodeBlock[] {
    const blocks: ParsedCodeBlock[] =
        [];

    const regex =
        /```(\w+)?\n([\s\S]*?)```/g;

    let match: RegExpExecArray | null;

    while (
        (match = regex.exec(text))
    ) {
        blocks.push({
            language:
                match[1] || "plaintext",

            code: match[2].trim(),
        });
    }

    return blocks;
}