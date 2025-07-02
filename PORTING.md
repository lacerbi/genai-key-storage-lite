### **Part 1: The Goal & High-Level Concept**

Our goal is to create a new, reusable npm package named `genai-key-storage-lite`. This package will have one job: to securely store and manage API keys within any Electron application.

It will use the host operating system's native credential storage (like macOS Keychain or Windows Credential Vault) via Electron's `safeStorage` API. This means it will be an **Electron-specific module**; it will not work in a standard Node.js or web browser environment.

The package will provide three distinct parts for the three parts of an Electron app:

1.  **Main Process Logic**: The core service that handles encryption and file I/O.
2.  **Renderer Process Logic**: A client-side "accessor" for the UI to safely interact with the main service.
3.  **Preload Script Logic**: The secure "bridge" that connects the renderer and the main process.

#### Porting from Athanor

We will start from a module of an existing project, "Athanor". This module, which was part of Athanor, already contains most of the features we want in `genai-key-storage-lite`. Our goal is to make the package entirely standalone.

---

### **Part 2: New Package Directory Structure**

First, we will create a new, empty directory for our package. Inside, we'll create a `src` folder to hold the code we copy from Athanor. After we're done, the structure of `genai-key-storage-lite` will look like this:

```
genai-key-storage-lite/
├── dist/                     # (Output of the build process, not created manually)
├── src/
│   ├── main/
│   │   ├── ApiKeyServiceMain.ts
│   │   └── ipc.ts
│   ├── renderer/
│   │   └── ApiKeyServiceRenderer.ts
│   ├── preload/
│   │   └── index.ts
│   └── common/
│       ├── providers/
│       │   ├── AnthropicProvider.ts
│       │   ├── GeminiProvider.ts
│       │   ├── index.ts
│       │   ├── MistralProvider.ts
│       │   ├── OpenAIProvider.ts
│       │   ├── ProviderInterface.ts
│       │   └── ProviderService.ts
│       ├── errors.ts
│       ├── index.ts
│       └── types.ts
├── package.json
└── tsconfig.json
```

---

### **Part 3: Source Files to Copy from Athanor**

We will copy the entire `secure-api-storage` module and its corresponding IPC handler from the Athanor project into our new package's `src` directory.

Here is the exact list of files to copy:

1.  **Copy the entire `common` directory:**

    - `electron/modules/secure-api-storage/common/` -\> `genai-key-storage-lite/src/common/`

2.  **Copy the `main` service file:**

    - `electron/modules/secure-api-storage/main/ApiKeyServiceMain.ts` -\> `genai-key-storage-lite/src/main/ApiKeyServiceMain.ts`

3.  **Copy the `renderer` service file:**

    - `electron/modules/secure-api-storage/renderer/ApiKeyServiceRenderer.ts` -\> `genai-key-storage-lite/src/renderer/ApiKeyServiceRenderer.ts`

4.  **Copy the IPC handler file:**

    - `electron/handlers/secureApiKeyIpc.ts` -\> `genai-key-storage-lite/src/main/ipc.ts` _(Note the new location and name)_

---

### **Part 4: Step-by-Step File Modifications**

Now, we will edit the files we just copied to make them work as a standalone package.

#### **Step 4.1: Modify `src/main/ApiKeyServiceMain.ts`**

This file requires very few changes. We just need to adjust its import paths to be local to the new package.

- **Change this line:**
  ```typescript
  import { ApiProvider, ApiKeyStorageError, ProviderService } from "../common";
  ```
- **To this:**
  ```typescript
  import { ApiProvider, ApiKeyStorageError, ProviderService } from "../common";
  ```
  _(Self-correction: The path is already correct relative to its new location inside `src/main/`. No change is actually needed here.)_

This file is essentially ready to go. Its dependencies (`electron`, `fs`, `path`) are core to Node/Electron and will be handled by `peerDependencies` in our `package.json`.

#### **Step 4.2: Modify `src/main/ipc.ts` (formerly `secureApiKeyIpc.ts`)**

This file needs to be refactored from a self-executing function into an exported, pluggable function that any Electron app can use.

- **Original File (`electron/handlers/secureApiKeyIpc.ts`):**

  ```typescript
  import { ipcMain } from "electron";
  import { ApiKeyServiceMain } from "../modules/secure-api-storage/main";
  // ...

  export function registerSecureApiKeyIpc(apiKeyService: ApiKeyServiceMain) {
    // ... ipcMain.handle calls ...
  }
  ```

- **New File (`src/main/ipc.ts`):** The code is already in an exported function, which is great. We just need to adjust the import paths.

  ```typescript
  // src/main/ipc.ts

  import { ipcMain } from "electron";
  import type { ApiKeyServiceMain } from "./ApiKeyServiceMain"; // Adjusted path
  import {
    IPCChannelNames,
    StoreApiKeyPayload,
    ApiKeyStorageError,
  } from "../common/types"; // Adjusted path

  /**
   * Registers IPC handlers for secure API key operations.
   * This function should be called in the main process of an Electron app.
   *
   * @param apiKeyService An instance of ApiKeyServiceMain.
   */
  export function registerSecureApiKeyIpc(
    apiKeyService: ApiKeyServiceMain
  ): void {
    // ... (The rest of the file content remains the same) ...
  }
  ```

#### **Step 4.3: Create `src/preload/index.ts`**

This is a new file. Its purpose is to contain the logic that Athanor currently has in its `preload.ts` for exposing the API key manager. We will create a clean, exported function to do this.

- **Create a new file `genai-key-storage-lite/src/preload/index.ts` and add this content:**

  ```typescript
  // src/preload/index.ts

  import { ipcRenderer } from "electron";
  import { IPCChannelNames } from "../common/types";

  /**
   * Creates a bridge object for the secure API key manager.
   * This function should be called in a preload script, and its return
   * value exposed on the window object via contextBridge.
   */
  export function createApiKeyManagerBridge() {
    return {
      storeKey: (providerId: string, apiKey: string) =>
        ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_STORE, {
          providerId,
          apiKey,
        }),

      deleteKey: (providerId: string) =>
        ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_DELETE, providerId),

      isKeyStored: (providerId: string) =>
        ipcRenderer.invoke(
          IPCChannelNames.SECURE_API_KEY_IS_STORED,
          providerId
        ),

      getStoredProviderIds: () =>
        ipcRenderer.invoke(IPCChannelNames.SECURE_API_KEY_GET_STORED_PROVIDERS),

      getApiKeyDisplayInfo: (providerId: string) =>
        ipcRenderer.invoke(
          IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO,
          providerId
        ),
    };
  }
  ```

#### **Step 4.4: Modify `src/renderer/ApiKeyServiceRenderer.ts`**

This file needs a small but important change to decouple it from Athanor's specific `window.electronBridge` global object. We will modify its constructor to accept the bridge object as an argument.

- **Original File (`electron/modules/secure-api-storage/renderer/ApiKeyServiceRenderer.ts`):**

  ```typescript
  // ...
  export class ApiKeyServiceRenderer {
    // ...
    private bridge: typeof window.electronBridge.secureApiKeyManager;

    constructor() {
      // ...
      if (!window.electronBridge?.secureApiKeyManager) {
        // ... error
      }
      this.bridge = window.electronBridge.secureApiKeyManager;
    }
    // ...
  }
  ```

- **New File (`src/renderer/ApiKeyServiceRenderer.ts`):**

  ```typescript
  // src/renderer/ApiKeyServiceRenderer.ts

  import { ApiProvider, ApiKeyStorageError, ProviderService } from "../common";

  // Define an interface for the bridge to ensure type safety
  export interface IApiKeyManagerBridge {
    storeKey(providerId: string, apiKey: string): Promise<{ success: boolean }>;
    deleteKey(providerId: string): Promise<{ success: boolean }>;
    isKeyStored(providerId: string): Promise<boolean>;
    getStoredProviderIds(): Promise<ApiProvider[]>;
    getApiKeyDisplayInfo(
      providerId: string
    ): Promise<{ isStored: boolean; lastFourChars?: string }>;
  }

  export class ApiKeyServiceRenderer {
    private providerService: ProviderService;
    private bridge: IApiKeyManagerBridge;

    /**
     * Creates a new ApiKeyServiceRenderer instance.
     * @param bridge The API key manager bridge object exposed from the preload script.
     * @throws ApiKeyStorageError if the bridge is not provided.
     */
    constructor(bridge: IApiKeyManagerBridge) {
      this.providerService = new ProviderService();

      if (!bridge) {
        throw new ApiKeyStorageError(
          "Secure API key bridge is not available. Ensure it is passed to the constructor."
        );
      }

      this.bridge = bridge;
    }

    // ... (The rest of the file content remains the same) ...
  }
  ```

---

### **Part 5: Creating the `package.json`**

This file defines our new module. Create `genai-key-storage-lite/package.json` with the following content. The `exports` field is critical for allowing users to import from `genai-key-storage-lite/renderer` and `genai-key-storage-lite/preload`.

```json
{
  "name": "genai-key-storage-lite",
  "version": "0.1.0",
  "description": "A secure API key storage module for Electron applications using native OS credential stores.",
  "main": "./dist/main/index.js",
  "types": "./dist/main/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/main/index.js",
      "types": "./dist/main/index.d.ts"
    },
    "./renderer": {
      "import": "./dist/renderer/index.js",
      "types": "./dist/renderer/index.d.ts"
    },
    "./preload": {
      "import": "./dist/preload/index.js",
      "types": "./dist/preload/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "electron": "^25.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "electron": "^25.0.0",
    "typescript": "^5.0.0"
  }
}
```

You will also need a `tsconfig.json` to compile the TypeScript.

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

After creating these files, you would run `npm install` and then `npm run build` from within the `genai-key-storage-lite` directory to generate the `dist` folder.

---

### **Part 6: How Athanor Will Use the New Package**

After publishing the package (or linking it locally), Athanor's code would be simplified.

1.  **Delete the old files:**

    - `electron/modules/secure-api-storage/`
    - `electron/handlers/secureApiKeyIpc.ts`

2.  **Add the new dependency to Athanor's `package.json`:**

    - `"genai-key-storage-lite": "^0.1.0"`

3.  **Modify Athanor's `electron/main.ts`:**

    ```typescript
    // electron/main.ts
    import {
      ApiKeyServiceMain,
      registerSecureApiKeyIpc,
    } from "genai-key-storage-lite";
    // ...

    app.whenReady().then(async () => {
      // Initialize the service from the new package
      const apiKeyService = new ApiKeyServiceMain(app.getPath("userData"));

      // The LLMService would also need to be initialized here
      const llmService = new LLMServiceMain(apiKeyService);

      // Register IPC handlers from the new package
      registerSecureApiKeyIpc(apiKeyService);

      // The old setupIpcHandlers call would no longer pass the apiKeyService
      // or register the handlers itself.
      // ...
    });
    ```

4.  **Modify Athanor's `electron/preload.ts`:**

    ```typescript
    // electron/preload.ts
    import { contextBridge, ipcRenderer } from "electron";
    import { createApiKeyManagerBridge } from "genai-key-storage-lite/preload";

    contextBridge.exposeInMainWorld("electronBridge", {
      // Call the function from our new package to create the bridge object
      secureApiKeyManager: createApiKeyManagerBridge(),
      // ... other Athanor-specific bridges (llmService, etc.)
    });
    ```

5.  **Modify Athanor's `src/components/ApiKeyManagementPane.tsx`:**

    ```typescript
    // src/components/ApiKeyManagementPane.tsx
    import { ApiKeyServiceRenderer } from "genai-key-storage-lite/renderer";
    // ...

    const ApiKeyManagementPane: React.FC = () => {
      const [apiKeyService, setApiKeyService] =
        useState<ApiKeyServiceRenderer | null>(null);

      useEffect(() => {
        try {
          // Pass the bridged object to the constructor
          const service = new ApiKeyServiceRenderer(
            window.electronBridge.secureApiKeyManager
          );
          setApiKeyService(service);
        } catch (error) {
          console.error("Failed to initialize ApiKeyServiceRenderer:", error);
        }
      }, []);

      // ... rest of the component logic remains the same
    };
    ```

This completes the extraction. The Athanor codebase becomes cleaner, and you now have a reusable, standalone package for handling secure API key storage in any Electron project.
