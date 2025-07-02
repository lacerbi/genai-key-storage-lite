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
