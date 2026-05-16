import { SarvisMode } from '../../types';
import { cleanCodeBlock } from '../../utils/patchUtils';
import { post, stripThinkTags } from './ai.base';

export const AiCodeService = {
    async completeInline(
        apiKey: string,
        context: string,
        mode: SarvisMode,
        signal?: AbortSignal,
        learningContext = ''
    ): Promise<string | null> {
        const temperature = mode === 'creative' ? 0.4 : mode === 'balanced' ? 0.15 : 0.05;
        const max_tokens = mode === 'creative' ? 200 : 120;

        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior code completion engine. Continue ONLY from cursor position. Do NOT repeat previous code. Return only the new code. No markdown.\n${learningContext}`
            },
            { role: 'user', content: context }
        ], { max_tokens, temperature, stop: ['```', '\n\n'] }, signal);

        return raw?.trim() ?? null;
    },

    async generateFromPrompt(
        apiKey: string,
        prompt: string,
        language: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Generate clean production-ready code. Return only raw code. No markdown fences.\n${learningContext}`
            },
            { role: 'user', content: prompt }
        ], { max_tokens: 1000, temperature: 0.3 });
        return raw ? cleanCodeBlock(raw) : null;
    },

    async generateFromTemplate(
        apiKey: string,
        prompt: string,
        language: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Generate complete, production-ready code based on the template request.
Rules:
- Return ONLY the complete code
- No markdown fences, no explanation
- Code must be immediately usable
- Follow best practices for ${language}
${learningContext}`
            },
            { role: 'user', content: prompt }
        ], { max_tokens: 3000, temperature: 0.2 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async editCodeWithPrompt(
        apiKey: string,
        instruction: string,
        code: string,
        language: string,
        selectedOnly: boolean,
        learningContext = ''
    ): Promise<string | null> {
        const scope = selectedOnly ? 'selected code' : 'entire file';
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Edit the ${scope} exactly as instructed.

Rules:
- Follow the instruction precisely
- Preserve all existing functionality unless the instruction says to change it
- Keep the same coding style, naming conventions and formatting
- Return ONLY the complete edited code
- No explanation, no markdown fences, no commentary
- If the instruction is ambiguous, make the most reasonable interpretation
${learningContext}`
            },
            {
                role: 'user',
                content: `Instruction: ${instruction}\n\nCode:\n${code}`
            }
        ], { max_tokens: 4000, temperature: 0.2 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async refactorSingleFile(
        apiKey: string,
        instruction: string,
        code: string,
        language: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior ${language} developer. Refactor the provided code according to the instruction.
Rules:
- Return ONLY the complete refactored file content
- No explanation, no markdown fences
- Preserve all existing functionality
- Match the user's coding style
${learningContext}`
            },
            {
                role: 'user',
                content: `Instruction: ${instruction}\n\nCode:\n${code}`
            }
        ], { max_tokens: 4000, temperature: 0.2 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async migrateCode(
        apiKey: string,
        prompt: string,
        language: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an expert software engineer specializing in code migration.
Perform the migration exactly as described.
Rules:
- Migrate ALL code in the file completely
- Do not leave any old syntax or patterns
- Keep all business logic identical
- Return ONLY the complete migrated code
- No explanation, no markdown fences
- If a direct equivalent doesn't exist, use the closest alternative and add a comment
${learningContext}`
            },
            { role: 'user', content: prompt }
        ], { max_tokens: 4000, temperature: 0.2 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async explainCode(apiKey: string, code: string, language: string): Promise<string | null> {
        return post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior ${language} engineer. Explain the following code clearly. Include: purpose, logic flow, performance notes, and potential security risks if any.`
            },
            { role: 'user', content: code }
        ], { max_tokens: 1500, temperature: 0.3 });
    },

    async addJsDocComments(
        apiKey: string,
        code: string,
        language: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior ${language} developer. Add complete JSDoc/docstring comments to every function, class, and method in the code.
Rules:
- Add @param, @returns, @throws, @example tags
- Keep existing code exactly as-is, only add comments
- Return the complete file with comments added
- No explanation, return only the commented code\n${learningContext}`
            },
            { role: 'user', content: code }
        ], { max_tokens: 3000, temperature: 0.2 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async improveCode(apiKey: string, code: string): Promise<string> {
        const result = await post<string>(apiKey, [
            {
                role: 'system',
                content: 'You are a compiler-level code fixer. Fix syntax errors. Return ONLY valid code. Do not explain. Do not include any text outside the code.'
            },
            { role: 'user', content: code }
        ], { max_tokens: 800, temperature: 0.1, stop: ['```'] }).catch(() => null);

        if (!result || result.includes('It seems like')) return code;
        return result;
    },

    async generateSmartSnippet(
        apiKey: string,
        trigger: string,
        description: string,
        language: string,
        fileContext: string,
        learningContext = '',
        memoryContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Generate a code snippet that matches the EXACT patterns, style, and conventions from the provided codebase context.

Rules:
- Study the file context carefully — match the exact coding style
- Use the same import style (ESM vs CJS)
- Use the same naming conventions (camelCase vs snake_case)
- Use the same error handling pattern
- Use the same framework/library choices already in use
- Return ONLY the snippet code — no explanation, no markdown fences
- The snippet should be immediately usable in this file
- Include necessary imports at the top if needed
${learningContext}
${memoryContext}`
            },
            {
                role: 'user',
                content: `Trigger: ${trigger}\nTask: ${description}\nLanguage: ${language}\n\nFile context (learn the patterns from this):\n${fileContext}`
            }
        ], { max_tokens: 1000, temperature: 0.2 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async pairProgrammer(
        apiKey: string,
        code: string,
        language: string,
        instruction: string,
        learningContext = '',
        memoryContext = ''
    ): Promise<{ suggestion: string; explanation: string; improvedCode: string } | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an expert ${language} pair programmer sitting next to the developer.
Analyze the selected code and provide a suggestion.

Respond ONLY in this exact JSON format:
{
  "suggestion": "one sentence describing what you noticed or suggest (max 100 chars)",
  "explanation": "2-3 sentences explaining why and the benefit",
  "improvedCode": "the complete improved version of the code"
}

Be conversational, like a colleague. Reference specific variable/function names.
Return valid JSON only. No markdown. No text outside JSON.
${learningContext}
${memoryContext}`
            },
            {
                role: 'user',
                content: `Language: ${language}\nInstruction: ${instruction}\n\nCode:\n${code}`
            }
        ], { max_tokens: 1500, temperature: 0.3 });

        if (!raw) return null;
        try {
            const cleaned = stripThinkTags(raw).replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch { return null; }
    },

    async generateTests(
        apiKey: string,
        code: string,
        language: string,
        mode: string
    ): Promise<string | null> {
        const framework =
            language === 'javascript' || language === 'typescript' ? 'Jest' :
                language === 'python' ? 'Pytest' :
                    language === 'java' ? 'JUnit' :
                        'an appropriate testing framework';

        const instruction =
            mode.includes('Missing') ? 'Analyze the code and generate ONLY missing edge case tests. Do not rewrite existing obvious happy-path tests.' :
                mode.includes('Skeleton') ? 'Generate test skeleton only with describe blocks and empty test placeholders.' :
                    'Generate comprehensive test cases including edge cases, error cases, and mocks if required.';

        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior test engineer. Use ${framework}. ${instruction} Return only the test file code. No explanation.`
            },
            { role: 'user', content: code }
        ], { max_tokens: 2500, temperature: 0.3 });

        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },
};
