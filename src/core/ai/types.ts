export interface ParsedCodeBlock {
    language: string;

    code: string;
}

export interface ParsedPatch {
    file: string;

    content: string;
}

export interface ParsedDiff {
    additions: number;

    deletions: number;

    files: string[];
}

export interface ParsedMarkdown {
    headings: string[];

    codeBlocks: ParsedCodeBlock[];

    content: string;
}