# Contributing to open-wegram-bot

Thank you for your interest in contributing to open-wegram-bot! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Avoid duplicate reports
2. **Create a detailed issue** including:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Node version, etc.)
   - Error messages and logs

### Suggesting Enhancements

1. **Use the GitHub Issues** feature
2. **Provide context:**
   - Why this feature would be useful
   - How it should work
   - Example use cases

### Making Code Changes

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes:**
   - Follow existing code style
   - Keep changes focused and atomic
   - Write clear commit messages
4. **Test your changes:**
   - Ensure the bot still functions correctly
   - Test with your Telegram bot
5. **Submit a Pull Request:**
   - Reference any related issues
   - Describe what you changed and why
   - Ensure all checks pass

## Development Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/open-wegram-bot.git
   cd open-wegram-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure local environment:**
   - Create `.env.local` with your test values
   - Use a test bot token from @BotFather

4. **Test locally:**
   ```bash
   npm run dev
   ```

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
type: subject line (50 chars or less)

Optional detailed explanation of changes

Fixes #123
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test additions/modifications
- `chore:` Build, dependency updates

## Pull Request Process

1. **Ensure your PR:**
   - Has a clear title and description
   - References related issues
   - Includes any necessary documentation updates
   - Passes all automated checks

2. **Be responsive:**
   - Address review comments promptly
   - Make requested changes in new commits

3. **Wait for approval:**
   - At least one maintainer approval required
   - All checks must pass

## Documentation

When contributing:
- Update README.md if adding features
- Add comments for complex logic
- Keep documentation in sync with code

## Questions?

- Open an issue with label `question`
- Check existing discussions first

Thank you for contributing! 🎉
