// src/renderer/ApiKeyServiceRenderer.test.ts
import { ApiKeyServiceRenderer, IApiKeyManagerBridge } from './ApiKeyServiceRenderer';
import { ApiKeyStorageError } from '../common';

const mockBridge: jest.Mocked<IApiKeyManagerBridge> = {
  storeKey: jest.fn(),
  deleteKey: jest.fn(),
  isKeyStored: jest.fn(),
  getStoredProviderIds: jest.fn(),
  getApiKeyDisplayInfo: jest.fn(),
};

describe('ApiKeyServiceRenderer', () => {
  let service: ApiKeyServiceRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ApiKeyServiceRenderer(mockBridge);
  });

  it('should throw if bridge is not provided', () => {
    expect(() => new ApiKeyServiceRenderer(undefined as any)).toThrow(ApiKeyStorageError);
  });

  it('should call bridge.storeKey after successful client-side validation', async () => {
    mockBridge.storeKey.mockResolvedValue({ success: true });
    const key = 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    await service.storeKey('openai', key);
    expect(mockBridge.storeKey).toHaveBeenCalledWith('openai', key);
  });

  it('should not call bridge.storeKey if client-side validation fails', async () => {
    const key = 'invalid-key';
    await expect(service.storeKey('openai', key)).rejects.toThrow('Invalid API key format');
    expect(mockBridge.storeKey).not.toHaveBeenCalled();
  });

  it('should propagate errors from the bridge', async () => {
    mockBridge.deleteKey.mockRejectedValue(new Error('IPC error'));
    await expect(service.deleteKey('openai')).rejects.toThrow(ApiKeyStorageError);
  });

  it('should call bridge.getApiKeyDisplayInfo', async () => {
    const displayInfo = { isStored: true, lastFourChars: '1234' };
    mockBridge.getApiKeyDisplayInfo.mockResolvedValue(displayInfo);
    const result = await service.getApiKeyDisplayInfo('openai');
    expect(mockBridge.getApiKeyDisplayInfo).toHaveBeenCalledWith('openai');
    expect(result).toEqual(displayInfo);
  });

  describe('Synchronous Helpers', () => {
    it('getAvailableProviders should return all provider IDs from the provider service', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toEqual(expect.arrayContaining(['openai', 'gemini', 'anthropic', 'mistral']));
      expect(providers.length).toBe(4);
    });

    it('validateApiKeyFormat should correctly validate a key format', () => {
      // Test one provider as an example, since provider-specific tests exist elsewhere
      const validKey = `sk-${'a'.repeat(32)}`;
      const invalidKey = 'invalid-key';
      expect(service.validateApiKeyFormat('openai', validKey)).toBe(true);
      expect(service.validateApiKeyFormat('openai', invalidKey)).toBe(false);
    });

    it('getProvider should return the correct provider validator instance', () => {
      const provider = service.getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider?.providerId).toBe('openai');
    });

    it('getProvider should return undefined for non-existent provider', () => {
      const provider = service.getProvider('nonexistent' as any);
      expect(provider).toBeUndefined();
    });
  });
});