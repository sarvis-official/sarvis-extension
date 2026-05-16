import { BASE_SYSTEM_PROMPT } from "./base.prompt";

export function buildReviewPrompt(
    code: string
) {
    return `
${BASE_SYSTEM_PROMPT}

Review the following code.

Focus on:
- bugs
- security issues
- performance
- readability
- maintainability
- scalability

Code:
\`\`\`
${code}
\`\`\`

Return:
- issues found
- improvements
- optimized examples
`;
}