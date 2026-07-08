# GitHub Actions CI/CD Setup

This directory contains the GitHub Actions workflows and configuration for automated testing, security monitoring, and quality assurance.

## Workflows

### 🔄 `ci.yml` - Continuous Integration
**Triggers:** Pull requests and pushes to `main`/`develop` branches

**Test Matrix:**
- **Operating Systems**: Ubuntu, Windows, macOS
- **Node.js Versions**: 20.x, 22.x
- **Total Combinations**: 6 OS/Node combinations

**Jobs:**
- **`test`** - Runs the full test suite across all OS/Node combinations
- **`lint-and-format`** - Code quality checks (ESLint, Prettier if available)
- **`security-audit`** - npm security audit for vulnerabilities
- **`test-electron-compatibility`** - Tests against Electron versions 25.x-28.x
- **`package-validation`** - Validates package structure and exports
- **`results-summary`** - Provides a comprehensive summary of all test results

### 🚀 `release.yml` - Release Testing
**Triggers:** Release events, version tags (`v*`), manual dispatch

**Extended Test Matrix:**
- **Operating Systems**: Ubuntu 22.04/24.04, Windows 2022/latest, macOS 14/latest
- **Node.js Versions**: 20.9.0, 20.x, 22.x
- **Electron Versions**: 25.0.0-30.0.0 (comprehensive range testing)

**Jobs:**
- **`comprehensive-test`** - Extended testing with coverage reporting
- **`electron-matrix-test`** - Full Electron compatibility matrix
- **`performance-benchmark`** - Performance validation and benchmarking
- **`security-deep-scan`** - Comprehensive security analysis
- **`release-validation`** - Package integrity and installation testing

### 🔒 `security-monitoring.yml` - Security Monitoring
**Triggers:** Daily schedule (2 AM UTC), dependency changes, manual dispatch

**Features:**
- Daily security audits with npm audit
- Dependency license compliance checking
- Automatic issue creation for high/critical vulnerabilities
- Dependency review for new changes
- License compatibility verification

## Configuration Files

### `dependabot.yml` - Automated Dependency Updates
- **npm dependencies**: Weekly updates on Mondays
- **GitHub Actions**: Weekly security updates
- **Grouping**: Development dependencies grouped together
- **Special handling**: Electron updates require manual review for major versions

### Issue Templates
- **`bug_report.yml`** - Comprehensive bug reporting with environment details
- **`feature_request.yml`** - Structured feature requests with use cases

### Pull Request Template
- **`pull_request_template.md`** - Ensures comprehensive PR information

## Test Coverage

The CI system provides comprehensive test coverage across:

### **Cross-Platform Testing**
- ✅ **Ubuntu** (22.04, 24.04, latest) - Linux compatibility
- ✅ **Windows** (2022, latest) - Windows compatibility
- ✅ **macOS** (14, latest) - macOS compatibility

### **Node.js Compatibility**
- ✅ **Node 20.x** (LTS) - Current LTS
- ✅ **Node 22.x** (Current) - Latest features

### **Electron Compatibility**
- ✅ **Electron 25.x-30.x** - Broad version support
- ✅ **Major version testing** - Compatibility validation
- ✅ **LTS version focus** - Stability emphasis

### **Security Validation**
- ✅ **Dependency auditing** - Vulnerability detection
- ✅ **License compliance** - Legal compatibility
- ✅ **Code scanning** - Security pattern detection
- ✅ **Automated monitoring** - Continuous security watch

## Status Badges

Add these badges to your README.md:

```markdown
![CI](https://github.com/your-org/genai-key-storage-lite/workflows/CI/badge.svg)
![Security](https://github.com/your-org/genai-key-storage-lite/workflows/Security%20Monitoring/badge.svg)
![Release Tests](https://github.com/your-org/genai-key-storage-lite/workflows/Release%20Tests/badge.svg)
```

## Local Testing

To test the same commands locally that run in CI:

```bash
# Run tests (same as CI)
npm test

# Build package (same as CI)
npm run build

# Security audit (same as CI)
npm audit --audit-level=moderate

# Package validation
npm pack
npm install ./genai-key-storage-lite-*.tgz
```

## Contributing

When contributing:

1. **All CI checks must pass** before merging
2. **Test on multiple platforms** if making system-level changes
3. **Update tests** for new functionality
4. **Consider security implications** for all changes
5. **Follow the PR template** for comprehensive reviews

## Troubleshooting

### Common CI Issues

**Tests failing on specific OS:**
- Check platform-specific dependencies
- Verify file path handling (Windows vs Unix)
- Review OS-specific Electron behavior

**Node version compatibility:**
- Check for Node.js API usage outside LTS
- Verify dependency compatibility
- Review TypeScript target settings

**Electron compatibility:**
- Check for breaking changes in Electron APIs
- Verify native module compatibility
- Test safeStorage availability across versions

**Security audit failures:**
- Review npm audit output
- Update vulnerable dependencies
- Consider security patches

For more help, check the workflow logs in the GitHub Actions tab.
