import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface SecurityIssue {
    file: string;
    line?: number;
    type: 'sql-injection' | 'xss' | 'unsafe-eval' | 'weak-crypto' | 'hardcoded-secret' | 'path-traversal' | 'insecure-random' | 'command-injection' | 'open-redirect' | 'sensitive-data';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    snippet?: string;
    cwe?: string; // CWE reference
}

const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', 'coverage'];
const SUPPORTED = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.cs', '.php', '.rb'];

export const SecurityService = {

    analyzeFile(filePath: string, content: string): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        const lines = content.split('\n');
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const relativePath = ws ? path.relative(ws, filePath) : filePath;

        lines.forEach((line, i) => {
            const lineNum = i + 1;
            const trimmed = line.trim();

            // ── Hardcoded Secrets ──────────────────────────────────────────
            const secretPatterns = [
                { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i, msg: 'Hardcoded password detected' },
                { pattern: /(?:api_key|apikey|api-key)\s*[:=]\s*['"][^'"]{8,}['"]/i, msg: 'Hardcoded API key detected' },
                { pattern: /(?:secret|token)\s*[:=]\s*['"][^'"]{8,}['"]/i, msg: 'Hardcoded secret/token detected' },
                { pattern: /(?:private_key|privatekey)\s*[:=]\s*['"][^'"]{8,}['"]/i, msg: 'Hardcoded private key detected' },
                { pattern: /sk-[a-zA-Z0-9]{20,}/, msg: 'Possible OpenAI/Stripe API key hardcoded' },
                { pattern: /AKIA[0-9A-Z]{16}/, msg: 'AWS Access Key ID hardcoded — critical security risk' },
                { pattern: /mongodb(\+srv)?:\/\/[^'"]+:[^'"]+@/, msg: 'MongoDB connection string with credentials hardcoded' },
                { pattern: /postgres:\/\/[^'"]+:[^'"]+@/, msg: 'PostgreSQL connection string with credentials hardcoded' },
            ];

            secretPatterns.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern) && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'hardcoded-secret', severity: 'critical',
                        message: `${msg} at line ${lineNum} — move to environment variables`,
                        snippet: trimmed.replace(/['"][^'"]{4,}['"]/g, '"[REDACTED]"'),
                        cwe: 'CWE-798'
                    });
                }
            });

            // ── SQL Injection ──────────────────────────────────────────────
            const sqlPatterns = [
                /query\s*\(\s*[`'"]\s*SELECT.*\$\{/i,
                /query\s*\(\s*[`'"]\s*INSERT.*\$\{/i,
                /query\s*\(\s*[`'"]\s*UPDATE.*\$\{/i,
                /query\s*\(\s*[`'"]\s*DELETE.*\$\{/i,
                /execute\s*\(\s*[`'"]\s*SELECT.*\+/i,
                /"SELECT.*"\s*\+\s*\w+/i,
                /`SELECT.*\$\{[^}]+\}`/i,
            ];

            sqlPatterns.forEach(pattern => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'sql-injection', severity: 'critical',
                        message: `SQL Injection vulnerability — user input concatenated into query at line ${lineNum}. Use parameterized queries`,
                        snippet: trimmed,
                        cwe: 'CWE-89'
                    });
                }
            });

            // ── XSS ───────────────────────────────────────────────────────
            const xssPatterns = [
                { pattern: /innerHTML\s*=\s*(?!['"`]<)/, msg: 'XSS via innerHTML — use textContent or DOMPurify' },
                { pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html/, msg: 'XSS risk via dangerouslySetInnerHTML — sanitize input first' },
                { pattern: /document\.write\s*\(/, msg: 'XSS risk via document.write — avoid this API' },
                { pattern: /outerHTML\s*=/, msg: 'XSS via outerHTML assignment' },
                { pattern: /insertAdjacentHTML\s*\(/, msg: 'XSS risk via insertAdjacentHTML — sanitize input' },
            ];

            xssPatterns.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'xss', severity: 'high',
                        message: `${msg} at line ${lineNum}`,
                        snippet: trimmed,
                        cwe: 'CWE-79'
                    });
                }
            });

            // ── Unsafe Eval ────────────────────────────────────────────────
            const evalPatterns = [
                { pattern: /\beval\s*\(/, msg: 'unsafe eval() — executes arbitrary code' },
                { pattern: /new\s+Function\s*\(/, msg: 'new Function() is equivalent to eval — code injection risk' },
                { pattern: /setTimeout\s*\(\s*['"`]/, msg: 'setTimeout with string argument evaluates code — use function instead' },
                { pattern: /setInterval\s*\(\s*['"`]/, msg: 'setInterval with string argument evaluates code — use function instead' },
            ];

            evalPatterns.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'unsafe-eval', severity: 'critical',
                        message: `${msg} at line ${lineNum}`,
                        snippet: trimmed,
                        cwe: 'CWE-95'
                    });
                }
            });

            // ── Weak Crypto ────────────────────────────────────────────────
            const cryptoPatterns = [
                { pattern: /createHash\s*\(\s*['"]md5['"]\s*\)/, msg: 'MD5 is cryptographically broken — use SHA-256 or stronger', severity: 'high' as const },
                { pattern: /createHash\s*\(\s*['"]sha1['"]\s*\)/, msg: 'SHA-1 is deprecated — use SHA-256 or stronger', severity: 'high' as const },
                { pattern: /createCipher\s*\(/, msg: 'createCipher is deprecated and insecure — use createCipheriv', severity: 'high' as const },
                { pattern: /DES|3DES|RC4|RC2/i, msg: 'Weak cipher algorithm — use AES-256', severity: 'high' as const },
                { pattern: /Math\.random\s*\(\s*\).*(?:token|key|secret|password|auth)/i, msg: 'Math.random() is not cryptographically secure — use crypto.randomBytes()', severity: 'high' as const },
            ];

            cryptoPatterns.forEach(({ pattern, msg, severity }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'weak-crypto', severity,
                        message: `${msg} at line ${lineNum}`,
                        snippet: trimmed,
                        cwe: 'CWE-327'
                    });
                }
            });

            // ── Command Injection ──────────────────────────────────────────
            const cmdPatterns = [
                { pattern: /exec\s*\(\s*[`'"].*\$\{/, msg: 'Command injection — user input in shell command' },
                { pattern: /exec\s*\(\s*[`'"].*\+\s*\w+/, msg: 'Command injection — concatenated input in exec()' },
                { pattern: /execSync\s*\(\s*[`'"].*\$\{/, msg: 'Command injection via execSync' },
                { pattern: /spawn\s*\(\s*\w+\s*,\s*\[.*\+/, msg: 'Possible command injection via spawn' },
            ];

            cmdPatterns.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'command-injection', severity: 'critical',
                        message: `${msg} at line ${lineNum}`,
                        snippet: trimmed,
                        cwe: 'CWE-78'
                    });
                }
            });

            // ── Path Traversal ─────────────────────────────────────────────
            const pathPatterns = [
                /readFile\s*\(\s*(?:req\.|request\.|params\.|query\.)/,
                /readFileSync\s*\(\s*(?:req\.|request\.|params\.|query\.)/,
                /path\.join\s*\(.*(?:req\.|params\.|query\.)/,
            ];

            pathPatterns.forEach(pattern => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'path-traversal', severity: 'critical',
                        message: `Path traversal vulnerability — user-controlled path at line ${lineNum}. Validate and sanitize paths`,
                        snippet: trimmed,
                        cwe: 'CWE-22'
                    });
                }
            });

            // ── Sensitive Data Exposure ────────────────────────────────────
            const sensitivePatterns = [
                { pattern: /console\.log\s*\(.*(?:password|token|secret|key|auth)/i, msg: 'Sensitive data logged to console' },
                { pattern: /res\.json\s*\(.*password/i, msg: 'Password field in API response — never expose passwords' },
                { pattern: /localStorage\.setItem\s*\(.*(?:token|password|secret)/i, msg: 'Sensitive data stored in localStorage — use httpOnly cookies' },
            ];

            sensitivePatterns.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'sensitive-data', severity: 'high',
                        message: `${msg} at line ${lineNum}`,
                        snippet: trimmed,
                        cwe: 'CWE-200'
                    });
                }
            });

            // ── Insecure Random ────────────────────────────────────────────
            if (trimmed.match(/Math\.random\s*\(\s*\)/) &&
                !trimmed.match(/\/\/.*Math\.random/) &&
                lines.slice(Math.max(0, i - 2), i + 2).join(' ').match(/token|session|id|uuid|nonce/i)) {
                issues.push({
                    file: relativePath, line: lineNum,
                    type: 'insecure-random', severity: 'high',
                    message: `Insecure random for security-sensitive value at line ${lineNum} — use crypto.randomUUID() or crypto.randomBytes()`,
                    snippet: trimmed,
                    cwe: 'CWE-338'
                });
            }
        });

        return issues;
    },

    calculateRiskScore(issues: SecurityIssue[]): number {
        let deductions = 0;
        issues.forEach(i => {
            deductions += i.severity === 'critical' ? 25 :
                i.severity === 'high' ? 15 :
                    i.severity === 'medium' ? 7 : 3;
        });
        return Math.max(0, 100 - deductions);
    },

    collectFiles(maxFiles = 25): { path: string; content: string }[] {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return [];
        const results: { path: string; content: string }[] = [];
        this._walk(ws, results, maxFiles);
        return results;
    },

    _walk(dir: string, results: { path: string; content: string }[], max: number): void {
        if (results.length >= max) return;
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (results.length >= max) return;
                if (IGNORE.includes(entry.name)) continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) this._walk(full, results, max);
                else if (SUPPORTED.includes(path.extname(entry.name))) {
                    try {
                        results.push({ path: full, content: fs.readFileSync(full, 'utf-8') });
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip */ }
    }
};