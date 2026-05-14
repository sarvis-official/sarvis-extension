# Security Policy

## Supported Versions

The following versions of Sarvis currently receive security updates and support.

| Version | Supported |
| ------- | ---------- |
| 1.x     | Yes        |
| 0.x     | Limited    |

---

# Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

Please DO NOT create a public GitHub issue for security-related problems.

Instead, contact:

```txt
your-email@example.com
```

---

# What To Include

Please include the following information in your report:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Affected versions
- Screenshots or logs if applicable
- Suggested fix if available

---

# Response Process

After receiving a report, maintainers will:

1. Confirm the issue
2. Investigate the vulnerability
3. Assess impact and severity
4. Work on a fix
5. Release a patched version if necessary

We aim to respond as quickly as possible to valid security reports.

---

# Security Best Practices

Contributors and users should follow these practices:

- Never commit API keys or secrets
- Use environment variables for sensitive configuration
- Keep dependencies updated
- Review third-party packages carefully
- Avoid exposing user data
- Follow least-privilege principles

---

# Sensitive Data

Sarvis may interact with:

- Source code
- Workspace files
- Environment variables
- AI provider APIs

Contributors must avoid:

- Logging sensitive information
- Storing secrets insecurely
- Exposing tokens in pull requests
- Uploading confidential user data

---

# Dependency Security

We recommend regularly running:

```bash
yarn audit
```

and updating vulnerable dependencies promptly.

---

# AI & Extension Security Considerations

As an AI-powered extension, Sarvis must carefully handle:

- Prompt injection risks
- Malicious code suggestions
- Workspace access permissions
- External API communication
- Command execution safety

Future AI-agent capabilities will be designed with strict permission boundaries and user control.

---

# Responsible Disclosure

Please allow maintainers reasonable time to investigate and patch vulnerabilities before public disclosure.

---

# Scope

This policy applies to:

- VS Code extension code
- Webview frontend
- Build scripts
- AI integrations
- Repository infrastructure
- GitHub workflows

---

# Future Security Goals

Planned improvements include:

- Sandboxed tool execution
- Permission-based actions
- Secure credential management
- Local model support
- Telemetry transparency
- Extension permission hardening

---

# Acknowledgements

We appreciate responsible disclosure efforts that help improve the security and reliability of Sarvis.