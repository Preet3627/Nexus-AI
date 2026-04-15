# Contributing to Nexus-AI

Thank you for your interest in contributing to Nexus-AI! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code.

### Our Standards

**Encouraged:**
- Be respectful and inclusive
- Use welcoming language
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

**Not Accepted:**
- Harassment of any kind
- Personal attacks
- Publishing others' private information
- Other conduct that could reasonably be considered inappropriate

---

## 🚀 Getting Started

### Prerequisites

- macOS 13.0 (Ventura) or later
- Xcode 15.0+
- Rust 1.70+
- Node.js 18+
- Homebrew

### Fork the Repository

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Nexus-AI.git
   cd Nexus-AI
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/original/Nexus-AI.git
   ```

---

## 🛠️ Development Setup

### 1. Install Dependencies

```bash
# Install npm dependencies
npm install

# Install XcodeGen
brew install xcodegen

# Install Rust dependencies
cargo fetch
```

### 2. Generate Xcode Project

```bash
npm run generate
```

### 3. Build and Run

```bash
# Development mode
npm run tauri dev

# Production build
npm run tauri build
```

### 4. Verify Installation

```bash
# Run tests
npm test

# Run linter
npm run lint
```

---

## 🔄 Making Changes

### 1. Create a Branch

```bash
# Update from upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Or bugfix branch
git checkout -b fix/your-bugfix-name
```

### 2. Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/screen-capture` |
| Bugfix | `fix/description` | `fix/auth-timeout` |
| Docs | `docs/description` | `docs/readme-update` |
| Refactor | `refactor/description` | `refactor/security-module` |

### 3. Make Your Changes

```bash
# Make changes to code
# ...

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add screen capture functionality"
```

### 4. Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**
```
feat(auth): add biometric authentication

- Implement Touch ID/Face ID authentication
- Add Secure Enclave key storage
- Add passcode fallback

Closes #123
```

---

## 📤 Pull Request Process

### 1. Push Changes

```bash
git push origin feature/your-feature-name
```

### 2. Open Pull Request

1. Go to the repository on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill in the PR template

### 3. PR Template

```markdown
## Description
<!-- What does this PR do? -->

## Type of Change
<!-- - [ ] Bug fix -->
<!-- - [ ] New feature -->
<!-- - [ ] Breaking change -->
<!-- - [ ] Documentation update -->

## Checklist
<!-- - [ ] My code follows the style guidelines -->
<!-- - [ ] I have performed a self-review -->
<!-- - [ ] I have commented my code -->
<!-- - [ ] I have updated documentation -->
<!-- - [ ] My changes generate no new warnings -->
<!-- - [ ] I have added tests -->
<!-- - [ ] All tests pass -->
```

### 4. Review Process

1. Automated checks must pass:
   - [ ] Build succeeds
   - [ ] Tests pass
   - [ ] Linter passes
   - [ ] No merge conflicts

2. Code review by maintainers

3. Address feedback

4. Approval and merge

---

## 📝 Coding Standards

### Swift

```swift
// Use Swift conventions
class MyClass {
    // MARK: - Properties
    private let key: String
    
    // MARK: - Initialization
    init(key: String) {
        self.key = key
    }
    
    // MARK: - Public Methods
    public func doSomething() {
        // Implementation
    }
}
```

**Rules:**
- 2-space indentation
- No trailing whitespace
- Max line length: 120 characters
- Use `let` over `var` when possible
- Mark private properties/functions with `private`
- Use Swift's type inference where clear
- Add documentation comments for public APIs

### Rust

```rust
// Use Rust conventions
pub struct MyStruct {
    key: String,
}

impl MyStruct {
    pub fn new(key: String) -> Self {
        Self { key }
    }
    
    pub fn do_something(&self) -> Result<(), Error> {
        // Implementation
        Ok(())
    }
}
```

**Rules:**
- 4-space indentation
- Use `rustfmt` for formatting
- Maximum line length: 100 characters
- Use `?` operator over `match` where appropriate
- Add documentation comments for public APIs
- Use clippy lints

### TypeScript (if applicable)

```typescript
interface Props {
  readonly name: string;
  readonly onClick: () => void;
}

export function MyComponent({ name, onClick }: Props): JSX.Element {
  return (
    <button onClick={onClick}>
      {name}
    </button>
  );
}
```

**Rules:**
- 2-space indentation
- Use TypeScript strict mode
- Prefer interfaces over type aliases
- Use named exports over default exports

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Rust tests only
cargo test

# Swift tests (via xcodebuild)
xcodebuild test -scheme Nexus-AI

# Watch mode
npm run test:watch
```

### Writing Tests

#### Rust

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encryption() {
        let storage = SecureStorage::new();
        let plaintext = b"Hello, World!";
        
        let ciphertext = storage.encrypt(plaintext).unwrap();
        let decrypted = storage.decrypt(&ciphertext).unwrap();
        
        assert_eq!(plaintext.to_vec(), decrypted);
    }
}
```

#### Swift

```swift
import XCTest
@testable import NexusAI

class SecurityTests: XCTestCase {
    func testEncryption() throws {
        let storage = SecureStorage(keyData: testKey)
        let plaintext = "Hello, World!".data(using: .utf8)!
        
        let ciphertext = try storage.encrypt(plaintext)
        let decrypted = try storage.decrypt(ciphertext)
        
        XCTAssertEqual(plaintext, decrypted)
    }
}
```

### Test Coverage

- Minimum coverage: 80%
- Critical paths: 100%
- Security-related code: 100%

---

## 📚 Documentation

### Code Documentation

```swift
/// Performs biometric authentication.
///
/// - Parameter reason: The reason shown to the user for authentication.
/// - Returns: `true` if authentication succeeded, `false` otherwise.
/// - Throws: `BiometricError` if authentication fails due to system error.
public func authenticate(reason: String) async throws -> Bool {
    // Implementation
}
```

### Rust Documentation

```rust
/// Performs biometric authentication.
///
/// # Arguments
///
/// * `reason` - The reason shown to the user for authentication.
///
/// # Returns
///
/// `Ok(true)` if authentication succeeded, `Ok(false)` otherwise.
///
/// # Errors
///
/// Returns `BiometricError` if authentication fails due to system error.
pub async fn authenticate(&self, reason: &str) -> Result<bool, BiometricError> {
    // Implementation
}
```

### README Updates

If your changes affect:
- Installation process → Update INSTALLATION section
- Configuration → Update CONFIGURATION section
- New features → Add to FEATURES section
- Breaking changes → Add to MIGRATION guide

---

## 🐛 Reporting Issues

### Bug Reports

```markdown
## Bug Description
<!-- Clear description of the bug -->

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
<!-- What should happen -->

## Actual Behavior
<!-- What actually happens -->

## Environment
- macOS Version:
- Nexus-AI Version:
- Device:

## Screenshots
<!-- If applicable -->

## Logs
<!-- If applicable -->
```

### Feature Requests

```markdown
## Feature Description
<!-- Clear description of the feature -->

## Use Case
<!-- Why is this feature needed? -->

## Proposed Solution
<!-- How should it work? -->

## Alternatives Considered
<!-- Other solutions considered -->
```

---

## 💬 Getting Help

- **GitHub Discussions:** [Link](https://github.com/yourusername/Nexus-AI/discussions)
- **Issues:** [Link](https://github.com/yourusername/Nexus-AI/issues)
- **Discord:** [Link](https://discord.gg/nexus-ai)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Acknowledgments

Thank you to all contributors who have helped make Nexus-AI better!

---

*Last Updated: 2026-04-15*
