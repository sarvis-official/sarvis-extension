import { ParsedPatch } from "../types";

export function parsePatch(
    input: string
): ParsedPatch[] {
    const patches: ParsedPatch[] =
        [];

    const regex =
        /### FILE: (.+?)\n```[\s\S]*?\n([\s\S]*?)```/g;

    let match: RegExpExecArray | null;

    while (
        (match = regex.exec(input))
    ) {
        patches.push({
            file: match[1].trim(),

            content: match[2].trim(),
        });
    }

    return patches;
}