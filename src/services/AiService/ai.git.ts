import { post, stripThinkTags } from './ai.base';

export const AiGitService = {
    async generateCommitMessage(apiKey: string, diff: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior engineer. Generate a short, clear git commit message from this diff.
Rules:
- Max 72 characters
- Use imperative mood ("add" not "added")
- Use one of these prefixes:
  feature: new feature
  fix: bug fix
  refactor: code restructure without behavior change
  docs: documentation changes
  style: formatting, missing semicolons, whitespace
  test: adding or updating tests
  chore: build process, dependencies, config changes
  performance: performance improvements
  ci: continuous integration changes
  build: build system changes
  revert: reverting a previous commit
- Format: <type>: <short description>
- Return ONLY the commit message, nothing else.`
            },
            { role: 'user', content: diff.slice(0, 4000) }
        ], { max_tokens: 100, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },

    async summarizeChanges(apiKey: string, diff: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior code reviewer. Summarize what changed in this diff in plain English.
Use bullet points. Group by file. Be concise. Use markdown.`
            },
            { role: 'user', content: diff.slice(0, 4000) }
        ], { max_tokens: 800, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async generateChangelog(
        apiKey: string,
        commits: string,
        currentVersion: string,
        lastTag: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior engineer writing a professional changelog.
Analyze git commits and generate a well-structured changelog entry.

Respond ONLY in this exact JSON format:
{
  "version": "suggested next version (semver)",
  "date": "${new Date().toISOString().split('T')[0]}",
  "sections": {
    "features": ["feature description 1", "feature description 2"],
    "bugfixes": ["bug fix 1", "bug fix 2"],
    "performance": ["performance improvement 1"],
    "breaking": ["breaking change 1"],
    "security": ["security fix 1"],
    "chore": ["dependency update 1"],
    "docs": ["documentation update 1"]
  },
  "summary": "one sentence summary of this release",
  "highlight": "most important change in this release"
}

Rules:
- Only include sections that have items
- features: new functionality added
- bugfixes: bugs that were fixed
- breaking: changes that break existing API/behavior
- security: security-related fixes
- chore: maintenance, deps, config
- version: increment based on changes (major if breaking, minor if features, patch if only fixes)
- Return valid JSON only. No markdown. No text outside JSON.
${learningContext}`
            },
            {
                role: 'user',
                content: `Current version: ${currentVersion}\nLast tag: ${lastTag}\n\nCommits since last tag:\n${commits}`
            }
        ], { max_tokens: 1500, temperature: 0.2 });

        if (!raw) return null;
        try {
            const cleaned = stripThinkTags(raw).replace(/```json|```/g, '').trim();
            return cleaned;
        } catch { return null; }
    },

    async generateStandup(
        apiKey: string,
        commits: string,
        filesChanged: string,
        todos: string,
        currentFeature: string,
        currentBug: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are helping a developer write their daily standup report.
Based on their git commits, file changes, and current work context, generate a professional standup.

Respond ONLY in this exact JSON format:
{
  "yesterday": ["item 1", "item 2", "item 3"],
  "today": ["item 1", "item 2"],
  "blockers": ["blocker 1"] or [],
  "highlights": "one sentence summary of the most impactful work",
  "mood": "productive|focused|blocked|learning",
  "timeSpent": {
    "features": 40,
    "bugfixes": 30,
    "reviews": 20,
    "other": 10
  }
}

Rules:
- yesterday items: what was COMPLETED (past tense, specific)
- today items: what will be worked on (future tense, realistic)
- blockers: real impediments only — empty array if none
- keep items concise (max 80 chars each)
- infer today's plan from current feature/bug context
- Return valid JSON only. No markdown. No text outside JSON.
${learningContext}`
            },
            {
                role: 'user',
                content: `Recent commits (last 24h):\n${commits}\n\nFiles changed:\n${filesChanged}\n\nCurrent feature: ${currentFeature || 'Not set'}\nCurrent bug: ${currentBug || 'Not set'}\nOpen TODOs:\n${todos}`
            }
        ], { max_tokens: 800, temperature: 0.3 });

        if (!raw) return null;
        try {
            const cleaned = stripThinkTags(raw).replace(/```json|```/g, '').trim();
            return cleaned;
        } catch { return null; }
    },

    async generatePullRequest(
        apiKey: string,
        diff: string,
        commits: string,
        branch: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior engineer writing a professional GitHub Pull Request.
Analyze the git diff and commits to generate a complete PR.

Respond ONLY in this exact JSON format with no extra text:

{
  "title": "concise PR title (max 72 chars, imperative mood)",
  "type": "feature|bugfix|refactor|docs|test|chore|hotfix",
  "description": "2-3 sentence summary of what this PR does and why",
  "changes": [
    "Specific change 1",
    "Specific change 2"
  ],
  "testing": [
    "Step 1 to test this change",
    "Step 2"
  ],
  "screenshots": "describe any UI changes or write N/A",
  "breakingChanges": "describe breaking changes or write None",
  "relatedIssues": "issue numbers if mentioned in commits or write N/A",
  "checklist": [
    "Tests added/updated",
    "Documentation updated",
    "No breaking changes"
  ]
}

Return valid JSON only. No markdown. No text outside JSON.
${learningContext}`
            },
            {
                role: 'user',
                content: `Branch: ${branch}\n\nCommits:\n${commits}\n\nDiff:\n${diff.slice(0, 4000)}`
            }
        ], { max_tokens: 1500, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },
};
