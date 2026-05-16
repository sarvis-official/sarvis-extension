import { post, stripThinkTags } from './ai.base';
import {
    Shield as ShieldStackIcon,
    Zap as BoltTraceIcon,
    Activity as PulseWaveIcon,
    Boxes as CubeGraphIcon,
    Scan as ScanPlusIcon,
    Trash2 as TrashScanIcon,
    Package as PackageMapIcon
} from 'lucide-react';



/**
 * Icon map — each analysis method has a corresponding icon component.
 *
 * Usage:
 *   const { Icon } = ANALYSIS_ICON_MAP.scanSecurity;
 *   <Icon size={20} className="text-purple-600" />
 */
export const ANALYSIS_ICON_MAP = {
    scanSecurity: { Icon: ShieldStackIcon },
    analyzePerformance: { Icon: BoltTraceIcon },
    analyzePerformanceProject: { Icon: PulseWaveIcon },
    analyzeComplexity: { Icon: CubeGraphIcon },
    analyzeCodeSmells: { Icon: ScanPlusIcon },
    findDeadCode: { Icon: TrashScanIcon },
    analyzeDependencies: { Icon: PackageMapIcon },
} as const;

export const AiAnalysisService = {
    async scanSecurity(
        apiKey: string,
        code: string,
        language: string,
        fileName: string,
        staticIssues: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior application security engineer (AppSec).
You will receive code and static analysis results.
Perform a deep security audit and find additional vulnerabilities missed by static analysis.

Respond in this exact format:

## 🔒 Security Score
X/100 — one sentence verdict

## 🔴 Critical Vulnerabilities
For each:
- **Type:** vulnerability type (SQL Injection, XSS, etc.)
- **CWE:** CWE-XXX
- **Location:** file:line
- **Description:** what the vulnerability is
- **Exploit:** how an attacker could exploit this
- **Fix:** exact code fix

## 🟠 High Severity
Same format as above

## 🟡 Medium Severity
Same format as above

## 🟢 Low / Informational
Brief list

## 📋 OWASP Coverage
Which OWASP Top 10 categories are affected:
- A01 Broken Access Control: ✅ found / ✅ not found
- A02 Cryptographic Failures: found / not found
- A03 Injection: found / not found
- A05 Security Misconfiguration: found / not found
- A07 Auth Failures: found / not found

## 🛡️ Security Hardening Checklist
- [ ] item 1
- [ ] item 2
- [ ] item 3

Use markdown. Reference actual code. Be specific about exploitability.
${learningContext}`
            },
            {
                role: 'user',
                content: `File: ${fileName}\nLanguage: ${language}\n\nStatic Analysis Found:\n${staticIssues}\n\nCode:\n\`\`\`${language}\n${code.slice(0, 4000)}\n\`\`\``
            }
        ], { max_tokens: 3000, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },

    async analyzePerformance(
        apiKey: string,
        code: string,
        language: string,
        fileName: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior performance engineer. Analyze this code for performance issues.

Respond in this exact format:

## ⚡ Performance Score
X/100 — one sentence verdict

## 🔴 Critical Issues
Issues that will cause major slowdowns in production:
- Issue description
- **Location:** file:line
- **Impact:** what happens at scale
- **Fix:** exact code fix with before/after

## 🟡 Medium Issues  
Issues that affect performance under load:
- Issue description
- **Location:** file:line
- **Fix:** how to fix

## 🟢 Quick Wins
Small changes with good performance gains

## 📊 Category Breakdown
- N+1 Queries: found/not found
- Inefficient Loops: found/not found
- Blocking Code: found/not found
- Memory Allocations: found/not found
- Unnecessary Re-renders: found/not found (React only)
- Missing Indexes: found/not found (DB code)
- Unoptimized Algorithms: found/not found

## 🏆 Top 3 Priority Fixes
1. Most impactful fix
2. Second most impactful
3. Third most impactful

Be specific. Reference actual function and variable names.
Use markdown.
${learningContext}`
            },
            {
                role: 'user',
                content: `File: ${fileName}\nLanguage: ${language}\n\nCode:\n\`\`\`${language}\n${code.slice(0, 4000)}\n\`\`\``
            }
        ], { max_tokens: 3000, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },

    async analyzePerformanceProject(
        apiKey: string,
        filesContext: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior performance engineer. Analyze multiple files for cross-cutting performance issues.

Focus on:
- N+1 query patterns across service/repository layers
- Shared inefficient utilities used everywhere
- Missing caching layers
- Blocking I/O in hot paths
- React component re-render chains
- Database query patterns
- Memory leak patterns across files

Respond in this exact format:

## ⚡ Project Performance Score
X/100 — verdict

## 🔴 Critical Issues (fix immediately)
For each issue:
- **Issue:** description
- **Files affected:** list files
- **Impact:** production impact
- **Fix:** solution

## 🟡 Medium Issues
For each issue:
- **Issue:** description
- **Files affected:** list files
- **Fix:** solution

## 🏗️ Architectural Performance Issues
Cross-cutting concerns affecting the whole project

## 🏆 Top 5 Priority Fixes
Ordered by impact

Use markdown. Be specific.
${learningContext}`
            },
            {
                role: 'user',
                content: `Project files:\n${filesContext}`
            }
        ], { max_tokens: 4000, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },

    async analyzeComplexity(
        apiKey: string,
        complexitySummary: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software architect reviewing code complexity metrics.

Respond in this exact format:

## 🎯 Complexity Overview
2-3 sentence summary of the overall codebase health

## 🔴 Most Critical (refactor first)
Top 3 most complex functions/files with specific refactoring advice

## 🟡 Watch List
Functions/files approaching dangerous complexity — monitor these

## 🛠️ Refactoring Recommendations
Specific actionable steps to reduce complexity:
1. Step with effort estimate
2. Step with effort estimate

## 📈 Complexity Trends
Patterns you notice in the complexity data

## ✅ Well-Structured Code
Acknowledge what's well-written

Use markdown. Reference actual function and file names.
${learningContext}`
            },
            { role: 'user', content: complexitySummary }
        ], { max_tokens: 2000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async analyzeCodeSmells(
        apiKey: string,
        staticSmells: string,
        code: string,
        language: string,
        fileName: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software engineer and code quality expert.
You will receive:
1. Static analysis results (already detected smells)
2. The actual source code

Your job is to do a DEEP analysis and find additional smells the static analyzer missed.

Focus on:
- Duplicate logic or copy-paste code patterns
- God classes doing too many things
- Violation of Single Responsibility Principle
- Tight coupling between components
- Potential memory leaks (unclosed resources, circular refs)
- Business logic in wrong layer
- Overly complex conditionals that should be simplified

Respond in this exact format:

## 📊 Overall Assessment
- Quality Score: X/100
- Summary in 2 sentences

## 🔴 High Severity
List each issue with: file, line if known, what's wrong, how to fix

## 🟡 Medium Severity
List each issue with: file, line if known, what's wrong, how to fix

## 🟢 Low Severity / Suggestions
Quick wins and minor improvements

## 🏆 Top 3 Priority Fixes
The 3 most impactful things to fix first, in order

Use markdown. Be specific. Reference actual function/variable names from the code.
${learningContext}`
            },
            {
                role: 'user',
                content: `File: ${fileName}\nLanguage: ${language}\n\nStatic Analysis Found:\n${staticSmells}\n\nSource Code:\n\`\`\`${language}\n${code.slice(0, 4000)}\n\`\`\``
            }
        ], { max_tokens: 3000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async findDeadCode(
        apiKey: string,
        code: string,
        language: string,
        fileName: string,
        staticFindings: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior software engineer specializing in code cleanup.
Analyze this code for dead code, unused elements, and cleanup opportunities.

Respond in this exact format:

## 🪦 Dead Code Summary
X items found — one sentence verdict

## 🔴 Definitely Dead (safe to delete)
For each item:
- **Type:** unused function/import/variable/component/file
- **Name:** exact name
- **Location:** file:line
- **Reason:** why it's dead
- **Action:** exactly what to delete

## 🟡 Probably Dead (verify before deleting)
Same format — items that look unused but may have dynamic usage

## 🟢 Cleanup Suggestions
Code that isn't dead but could be simplified or consolidated

## 📊 Impact
- Lines that can be deleted: ~X
- Files that can be deleted: X
- Estimated codebase reduction: X%

Use markdown. Be specific. Reference actual names from the code.
${learningContext}`
            },
            {
                role: 'user',
                content: `File: ${fileName}\nLanguage: ${language}\n\nStatic Analysis Found:\n${staticFindings}\n\nCode:\n\`\`\`${language}\n${code.slice(0, 4000)}\n\`\`\``
            }
        ], { max_tokens: 3000, temperature: 0.2 });
        return raw ? stripThinkTags(raw) : null;
    },

    async analyzeDependencies(
        apiKey: string,
        packageJson: string,
        outdatedList: string,
        vulnerableList: string,
        unusedList: string,
        heavyList: string,
        updateCommands: string,
        learningContext = ''
    ): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior DevOps and Node.js dependency expert.
Analyze the project's dependencies and provide actionable recommendations.

Respond in this exact format:

## 📦 Dependency Health Score
X/100 — one sentence verdict

## 🔴 Critical (fix immediately)
- Vulnerable packages with CVE details if known
- Severely outdated packages with breaking changes

## 🟡 Should Update
- Outdated packages with benefits of updating
- Deprecated packages with alternatives

## 🟢 Optimization Opportunities
- Heavy packages with lighter alternatives
- Unused packages to remove
- Duplicate functionality

## 🏗️ Architecture Suggestions
- Missing useful packages for this type of project
- Better alternatives to current packages
- Bundle size optimization tips

## 📋 Recommended package.json Changes
Specific additions/removals with reasons

## 🚀 Quick Win Commands
The most impactful commands to run right now, in order

Use markdown. Be specific about package names and versions.
${learningContext}`
            },
            {
                role: 'user',
                content: `package.json:\n${packageJson}\n\nOutdated:\n${outdatedList}\n\nVulnerable:\n${vulnerableList}\n\nUnused:\n${unusedList}\n\nHeavy packages:\n${heavyList}\n\nSuggested commands:\n${updateCommands}`
            }
        ], { max_tokens: 3000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },
};