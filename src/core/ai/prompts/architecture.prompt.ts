import { BASE_SYSTEM_PROMPT } from "./base.prompt";

export function buildArchitecturePrompt(
    projectDescription: string
) {
    return `
${BASE_SYSTEM_PROMPT}

Design scalable software architecture.

Project:
${projectDescription}

Focus on:
- scalability
- maintainability
- modularity
- performance
- clean architecture
- microservices readiness
- deployment readiness

Return:
- architecture overview
- folder structure
- tech stack
- data flow
- recommendations
`;
}