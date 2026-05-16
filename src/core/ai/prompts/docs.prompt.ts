import { BASE_SYSTEM_PROMPT } from "./base.prompt";

export function buildDocsPrompt(
    code: string
) {
    return `
${BASE_SYSTEM_PROMPT}

Generate documentation for this code.

Code:
\`\`\`
${code}
\`\`\`

Requirements:
- explain purpose
- explain functions
- explain parameters
- explain return values
- include examples
- markdown format
`;
}