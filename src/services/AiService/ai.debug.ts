import { cleanCodeBlock } from '../../utils/patchUtils';
import { post, stripThinkTags } from './ai.base';

export const AiDebugService = {
    async debugError(apiKey: string, errorText: string): Promise<string | null> {
        return post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior debugging expert.

IMPORTANT RULES FOR CODE PATCHES:
- Return ONLY the specific function(s) that need to be changed — do NOT return the entire file.
- The patch must contain the complete corrected function including its signature and closing brace.
- Use the real filename only (e.g., utils.ts). Never use placeholder paths like path/to/file.js.
- If multiple functions need fixing, create a separate FILE block for each function.

Respond strictly in this format:

## Root Cause
<explanation>

## Suggested Fix
<explanation>

## Confidence
<number between 0 and 100>

## Code Patch

### FILE: filename.ts
\`\`\`
function fixedFunctionName(...) {
  // corrected implementation only
}
\`\`\`

Return markdown only. Do not include imports, exports, or unrelated code in the patch.`
            },
            { role: 'user', content: errorText }
        ], { max_tokens: 2000, temperature: 0.3 });
    },

    async explainError(
        apiKey: string,
        errorMessage: string,
        errorLine: string,
        codeContext: string,
        language: string
    ): Promise<{ plain: string; fix: string; example?: string } | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a friendly ${language} coding mentor explaining errors in plain English.
Analyze the error and explain it simply, like talking to a junior developer.

Respond ONLY in this exact JSON format:
{
  "plain": "plain English explanation of what went wrong (1-2 sentences, no jargon)",
  "fix": "specific actionable fix (1-2 sentences)",
  "example": "short code example showing the fix (optional, max 3 lines, only if helpful)"
}

Rules:
- plain: explain the ROOT CAUSE not just repeat the error message
- fix: be specific to the actual code shown
- example: show the corrected line only, not the whole function
- Keep everything concise — this appears in a hover tooltip
- Return valid JSON only. No markdown. No text outside JSON.`
            },
            {
                role: 'user',
                content: `Language: ${language}\nError: ${errorMessage}\nError line: ${errorLine}\n\nCode context:\n${codeContext.slice(0, 1000)}`
            }
        ], { max_tokens: 400, temperature: 0.2 });

        if (!raw) return null;
        try {
            const cleaned = stripThinkTags(raw).replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch { return null; }
    },

    async analyzeTerminalError(
        apiKey: string,
        errorOutput: string,
        platform: NodeJS.Platform
    ): Promise<string | null> {
        const os = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'MacOS' : 'Linux';

        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a DevOps expert. Analyze this ${os} terminal error. Return ONLY the exact command to fix it. No explanation.`
            },
            { role: 'user', content: errorOutput.slice(-1500) }
        ], { max_tokens: 200, temperature: 0.2 });

        return raw ? cleanCodeBlock(raw) : null;
    },

    async generateTerminalCommand(
        apiKey: string,
        prompt: string,
        platform: NodeJS.Platform
    ): Promise<string | null> {
        const os = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'MacOS' : 'Linux';

        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior DevOps engineer. Generate a single ${os} compatible terminal command. Return only the command. No explanation. No markdown.`
            },
            { role: 'user', content: prompt }
        ], { max_tokens: 200, temperature: 0.2 });

        return raw ? cleanCodeBlock(raw) : null;
    },

    async fixDiagnostics(
        apiKey: string,
        code: string,
        language: string,
        diagnostics: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior ${language} developer and code fixer.
You will be given code and a list of errors/warnings from the Problems panel.
Fix ALL the listed issues and return the complete corrected file.

Rules:
- Fix every single error and warning listed
- Do NOT change logic or behavior beyond what is needed to fix the issues
- Return ONLY the complete fixed file content
- No explanation, no markdown fences
- Preserve all comments, formatting style and structure
${learningContext}`
            },
            {
                role: 'user',
                content: `Problems to fix:\n${diagnostics}\n\nCode:\n${code}`
            }
        ], { max_tokens: 4000, temperature: 0.1 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async fixFailingTests(
        apiKey: string,
        testOutput: string,
        sourceCode: string,
        testCode: string,
        language: string,
        learningContext = ''
    ): Promise<{ fixedSource?: string; fixedTests?: string; explanation: string } | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an expert ${language} developer fixing failing tests.
Analyze the test failures and fix either the source code OR the test code (whichever is wrong).

Respond ONLY in this exact JSON format:
{
  "explanation": "what was wrong and what you fixed (2-3 sentences)",
  "fixedSource": "complete fixed source code (if source had the bug)",
  "fixedTests": "complete fixed test code (if tests were wrong)"
}

Rules:
- Only include fixedSource if the SOURCE CODE needs fixing
- Only include fixedTests if the TESTS need fixing
- Sometimes BOTH need fixing — include both in that case
- Return the COMPLETE file content, not just the changed parts
- No markdown fences in the code values
- Return valid JSON only. No text outside JSON.
${learningContext}`
            },
            {
                role: 'user',
                content: `Test failures:\n${testOutput.slice(0, 2000)}\n\nSource code:\n${sourceCode.slice(0, 2000)}\n\nTest code:\n${testCode.slice(0, 2000)}`
            }
        ], { max_tokens: 3000, temperature: 0.2 });

        if (!raw) return null;
        try {
            const cleaned = stripThinkTags(raw).replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch { return null; }
    },

    async findRootCause(
        apiKey: string,
        context: import('../../services/RootCauseService').RootCauseContext,
        learningContext = ''
    ): Promise<string | null> {
        const filesContext = context.relatedFiles
            .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
            .join('\n\n');

        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an elite debugger and software architect. Perform a deep root cause analysis.

Analyze ALL of the following:
1. The stack trace / error message
2. The actual source code files involved
3. Recent git changes that may have introduced the bug

Respond in this exact format:

## 🔍 Root Cause
Clear explanation of WHY this error occurs (not just what the error says)

## 📍 Error Origin
- Exact file and line where the bug originates
- What went wrong at that specific point

## 🔗 Code Path
Step-by-step trace of how execution reached the error:
1. Entry point
2. Each function call
3. Where it fails

## 🕐 Likely Introduced By
- Which recent change (if any) likely caused this
- What was the breaking change

## 🛠️ Fix
Specific code fix with before/after example

## 🧪 How to Verify Fix
- How to test that the fix works
- Edge cases to check

## 🛡️ Prevention
How to prevent this class of bug in future

Use markdown. Be precise and actionable.
${learningContext}`
            },
            {
                role: 'user',
                content: `## Stack Trace / Error:\n\`\`\`\n${context.stackTrace}\n\`\`\`\n\n## Related Source Files:\n${filesContext}\n\n## Recent Git Changes:\n\`\`\`\n${context.recentChanges}\n\`\`\``
            }
        ], { max_tokens: 4000, temperature: 0.2 });

        return raw ? stripThinkTags(raw) : null;
    },
};
