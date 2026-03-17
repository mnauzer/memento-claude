# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in this project, please report it by creating a private security advisory on GitHub.

**DO NOT** create a public issue for security vulnerabilities.

## Sensitive Data Guidelines

### What Should NEVER Be Committed to Git

1. **API Keys and Tokens**
   - Memento Database API keys
   - Telegram Bot tokens
   - OpenAI/Claude API keys
   - N8N credentials
   - Any authentication tokens

2. **Personal Information**
   - User-specific file paths (e.g., `/home/username/`)
   - Email addresses (except generic examples)
   - Phone numbers
   - Telegram Chat IDs

3. **Configuration Files with Secrets**
   - `.env` files (use `.env.example` instead)
   - `config/*.env`
   - Any file with actual credentials

### What IS Safe to Commit

1. **Field Name Definitions** ✅
   - Configuration that maps field names (e.g., `telegramBotToken: "Telegram Bot Token"`)
   - These are field NAMES in Memento Database, not actual values

2. **Public API Endpoints** ✅
   - `https://api.openai.com/v1`
   - `https://api.telegram.org/bot`
   - `https://api.mementodatabase.com/v1`

3. **Code Structure** ✅
   - Business logic
   - Utility functions
   - Templates and examples

## Security Best Practices

### For Developers

1. **Use Environment Variables**
   ```bash
   export MEMENTO_API_KEY=your_key_here
   ```

2. **Check Before Committing**
   ```bash
   git diff --cached | grep -iE "(api.*key|token|password|secret)"
   ```

3. **Use `.env.example`**
   - Provide template with placeholder values
   - Never commit actual `.env` files

4. **Sanitize Documentation**
   - Replace personal paths with `{project_root}`
   - Replace actual keys with `your_api_key_here`
   - Use generic usernames in examples

### Current Security Measures

1. **.gitignore Protection**
   - All `.env*` files ignored
   - All `.md` files ignored (except whitelisted)
   - `config/` directory ignored
   - Python utilities ignored

2. **Credential Storage**
   - API keys stored in Memento Database (ASISTANTO API library)
   - Credentials never hardcoded in scripts
   - Environment variables for local development

3. **Access Control**
   - Scripts fetch credentials from Memento Database at runtime
   - No credentials in JavaScript code
   - Field names are configuration, not secrets

## Git History Cleanup (If Needed)

If credentials were accidentally committed:

1. **Remove from current files** (already done)
2. **Clean git history:**
   ```bash
   # Using BFG Repo-Cleaner (recommended)
   bfg --replace-text sensitive-data.txt
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # Force push (WARNING: coordinate with team)
   git push --force
   ```

3. **Rotate compromised credentials immediately**

## Contact

For security concerns, contact: [Repository owner through GitHub]

---

**Last Updated:** 2026-03-17
**Version:** 1.0
