import { BASE_SYSTEM_PROMPT } from "./base.prompt";

export function buildTestingPrompt(
    code: string,
    framework: string
) {
    return `
${BASE_SYSTEM_PROMPT}

Generate test cases.

Framework:
${framework}

Code:
\`\`\`
${code}
\`\`\`

Requirements:
- edge cases
- unit tests
- meaningful assertions
- clean structure
- proper mocking if needed
`;
}