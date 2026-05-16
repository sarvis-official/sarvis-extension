import { post, stripThinkTags } from './ai.base';

export const AiReviewService = {
    async reviewFile(apiKey: string, code: string, language: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior ${language} code reviewer. Perform a thorough code review.

Return your review in this exact format:

## 🚀 Performance Issues
- List each issue with line reference and fix suggestion

## 🔒 Security Issues  
- List each vulnerability with severity (🔴 Critical / 🟡 Medium / 🟢 Low)

## 🧹 Clean Code Violations
- God classes, long methods, magic numbers, dead code, etc.

## 📝 Naming Suggestions
- Variables, functions, classes that should be renamed and why

## ✅ Summary
- Overall score out of 10
- Top 3 priority fixes

If a section has no issues, write "None found."
Use markdown. Be specific with line numbers where possible.`
            },
            { role: 'user', content: code.slice(0, 4000) }
        ], { max_tokens: 3000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async reviewDiff(apiKey: string, diff: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior code reviewer. Review this diff and provide:

## Code Quality
- Issues, anti-patterns, style problems

## Suggestions
- Improvements with code examples if needed

## Risks
- 🔴 High / 🟡 Medium / 🟢 Low risk changes and why

Be specific. Use markdown.`
            },
            { role: 'user', content: diff.slice(0, 4000) }
        ], { max_tokens: 1500, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async reviewDiffCode(apiKey: string, diff: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior code reviewer. Review only the changed lines in this diff.

Return your review in this exact format:

## 🚀 Performance Issues
- Issues introduced by these changes

## 🔒 Security Issues
- 🔴 Critical / 🟡 Medium / 🟢 Low

## 🧹 Clean Code Violations
- Quality issues in the changed code only

## 📝 Naming Suggestions
- Better names for anything introduced in this diff

## ✅ Verdict
- LGTM ✅ / Needs Changes ❌ / Minor Nits 🟡
- One sentence summary

Use markdown.`
            },
            { role: 'user', content: diff.slice(0, 4000) }
        ], { max_tokens: 2000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async reviewPR(apiKey: string, diff: string, prTitle: string, prDescription: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior engineer doing a thorough PR review.

Return your review in this exact format:

## 📋 PR Summary
- What this PR does in plain English

## 🚀 Performance Issues
- Any performance regressions or improvements needed

## 🔒 Security Issues
- 🔴 Critical / 🟡 Medium / 🟢 Low vulnerabilities

## 🧹 Clean Code Violations
- Code quality issues, anti-patterns, complexity

## 📝 Naming Suggestions
- Better names for variables, functions, files

## ⚠️ Breaking Changes
- API changes, removed functionality, schema changes

## ✅ Review Decision
- APPROVE / REQUEST CHANGES / NEEDS DISCUSSION
- Reasoning in 2-3 sentences

Use markdown. Be specific and actionable.`
            },
            {
                role: 'user',
                content: `PR Title: ${prTitle}\nDescription: ${prDescription}\n\nDiff:\n${diff.slice(0, 4000)}`
            }
        ], { max_tokens: 3000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async detectRiskyChanges(apiKey: string, diff: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a security and reliability expert. Analyze this diff for risky changes.

Flag:
- 🔴 Breaking changes (API changes, removed functions, schema changes)
- 🔴 Security issues (hardcoded secrets, SQL injection, XSS, auth bypass)
- 🟡 Performance issues (N+1 queries, missing indexes, large loops)
- 🟡 Error handling gaps
- 🟢 Minor concerns

If no risks found, say "✅ No significant risks detected."
Use markdown.`
            },
            { role: 'user', content: diff.slice(0, 4000) }
        ], { max_tokens: 1000, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },

    async quickReviewOnSave(
        apiKey: string,
        code: string,
        language: string,
        fileName: string
    ): Promise<Array<{ type: string; severity: string; message: string; line?: number; fix?: string }> | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a fast code reviewer. Do a quick scan for ONLY the most important issues.
Focus on: critical bugs, security vulnerabilities, obvious performance problems.
IGNORE: style issues, minor suggestions, formatting.

Respond ONLY in this exact JSON format:
[
  {
    "type": "security|performance|quality",
    "severity": "critical|high|medium",
    "message": "specific issue description (max 80 chars)",
    "line": 0,
    "fix": "one-line fix suggestion"
  }
]

Rules:
- Return EMPTY ARRAY [] if no significant issues found
- Maximum 5 items — only the most important
- Never return low severity items
- Return valid JSON array only. No markdown. No text outside JSON.`
            },
            {
                role: 'user',
                content: `File: ${fileName}\nLanguage: ${language}\n\nCode:\n${code.slice(0, 3000)}`
            }
        ], { max_tokens: 500, temperature: 0.1 });

        if (!raw) return null;
        try {
            const cleaned = stripThinkTags(raw).replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return Array.isArray(parsed) ? parsed : null;
        } catch { return null; }
    },
};
