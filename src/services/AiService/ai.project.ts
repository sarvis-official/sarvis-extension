import { ChatMessage } from '../../types';
import { post, stripThinkTags } from './ai.base';

export const AiProjectService = {
    async chat(
        apiKey: string,
        message: string,
        fileContext: string,
        history: ChatMessage[] = [],
        memoryContext = ''
    ): Promise<string> {
        const systemPrompt = `You are Sarvis, an expert AI coding assistant built into VS Code.
You help developers write better code, debug issues, explain concepts, and suggest improvements.
Be concise, practical, and code-focused. Use markdown formatting with code blocks when relevant.
${fileContext ? `\nCurrent file context:\n${fileContext}` : ''}
${memoryContext ? `\n${memoryContext}` : ''}`;

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: systemPrompt
            },

            ...history.slice(0, -1),

            {
                role: 'user',
                content: message
            }
        ].filter(
            (m) => m.content.trim().length > 0
        ) as ChatMessage[];

        const reply = await post<string>(apiKey, messages, { max_tokens: 2048, temperature: 0.7 });
        return reply
            ? stripThinkTags(reply)
            : 'No response received.';


    },

    async codebaseQA(
        apiKey: string,
        question: string,
        relevantChunks: import('../../services/EmbeddingService').CodeChunk[]
    ): Promise<string> {
        const context = relevantChunks
            .map(c => `// ${c.filePath} (line ${c.startLine})\n${c.content}`)
            .join('\n\n---\n\n');

        const reply = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a codebase expert. Answer questions about the project using ONLY the provided code snippets. Be specific about file locations and function names. If you cannot answer from the context, say so.`
            },
            {
                role: 'user',
                content: `Codebase context:\n\`\`\`\n${context}\n\`\`\`\n\nQuestion: ${question}`
            }
        ], { max_tokens: 2000, temperature: 0.3 });

        return reply ?? 'Could not answer from codebase context.';
    },

    async generateHealthSummary(
        apiKey: string,
        healthData: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior engineering manager reviewing a codebase health report.
Based on the metrics provided, give a concise executive summary.

Respond in this exact format:

## 🎯 Executive Summary
2-3 sentences on overall codebase health for a CTO/manager

## 🔴 Critical Actions (do this week)
- Up to 3 most urgent items with specific actions

## 🟡 Short-term Improvements (this sprint)
- Up to 3 items that would have high impact

## 🟢 Positive Highlights
- What's working well in this codebase

## 📈 Health Trend
One sentence prediction: if current trends continue, what happens in 3 months?

Keep it concise and actionable. No fluff.
${learningContext}`
            },
            { role: 'user', content: healthData }
        ], { max_tokens: 800, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async analyzeTodos(
        apiKey: string,
        todos: string,
        projectContext: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software engineer doing a technical debt review.
Analyze the TODO/FIXME/HACK comments in this codebase and provide actionable insights.

Respond in this exact format:

## 📊 Technical Debt Summary
Overall assessment in 2-3 sentences

## 🔴 Fix Immediately (High Priority)
For each FIXME/BUG/XXX:
- **Location:** file:line
- **Issue:** what needs fixing
- **Suggested Fix:** specific solution

## 🟡 Address Soon (Medium Priority)
For each HACK/DEPRECATED/OPTIMIZE:
- **Location:** file:line
- **Issue:** description
- **Suggested Approach:** how to address it

## 🟢 Planned Work (Low Priority)
Group related TODOs and suggest implementation order

## 🏗️ Refactoring Opportunities
TODOs that suggest architectural improvements

## ⏱️ Effort Estimate
- Quick wins (< 1 hour): X items
- Medium effort (1-4 hours): X items
- Large effort (> 4 hours): X items

## 📋 Recommended Sprint Plan
Suggested order to tackle these items

Use markdown. Be specific and actionable.
${learningContext}`
            },
            {
                role: 'user',
                content: `TODOs found:\n${todos}\n\nProject context:\n${projectContext}`
            }
        ], { max_tokens: 3000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async generateArchitectureDiagram(
        apiKey: string,
        projectContext: string,
        diagramType: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software architect. Generate a Mermaid.js diagram based on the project code.

Rules:
- Return ONLY valid Mermaid.js syntax
- No explanation, no markdown fences, no extra text
- Use the diagram type specified
- Make it accurate based on the actual code provided
- Include all major components, services, and relationships
- Use clear, descriptive node names
- Group related components together

Diagram types and when to use:
- graph TD: system architecture, component relationships
- flowchart TD: data flow, request flow
- sequenceDiagram: API calls, service interactions
- classDiagram: class relationships, OOP structure
- erDiagram: database schema, entity relationships
- stateDiagram-v2: state machines, lifecycle flows
- C4Context: high-level system context
${learningContext}`
            },
            {
                role: 'user',
                content: `Generate a ${diagramType} diagram for this project:\n\n${projectContext}`
            }
        ], { max_tokens: 2000, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },

    async generateArchitecture(
        apiKey: string,
        prompt: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software architect. Generate a complete project scaffold based on the user's description.

Respond ONLY in this exact JSON format with no extra text outside the JSON:

{
  "name": "project name",
  "description": "what this architecture does",
  "structure": "brief folder structure overview",
  "nextSteps": [
    "step 1 to get started",
    "step 2",
    "step 3"
  ],
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "description": "what this file does",
      "content": "complete file content here"
    }
  ]
}

Rules:
- Always include: folder structure, config files, base classes, README.md
- File paths must be relative (no leading slash)
- Content must be complete and working boilerplate — not placeholder comments
- Include .gitignore, README.md, and relevant config files always
- Match the tech stack exactly as requested
- Return valid JSON only. No markdown. No text outside the JSON object.
${learningContext}`
            },
            { role: 'user', content: prompt }
        ], { max_tokens: 4000, temperature: 0.2 });

        return raw ? stripThinkTags(raw) : null;
    },

    async planRefactor(
        apiKey: string,
        instruction: string,
        projectFiles: { path: string; content: string; language: string }[],
        learningContext = ''
    ): Promise<string | null> {
        const fileContext = projectFiles
            .map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
            .join('\n\n');

        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software architect. Plan a multi-file refactoring operation.

The user will give you a refactoring instruction and their project files.
Respond ONLY in this exact JSON format with no extra text:

{
  "description": "what you are doing",
  "summary": "brief summary of all changes",
  "files": [
    {
      "filePath": "relative/path/to/file.ts",
      "action": "modify" | "create" | "delete" | "rename",
      "newPath": "new/path.ts",
      "newContent": "full new file content here",
      "reason": "why this change is needed"
    }
  ]
}

Rules:
- action "modify": provide full new file content in newContent
- action "create": provide full file content in newContent  
- action "delete": newContent can be empty
- action "rename": provide newPath, newContent can be empty
- Always provide COMPLETE file content, never partial
- Keep the user's coding style
- Return valid JSON only, no markdown, no explanation outside JSON
${learningContext}`
            },
            {
                role: 'user',
                content: `Refactoring instruction: ${instruction}\n\nProject files:\n${fileContext}`
            }
        ], { max_tokens: 4000, temperature: 0.2 });

        return raw ? stripThinkTags(raw) : null;
    },
};
