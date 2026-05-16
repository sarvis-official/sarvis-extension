import { post, stripThinkTags } from './ai.base';

export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type InterviewTopic = 'arrays' | 'strings' | 'trees' | 'graphs' | 'dp' | 'sorting' | 'system-design' | 'oop' | 'mixed';

export interface InterviewProblem {
    id: string;
    title: string;
    difficulty: InterviewDifficulty;
    topic: InterviewTopic;
    description: string;
    examples: Array<{ input: string; output: string; explanation?: string }>;
    constraints: string[];
    hints: string[];
    starterCode: Record<string, string>;
    timeLimit: number;
}

export interface InterviewReview {
    score: number;
    verdict: 'hire' | 'lean-hire' | 'lean-no-hire' | 'no-hire';
    sections: {
        correctness: { score: number; feedback: string };
        efficiency: { score: number; feedback: string };
        codeQuality: { score: number; feedback: string };
        communication: { score: number; feedback: string };
    };
    optimizations: string[];
    bugs: string[];
    strengths: string[];
    improvements: string[];
    optimalSolution: string;
    timeComplexity: string;
    spaceComplexity: string;
    followUpQuestion: string;
}

// Default starter code per language — used as fallback and as format hint to the model
const DEFAULT_STARTER: Record<string, string> = {
    javascript: 'function solve(input) {\n    // write your solution here\n}',
    typescript: 'function solve(input: any): any {\n    // write your solution here\n}',
    python: 'def solve(input):\n    # write your solution here\n    pass',
    java: 'class Solution {\n    public Object solve(Object input) {\n        // write your solution here\n        return null;\n    }\n}',
    go: 'func solve(input interface{}) interface{} {\n    // write your solution here\n    return nil\n}',
};

/** Strip markdown fences and extract the first {...} JSON object from a string */
function extractJSON(raw: string): string | null {
    let s = stripThinkTags(raw).trim();
    // Remove markdown code fences
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    // Find outermost { ... }
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return s.slice(start, end + 1);
}

export const AiInterviewService = {

    async generateProblem(
        apiKey: string,
        difficulty: InterviewDifficulty,
        topic: InterviewTopic,
        language: string,
        previousProblems: string[] = []
    ): Promise<InterviewProblem | null> {

        const defaultTime = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 30 : 40;
        const starterExample = DEFAULT_STARTER[language] ?? DEFAULT_STARTER.javascript;

        // Keep the schema small so the response fits in max_tokens
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software engineer creating a coding interview problem.
Output ONLY a valid JSON object — no markdown, no explanation, no text outside the JSON.

Required fields:
{
  "id": "kebab-slug",
  "title": "Concise Title",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "description": "1-2 sentence problem statement.",
  "examples": [
    {"input": "...", "output": "...", "explanation": "..."},
    {"input": "...", "output": "..."}
  ],
  "constraints": ["constraint 1", "constraint 2"],
  "hints": ["gentle nudge 1", "gentle nudge 2"],
  "starterCode": "escaped single-line starter function",
  "timeLimit": ${defaultTime}
}

IMPORTANT rules:
- description: 1-2 sentences, clear and unambiguous
- examples: exactly 2
- constraints: exactly 2, keep them short
- hints: exactly 2, do NOT reveal the solution
- starterCode: a single ${language} function as an escaped string (use \\n for newlines, \\" for quotes). Format it like this example: "${starterExample.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"
- Avoid repeating: ${previousProblems.slice(-5).join(', ') || 'none'}
- Output ONLY the JSON. Nothing else.`
            },
            {
                role: 'user',
                content: `${difficulty} ${topic} problem in ${language}.`
            }
        ], { max_tokens: 800, temperature: 0.7 });

        if (!raw) {
            console.error('[Sarvis Interview] API returned no response');
            return null;
        }

        const jsonStr = extractJSON(raw);
        if (!jsonStr) {
            console.error('[Sarvis Interview] Could not extract JSON from response:', raw.slice(0, 300));
            return null;
        }

        let parsed: any;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error('[Sarvis Interview] JSON.parse failed:', (e as Error).message, '\nJSON was:', jsonStr.slice(0, 400));
            return null;
        }

        // Normalize starterCode — model may return string or object
        if (typeof parsed.starterCode === 'string') {
            const code = parsed.starterCode.replace(/\\n/g, '\n').replace(/\\"/g, '"');
            parsed.starterCode = { [language]: code };
        } else if (typeof parsed.starterCode !== 'object' || parsed.starterCode === null) {
            parsed.starterCode = { [language]: DEFAULT_STARTER[language] ?? '// write your solution here' };
        }
        // Ensure the requested language always has starter code
        if (!parsed.starterCode[language]) {
            parsed.starterCode[language] = DEFAULT_STARTER[language] ?? '// write your solution here';
        }

        // Safe defaults for any missing array fields
        parsed.examples = Array.isArray(parsed.examples) ? parsed.examples : [];
        parsed.constraints = Array.isArray(parsed.constraints) ? parsed.constraints : [];
        parsed.hints = Array.isArray(parsed.hints) ? parsed.hints : ['Think about time complexity.', 'Which data structure fits best?'];
        parsed.timeLimit = typeof parsed.timeLimit === 'number' ? parsed.timeLimit : defaultTime;

        return parsed as InterviewProblem;
    },

    async getHint(
        apiKey: string,
        problem: InterviewProblem,
        currentCode: string,
        hintIndex: number,
        language: string
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a supportive interview coach. Give a helpful nudge WITHOUT revealing the solution.
Be encouraging. 2-3 sentences max. Plain text only.`
            },
            {
                role: 'user',
                content: `Problem: ${problem.title}
Pre-written hints: ${problem.hints.join(' | ')}
Candidate code so far:\n${currentCode.slice(0, 600)}
This is hint #${hintIndex + 1}. Give a relevant nudge based on their code.`
            }
        ], { max_tokens: 150, temperature: 0.3 });

        return raw ? stripThinkTags(raw).trim() : null;
    },

    async reviewSolution(
        apiKey: string,
        problem: InterviewProblem,
        solution: string,
        language: string,
        timeSpentMinutes: number
    ): Promise<InterviewReview | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior engineer reviewing a coding interview. Be fair and constructive.
Output ONLY valid JSON — no markdown, no text outside JSON.

{
  "score": 75,
  "verdict": "lean-hire",
  "sections": {
    "correctness":   {"score": 80, "feedback": "..."},
    "efficiency":    {"score": 70, "feedback": "..."},
    "codeQuality":   {"score": 75, "feedback": "..."},
    "communication": {"score": 75, "feedback": "..."}
  },
  "optimizations": ["tip 1", "tip 2"],
  "bugs": ["bug if any"],
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1"],
  "optimalSolution": "complete correct solution as escaped string",
  "timeComplexity": "O(n) candidate / O(n) optimal",
  "spaceComplexity": "O(1) candidate / O(n) optimal",
  "followUpQuestion": "a follow-up question to extend the problem"
}

Verdict: hire>=80, lean-hire 65-79, lean-no-hire 50-64, no-hire<50.
ONLY output the JSON object.`
            },
            {
                role: 'user',
                content: `Problem: ${problem.title} (${problem.difficulty})
Language: ${language}
Time used: ${timeSpentMinutes}/${problem.timeLimit} min
Problem: ${problem.description}

Solution:
\`\`\`${language}
${solution.slice(0, 1500)}
\`\`\``
            }
        ], { max_tokens: 1500, temperature: 0.2 });

        if (!raw) return null;

        const jsonStr = extractJSON(raw);
        if (!jsonStr) {
            console.error('[Sarvis Interview] reviewSolution: no JSON found in response');
            return null;
        }

        try {
            const parsed = JSON.parse(jsonStr);
            // Normalize arrays
            parsed.optimizations = Array.isArray(parsed.optimizations) ? parsed.optimizations : [];
            parsed.bugs = Array.isArray(parsed.bugs) ? parsed.bugs : [];
            parsed.strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
            parsed.improvements = Array.isArray(parsed.improvements) ? parsed.improvements : [];
            // Unescape optimalSolution newlines if needed
            if (parsed.optimalSolution && !parsed.optimalSolution.includes('\n')) {
                parsed.optimalSolution = parsed.optimalSolution.replace(/\\n/g, '\n');
            }
            return parsed as InterviewReview;
        } catch (e) {
            console.error('[Sarvis Interview] reviewSolution parse error:', (e as Error).message);
            return null;
        }
    },

    async askFollowUp(
        apiKey: string,
        problem: InterviewProblem,
        solution: string,
        question: string,
        language: string
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior engineer in a post-submission interview discussion.
Be conversational and push the candidate's thinking. 2-3 sentences. Plain text only.`
            },
            {
                role: 'user',
                content: `Problem: ${problem.title}
Candidate's solution (${language}):\n${solution.slice(0, 800)}
Candidate says: "${question}"
Respond as the interviewer.`
            }
        ], { max_tokens: 200, temperature: 0.4 });

        return raw ? stripThinkTags(raw).trim() : null;
    }
};