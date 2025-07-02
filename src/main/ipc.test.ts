// src/main/ipc.test.ts
import { registerSecureApiKeyIpc } from './ipc';
import { ApiKeyServiceMain } from './ApiKeyServiceMain';
import { ipcMain } from 'electron';
import { IPCChannelNames, ApiKeyStorageError } from '../common';

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

const mockApiKeyService = {
  storeKey: jest.fn(),
  deleteKey: jest.fn(),
  isKeyStored: jest.fn(),
  getStoredProviderIds: jest.fn(),
  getApiKeyDisplayInfo: jest.fn(),
} as unknown as jest.Mocked<ApiKeyServiceMain>;

const mockedIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;

describe('registerSecureApiKeyIpc', () => {
  let handlers: Map<string, (event: any, ...args: any[]) => any>;

  beforeAll(() => {
      handlers = new Map();
      // Capture handlers registered by the function
      mockedIpcMain.handle.mockImplementation((channel, handler) => {
          handlers.set(channel, handler);
      });
      registerSecureApiKeyIpc(mockApiKeyService);
  });

  beforeEach(() => {
      jest.clearAllMocks();
  });

  it('should register a handler for storing keys', async () => {
      const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_STORE);
      expect(handler).toBeDefined();
      
      const payload = { providerId: 'openai', apiKey: 'key123' };
      mockApiKeyService.storeKey.mockResolvedValue(undefined);
      
      await handler!({}, payload);
      expect(mockApiKeyService.storeKey).toHaveBeenCalledWith(payload.providerId, payload.apiKey);
  });

  it('should propagate ApiKeyStorageError from the service', async () => {
      const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_STORE);
      const errorMessage = 'Validation failed';
      mockApiKeyService.storeKey.mockRejectedValue(new ApiKeyStorageError(errorMessage));
      
      const payload = { providerId: 'openai', apiKey: 'bad-key' };
      await expect(handler!({}, payload)).rejects.toThrow(errorMessage);
  });
});