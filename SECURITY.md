# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Portboard, please report it responsibly:

### How to Report

1. **Email**: Send a detailed report to the maintainers via GitHub Issues with the label `security` (mark as private if GitHub supports it)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### What to Expect

- **Response time**: We aim to respond within 48 hours
- **Updates**: We'll keep you informed about our progress
- **Credit**: We'll acknowledge your responsible disclosure (unless you prefer to remain anonymous)

## Security Best Practices

Portboard is designed with security-first principles:

### Default Security Settings

- **Localhost-only binding**: Server binds to `127.0.0.1` by default
- **No telemetry**: No data collection or tracking
- **Process isolation**: Can only kill processes owned by the current user
- **Docker safety**: Warns before dangerous operations on Docker containers

### Recommended Usage

1. **Keep Portboard updated**: Run `npm update` regularly
2. **Review configuration**: Check `.env` for security-sensitive settings
3. **Localhost-only**: Never bind to `0.0.0.0` unless necessary
4. **Firewall**: Ensure your firewall blocks external access to Portboard's port

## Known Security Considerations

### Process Management
- Portboard can kill processes owned by your user
- Exercise caution when killing system or development processes
- Always read confirmation dialogs carefully

### Docker Integration
- Docker socket access is disabled by default
- If enabled, Portboard can stop/kill Docker containers
- Use "Stop Container" instead of killing docker-proxy processes

### Environment Variables
- Never commit `.env` files to version control
- Review `.env.example` for safe defaults

## Security Updates

Security updates will be released as patch versions (e.g., 0.1.1, 0.1.2) and announced via:
- GitHub Security Advisories
- Release notes
- README updates

## Disclaimer

Portboard is provided "as is" without warranty. While we prioritize security, use this tool at your own risk. Always review actions before confirming, especially when killing processes or stopping containers.
