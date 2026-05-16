# Security Policy

## Supported Versions

The following versions of Sarvis currently receive security updates and support.

| Version | Supported |
|----------|------------|
| 1.x      | Yes |
| < 1.0    | No |

---

## Reporting a Vulnerability

If you discover a security vulnerability in Sarvis, please report it responsibly and privately.

### Please include:

- Detailed description of the vulnerability
- Steps to reproduce
- Expected and actual behavior
- Potential impact
- Screenshots or logs (if applicable)
- Suggested mitigation or fix (optional)

---

## Reporting Channels

You can report vulnerabilities through:

- GitHub Security Advisories
- GitHub Issues (for non-sensitive reports)

For critical vulnerabilities, avoid public disclosure until the issue has been reviewed and resolved.

---

## Security Practices

Sarvis follows security-focused development practices including:

- Dependency monitoring
- Secure authentication handling
- Environment variable protection
- Input validation and sanitization
- Error handling improvements
- Principle of least privilege
- Regular package updates

---

## Third-Party Dependencies

Sarvis may use third-party libraries and APIs. Dependencies are reviewed periodically for known vulnerabilities.

Developers are encouraged to run:

```bash
npm audit
```

and keep dependencies updated.

## Responsible Disclosure

We appreciate responsible disclosure practices that help improve the security and reliability of the project for everyone.

## Disclaimer

While efforts are made to maintain a secure and reliable extension, no software can be guaranteed to be completely secure. Users should always follow standard security best practices when using developer tools and AI integrations.
