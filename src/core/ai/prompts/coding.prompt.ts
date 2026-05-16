import { BASE_SYSTEM_PROMPT } from "./base.prompt";

export function buildCodingPrompt(
    language: string,
    task: string
) {
    return `
${BASE_SYSTEM_PROMPT}

You are helping with software development.

Programming Language:
${language}

Task:
${task}

Requirements:
- Generate clean code
- Add proper typing
- Use best practices
- Avoid unnecessary complexity
- Make code scalable
`;
}