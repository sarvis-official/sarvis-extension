import { ParsedDiff } from "../types";

export function parseDiff(
    diff: string
): ParsedDiff {
    const additions =
        (diff.match(/^\+/gm) || [])
            .length;

    const deletions =
        (diff.match(/^\-/gm) || [])
            .length;

    const files =
        Array.from(
            diff.matchAll(
                /^\+\+\+\s+b\/(.+)$/gm
            )
        ).map((match) => match[1]);

    return {
        additions,

        deletions,

        files,
    };
}