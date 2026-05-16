import { BASE_SYSTEM_PROMPT } from "./base.prompt";

export function buildCommitPrompt(
    diff: string
) {
    return `
${BASE_SYSTEM_PROMPT}

Generate a professional git commit message.

Git Diff:
\`\`\`
${diff}
\`\`\`

Requirements:
- concise
- meaningful
- conventional commit style
`;
}