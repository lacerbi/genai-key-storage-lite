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

  it('should register a handler for deleting keys', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_DELETE);
    expect(handler).toBeDefined();
    mockApiKeyService.deleteKey.mockResolvedValue(undefined);
    await handler!({}, 'openai');
    expect(mockApiKeyService.deleteKey).toHaveBeenCalledWith('openai');
  });

  it('should register a handler for checking if a key is stored', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_IS_STORED);
    expect(handler).toBeDefined();
    mockApiKeyService.isKeyStored.mockResolvedValue(true);
    await expect(handler!({}, 'openai')).resolves.toBe(true);
    expect(mockApiKeyService.isKeyStored).toHaveBeenCalledWith('openai');
  });

  it('should register a handler for getting stored provider IDs', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_GET_STORED_PROVIDERS);
    expect(handler).toBeDefined();
    mockApiKeyService.getStoredProviderIds.mockReturnValue(['openai']);
    await expect(handler!({})).resolves.toEqual(['openai']);
    expect(mockApiKeyService.getStoredProviderIds).toHaveBeenCalled();
  });

  it('should register a handler for getting display info', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO);
    expect(handler).toBeDefined();
    const displayInfo = { isStored: true, lastFourChars: '1234' };
    mockApiKeyService.getApiKeyDisplayInfo.mockResolvedValue(displayInfo);
    await expect(handler!({}, 'openai')).resolves.toEqual(displayInfo);
    expect(mockApiKeyService.getApiKeyDisplayInfo).toHaveBeenCalledWith('openai');
  });

  it('should reject with ApiKeyStorageError for invalid providerId in handlers', async () => {
    const deleteHandler = handlers.get(IPCChannelNames.SECURE_API_KEY_DELETE);
    await expect(deleteHandler!({}, '../invalid')).rejects.toThrow(ApiKeyStorageError);
  });

  it('should wrap non-ApiKeyStorageError exceptions in delete handler', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_DELETE);
    mockApiKeyService.deleteKey.mockRejectedValue(new Error('Filesystem error'));
    await expect(handler!({}, 'openai')).rejects.toThrow(ApiKeyStorageError);
    await expect(handler!({}, 'openai')).rejects.toThrow('Failed to delete API key');
  });

  it('should wrap non-ApiKeyStorageError exceptions in isKeyStored handler', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_IS_STORED);
    mockApiKeyService.isKeyStored.mockRejectedValue(new Error('Filesystem error'));
    await expect(handler!({}, 'openai')).rejects.toThrow(ApiKeyStorageError);
    await expect(handler!({}, 'openai')).rejects.toThrow('Failed to check API key status');
  });

  it('should wrap non-ApiKeyStorageError exceptions in getStoredProviderIds handler', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_GET_STORED_PROVIDERS);
    mockApiKeyService.getStoredProviderIds.mockImplementation(() => {
      throw new Error('Service error');
    });
    await expect(handler!({})).rejects.toThrow(ApiKeyStorageError);
    await expect(handler!({})).rejects.toThrow('Failed to get stored providers');
  });

  it('should wrap non-ApiKeyStorageError exceptions in getApiKeyDisplayInfo handler', async () => {
    const handler = handlers.get(IPCChannelNames.SECURE_API_KEY_GET_DISPLAY_INFO);
    mockApiKeyService.getApiKeyDisplayInfo.mockRejectedValue(new Error('Service error'));
    await expect(handler!({}, 'openai')).rejects.toThrow(ApiKeyStorageError);
    await expect(handler!({}, 'openai')).rejects.toThrow('Failed to get API key display info');
  });
});