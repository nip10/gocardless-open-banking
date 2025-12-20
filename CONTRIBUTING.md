# Contributing to GoCardless Open Banking SDK

Thank you for your interest in contributing to the GoCardless Open Banking SDK! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project follows a standard code of conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended) or npm

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/gocardless-open-banking.git
cd gocardless-open-banking
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/nip10/gocardless-open-banking.git
```

## Development Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file for testing (optional):

```bash
GOCARDLESS_SECRET_ID=your_secret_id
GOCARDLESS_SECRET_KEY=your_secret_key
```

> **Note**: The test suite uses mocks and doesn't require real API credentials.

## Making Changes

### Branch Naming

Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Code Style

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run linting and formatting:

```bash
# Check for linting errors
pnpm run lint

# Format code
pnpm run format
```

### Type Generation

Types are auto-generated from the OpenAPI specification. If you need to regenerate types:

```bash
pnpm run generate:types
```

> **Important**: The generated types are located in `src/types/generated/`. Do not manually edit these files.

### Building

Build the project to ensure everything compiles correctly:

```bash
pnpm run build
```

This creates:
- ESM build: `dist/index.js`
- CJS build: `dist/index.cjs`
- TypeScript declarations: `dist/index.d.ts`

### Verify Package Exports

Ensure package exports are correct:

```bash
pnpm run check-exports
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm run coverage

# Run tests in watch mode
pnpm run test:ui
```

### Writing Tests

- Place unit tests in `tests/unit/` mirroring the source structure
- Use descriptive test names: `it('should do something when condition is met')`
- Aim for high coverage (current: 91.7%)
- Mock external dependencies (API calls, timers, etc.)

Example test structure:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle success case', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });

  it('should handle error case', async () => {
    // Test error scenarios
  });
});
```

### Testing Guidelines

1. **Test behavior, not implementation**: Focus on what the code does, not how it does it
2. **Use meaningful assertions**: Avoid generic `toBeTruthy()`, prefer specific checks
3. **Test edge cases**: Empty inputs, null values, error conditions
4. **Mock external dependencies**: Use `vi.mock()` for HTTP clients, timers, etc.
5. **Clean up**: Use `beforeEach`/`afterEach` to reset mocks and state

## Submitting Changes

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `perf`: Performance improvements

Examples:

```bash
feat(accounts): add support for pending transactions
fix(retry): handle Retry-After header correctly
docs(readme): update authentication examples
test(http): add interceptor tests
```

### Creating a Changeset

For changes that affect the published package, create a changeset:

```bash
pnpm changeset add
```

Follow the prompts to:
1. Select the change type (patch/minor/major)
2. Describe the changes

This creates a markdown file in `.changeset/` that will be used to generate the changelog and version bump.

### Pull Request Process

1. **Update your branch** with the latest upstream changes:

```bash
git fetch upstream
git rebase upstream/main
```

2. **Push your changes**:

```bash
git push origin your-branch-name
```

3. **Create a Pull Request** on GitHub:
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes (if applicable)
   - Ensure all CI checks pass

4. **Address review feedback**:
   - Make requested changes
   - Push additional commits
   - Respond to comments

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests pass locally (`pnpm test`)
- [ ] New tests added for new functionality
- [ ] Documentation updated (README, JSDoc comments)
- [ ] Changeset created (if applicable)
- [ ] No breaking changes (or clearly documented)
- [ ] Build succeeds (`pnpm run build`)
- [ ] Package exports verified (`pnpm run check-exports`)

## Release Process

Releases are automated using [Changesets](https://github.com/changesets/changesets):

1. When a PR with a changeset is merged to `main`, a "Release PR" is automatically created
2. The Release PR aggregates all changesets and updates CHANGELOG.md
3. When the Release PR is merged, the package is automatically published to npm
4. A GitHub release is created with the changelog

### Manual Release (Maintainers Only)

```bash
# Build the package
pnpm run build

# Publish to npm
pnpm run release
```

## Project Structure

```
.
├── src/
│   ├── auth/           # Authentication (TokenManager)
│   ├── http/           # HTTP client wrapper
│   ├── resources/      # API resource modules
│   ├── types/          # TypeScript types
│   │   └── generated/  # Auto-generated OpenAPI types
│   ├── utils/          # Utility functions
│   ├── client.ts       # Main client class
│   └── index.ts        # Public exports
├── tests/
│   └── unit/           # Unit tests
├── docs/
│   └── spec.json       # OpenAPI specification
├── scripts/            # Build scripts
└── .github/
    └── workflows/      # CI/CD workflows
```

## Questions?

- Open an [issue](https://github.com/nip10/gocardless-open-banking/issues) for bugs or feature requests
- Check existing issues and PRs before creating new ones
- For questions about GoCardless API itself, see their [documentation](https://developer.gocardless.com/bank-account-data/overview)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
