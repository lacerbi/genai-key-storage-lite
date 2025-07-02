# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Development:**
- `npm run build` - Build the TypeScript library to `dist/` directory
- No test scripts defined - this is a library module

**Project Structure:**
- TypeScript library with exports for `main`, `renderer`, and `preload` processes
- Targets ES2021 with CommonJS modules
- Strict TypeScript configuration with declarations

## Architecture Overview

This is a secure API key storage library for Electron applications that leverages native OS credential stores. The library provides a secure, multi-process architecture that ensures API keys are never exposed in plaintext to the renderer process.

### Core Architecture Principles

**Electron Process Separation:**
- **Main Process** (`src/main/`): Handles encryption/decryption using `electron.safeStorage`, file persistence, and secure key operations
- **Renderer Process** (`src/renderer/`): Provides UI-friendly client API that communicates via IPC bridge
- **Preload Bridge** (`src/preload/`): Secure IPC communication layer between main and renderer processes
- **Common** (`src/common/`): Shared types, validation, and provider definitions

**Security Model:**
- Uses `electron.safeStorage` for OS-level encryption (macOS Keychain, Windows Credential Vault)
- Plaintext API keys are never cached in memory
- Keys are decrypted on-demand only when needed
- Renderer process never receives plaintext keys
- Each provider's key stored in separate encrypted file

### Key Services

**`ApiKeyServiceMain`** (`src/main/ApiKeyServiceMain.ts`):
- Core service handling all secure operations in main process
- Encrypts/decrypts keys using OS-level security
- Persists encrypted keys to JSON files in user data directory
- Provides `withDecryptedKey()` method for secure main-process API operations
- Validates API key formats before storage
- Maintains only metadata (like last 4 chars) in memory

**`ApiKeyServiceRenderer`** (`src/renderer/ApiKeyServiceRenderer.ts`):
- Client-side service for UI components
- Provides type-safe API for renderer process
- Handles client-side validation for immediate feedback
- Communicates with main process via IPC bridge
- Never handles plaintext keys directly

**`ProviderService`** (`src/common/providers/ProviderService.ts`):
- Manages API provider validators and format validation
- Built-in support for: OpenAI, Anthropic, Gemini, Mistral
- Extensible architecture for adding new providers
- Centralized validation logic used by both main and renderer processes

### IPC Communication

**IPC Handlers** (`src/main/ipc.ts`):
- Registers all secure API key IPC channels
- Handles: store, delete, check status, get display info, list stored providers
- Proper error propagation and validation

**Preload Bridge** (`src/preload/index.ts`):
- Creates bridge object for secure IPC communication
- Exposes methods via `createApiKeyManagerBridge()`
- Used with `contextBridge` to safely expose functionality to renderer

### File Storage Architecture

**Storage Location:**
- Keys stored in `{userDataPath}/secure_api_keys/` directory
- Each provider gets separate `{providerId}.json` file
- Files contain encrypted key + metadata (last 4 chars for display)

**Security Features:**
- Path traversal protection in file operations
- Validates provider IDs before creating file paths
- Uses `path.normalize()` and bounds checking
- Encrypted storage with OS-level authentication

### Provider System

**Provider Interface** (`src/common/providers/ProviderInterface.ts`):
- Defines `IApiProviderValidator` interface
- Each provider implements format validation
- Consistent validation across main and renderer processes

**Built-in Providers:**
- OpenAI: `sk-` prefix validation
- Anthropic: `sk-ant-` prefix validation  
- Gemini: Google API key format validation
- Mistral: Mistral API key format validation

## Integration Patterns

**Main Process Setup:**
```typescript
const apiKeyService = new ApiKeyServiceMain(app.getPath('userData'));
registerSecureApiKeyIpc(apiKeyService);
```

**Preload Setup:**
```typescript
contextBridge.exposeInMainWorld('electronBridge', {
  secureApiKeyManager: createApiKeyManagerBridge()
});
```

**Renderer Usage:**
```typescript
const apiKeyService = new ApiKeyServiceRenderer(
  window.electronBridge.secureApiKeyManager
);
```

## Security Considerations

**Secure Key Access:**
- Use `ApiKeyServiceMain.withDecryptedKey()` for main-process API operations
- Keys are decrypted on-demand and never cached
- Callback pattern limits plaintext key scope

**Never expose plaintext keys to renderer:**
- All API operations requiring keys should be implemented in main process
- Renderer should only handle key storage/management UI operations

**File Security:**
- Encrypted files stored in user data directory
- Relies on OS file permissions and user account security
- Each provider key stored separately for isolation

## Error Handling

**`ApiKeyStorageError`** (`src/common/errors.ts`):
- Custom error class for all API key operations
- Consistent error handling across all processes
- Proper error propagation through IPC boundaries

## Development Guidelines

**Adding New Providers:**
1. Add provider ID to `ApiProvider` union type in `src/common/types.ts`
2. Create provider validator implementing `IApiProviderValidator`
3. Register provider in `ProviderService.registerBuiltInProviders()`
4. Export provider class from `src/common/providers/index.ts`

**Testing:**
- No test framework currently configured
- Manual testing recommended for OS-level encryption features
- Test across different OS platforms (macOS, Windows, Linux)

**Path Security:**
- Always use `validateAndGetSecurePath()` for file operations
- Validate provider IDs before file path construction
- Use path normalization and bounds checking