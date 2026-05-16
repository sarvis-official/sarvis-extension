import { BASE_SYSTEM_PROMPT } from "./base.prompt";

export function buildDebugPrompt(
    error: string,
    code?: string
) {
    return `
${BASE_SYSTEM_PROMPT}

Help debug this issue.

Error:
${error}

Code:
\`\`\`
${code || "No code provided"}
\`\`\`

Tasks:
- explain root cause
- explain why it happened
- provide fix
- provide improved code
`;
}