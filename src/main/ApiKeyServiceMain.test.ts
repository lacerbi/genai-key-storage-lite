// src/main/ApiKeyServiceMain.test.ts

// Mock the electron module before importing anything else
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: jest.fn(),
    encryptString: jest.fn(),
    decryptString: jest.fn(),
  },
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data'),
  },
}));

// Mock the entire fs module
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(''),
    unlink: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
  },
}));

import { ApiKeyServiceMain } from './ApiKeyServiceMain';
import { safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ApiKeyStorageError } from '../common';

describe('ApiKeyServiceMain', () => {
  let service: ApiKeyServiceMain;
  const mockUserDataPath = '/mock/user/data';

  // Cast mocks to Jest's mock type to access mock functions
  const mockedSafeStorage = safeStorage as jest.Mocked<typeof safeStorage>;
  const mockedFs = fs as jest.Mocked<typeof fs>;
  const mockedFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    service = new ApiKeyServiceMain(mockUserDataPath);
  });
  
  it('should ensure storage directory exists on instantiation', () => {
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.join(mockUserDataPath, 'secure_api_keys'), { recursive: true });
  });

  describe('storeKey', () => {
    it('should store an API key successfully', async () => {
      const apiKey = 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const providerId = 'openai';
      const encryptedKey = Buffer.from('encrypted-key');
      const lastFour = apiKey.slice(-4);
      
      mockedSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockedSafeStorage.encryptString.mockReturnValue(encryptedKey);
      
      await service.storeKey(providerId, apiKey);
      
      expect(mockedSafeStorage.encryptString).toHaveBeenCalledWith(apiKey);
      const expectedPath = path.join(mockUserDataPath, 'secure_api_keys', `${providerId}.json`);
      const expectedData = JSON.stringify({
        encryptedKey: encryptedKey.toString('base64'),
        lastFourChars: lastFour,
      });
      // The writeFileSecurely method handles platform differences internally
      // We just check that writeFile was called with the correct path and data
      expect(mockedFsPromises.writeFile).toHaveBeenCalled();
      const writeFileCall = mockedFsPromises.writeFile.mock.calls[0];
      expect(writeFileCall[0]).toBe(expectedPath);
      expect(writeFileCall[1]).toBe(expectedData);
      // Platform-specific: Unix has mode parameter, Windows doesn't
      if (writeFileCall[2]) {
        expect(writeFileCall[2]).toEqual({ mode: 0o600 });
      }
    });
    
    it('should throw if API key format is invalid', async () => {
      await expect(service.storeKey('openai', 'invalid-key')).rejects.toThrow(ApiKeyStorageError);
    });
    
    it('should throw if encryption is not available', async () => {
      mockedSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      const apiKey = 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      await expect(service.storeKey('openai', apiKey)).rejects.toThrow('OS-level encryption is not available');
    });
  });

  describe('withDecryptedKey', () => {
    it('should decrypt and provide key to the callback', async () => {
      const providerId = 'openai';
      const apiKey = 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const encryptedKey = Buffer.from('encrypted-data').toString('base64');
      const fileContent = JSON.stringify({ encryptedKey, lastFourChars: 'xxxx' });
      const operation = jest.fn().mockResolvedValue('success');
      
      mockedFsPromises.readFile.mockResolvedValue(fileContent);
      mockedSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockedSafeStorage.decryptString.mockReturnValue(apiKey);
      
      const result = await service.withDecryptedKey(providerId, operation);
      
      expect(result).toBe('success');
      expect(mockedFsPromises.readFile).toHaveBeenCalledWith(path.join(mockUserDataPath, 'secure_api_keys', 'openai.json'), 'utf-8');
      expect(mockedSafeStorage.decryptString).toHaveBeenCalled();
      expect(operation).toHaveBeenCalledWith(apiKey);
    });
    
    it('should throw if key is not found', async () => {
      mockedFsPromises.access.mockRejectedValue(new Error('File not found'));
      await expect(service.withDecryptedKey('openai', jest.fn())).rejects.toThrow(ApiKeyStorageError);
    });
  });

  describe('deleteKey', () => {
    it('should delete a key file', async () => {
      await service.deleteKey('openai');
      const expectedPath = path.join(mockUserDataPath, 'secure_api_keys', 'openai.json');
      expect(mockedFsPromises.unlink).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('getApiKeyDisplayInfo', () => {
    it('should return display info for a stored key', async () => {
      const providerId = 'openai';
      const fileContent = JSON.stringify({ lastFourChars: 'xxxx' });
      mockedFsPromises.readFile.mockResolvedValue(fileContent);
      
      const info = await service.getApiKeyDisplayInfo(providerId);
      
      expect(info).toEqual({ isStored: true, lastFourChars: 'xxxx' });
    });

    it('should return isStored: false if key file does not exist', async () => {
      mockedFsPromises.readFile.mockRejectedValue(new Error('ENOENT'));
      const info = await service.getApiKeyDisplayInfo('openai');
      expect(info).toEqual({ isStored: false });
    });
  });
  
  describe('isKeyStored', () => {
    it('should return true if key metadata is loaded in memory', async () => {
      // Manually set metadata as if it was loaded at startup
      (service as any).loadedKeyMetadata.set('openai', { lastFourChars: 'xxxx' });
      await expect(service.isKeyStored('openai')).resolves.toBe(true);
      expect(mockedFsPromises.access).not.toHaveBeenCalled(); // Should not hit the disk
    });

    it('should return true if key file exists on disk but not in memory', async () => {
      mockedFsPromises.access.mockResolvedValue(undefined);
      // Mock readFile to simulate finding metadata in the file
      mockedFsPromises.readFile.mockResolvedValue(JSON.stringify({ lastFourChars: 'yyyy' }));
      await expect(service.isKeyStored('openai')).resolves.toBe(true);
      expect(mockedFsPromises.access).toHaveBeenCalledWith(path.join(mockUserDataPath, 'secure_api_keys', 'openai.json'));
    });

    it('should return false if key is not in memory and file does not exist', async () => {
      mockedFsPromises.access.mockRejectedValue(new Error('ENOENT'));
      await expect(service.isKeyStored('openai')).resolves.toBe(false);
    });

    it('should return true even if file exists but cannot be parsed', async () => {
      mockedFsPromises.access.mockResolvedValue(undefined);
      mockedFsPromises.readFile.mockResolvedValue('{ not valid json }');
      await expect(service.isKeyStored('openai')).resolves.toBe(true);
    });
  });

  describe('getStoredProviderIds', () => {
    it('should return an array of provider IDs from loaded metadata', () => {
      (service as any).loadedKeyMetadata.set('openai', { lastFourChars: 'xxxx' });
      (service as any).loadedKeyMetadata.set('gemini', { lastFourChars: 'yyyy' });
      expect(service.getStoredProviderIds()).toEqual(['openai', 'gemini']);
    });

    it('should return an empty array if no metadata is loaded', () => {
      expect(service.getStoredProviderIds()).toEqual([]);
    });
  });

  describe('loadAllKeysFromDisk (on instantiation)', () => {
    it('should load metadata from valid key files', async () => {
      mockedFsPromises.readdir.mockResolvedValue(['openai.json', 'gemini.json'] as any);
      mockedFsPromises.readFile
        .mockResolvedValueOnce(JSON.stringify({ lastFourChars: 'opai' }))
        .mockResolvedValueOnce(JSON.stringify({ lastFourChars: 'mini' }));

      const newService = new ApiKeyServiceMain(mockUserDataPath);
      // Allow promises in constructor to resolve
      await new Promise(process.nextTick);

      expect(newService.getStoredProviderIds()).toEqual(['openai', 'gemini']);
      const displayInfo = await newService.getApiKeyDisplayInfo('openai');
      expect(displayInfo.lastFourChars).toBe('opai');
    });

    it('should handle and skip malformed JSON files', async () => {
      mockedFsPromises.readdir.mockResolvedValue(['openai.json', 'corrupted.json'] as any);
      mockedFsPromises.readFile
        .mockResolvedValueOnce(JSON.stringify({ lastFourChars: 'opai' }))
        .mockResolvedValueOnce('this is not json');

      const newService = new ApiKeyServiceMain(mockUserDataPath);
      await new Promise(process.nextTick);

      expect(newService.getStoredProviderIds()).toEqual(['openai']);
    });

    it('should skip unknown provider files', async () => {
      mockedFsPromises.readdir.mockResolvedValue(['openai.json', 'unknown-provider.json'] as any);
      mockedFsPromises.readFile.mockResolvedValueOnce(JSON.stringify({ lastFourChars: 'opai' }));

      const newService = new ApiKeyServiceMain(mockUserDataPath);
      await new Promise(process.nextTick);

      expect(newService.getStoredProviderIds()).toEqual(['openai']);
    });

    it('should handle files without lastFourChars metadata', async () => {
      mockedFsPromises.readdir.mockResolvedValue(['openai.json'] as any);
      mockedFsPromises.readFile.mockResolvedValueOnce(JSON.stringify({ encryptedKey: 'somekey' }));

      const newService = new ApiKeyServiceMain(mockUserDataPath);
      await new Promise(process.nextTick);

      expect(newService.getStoredProviderIds()).toEqual([]);
    });

    it('should continue loading other keys when one file fails', async () => {
      mockedFsPromises.readdir.mockResolvedValue(['openai.json', 'anthropic.json', 'gemini.json'] as any);
      mockedFsPromises.readFile
        .mockResolvedValueOnce(JSON.stringify({ lastFourChars: 'opai' }))
        .mockRejectedValueOnce(new Error('File read error'))
        .mockResolvedValueOnce(JSON.stringify({ lastFourChars: 'mini' }));

      const newService = new ApiKeyServiceMain(mockUserDataPath);
      await new Promise(process.nextTick);

      expect(newService.getStoredProviderIds()).toEqual(['openai', 'gemini']);
    });
  });

  describe('withDecryptedKey - additional error cases', () => {
    it('should throw ApiKeyStorageError if key file is corrupted', async () => {
      mockedFsPromises.readFile.mockResolvedValue('{ not json }');
      mockedFsPromises.access.mockResolvedValue(undefined); // File exists
      const operation = jest.fn();
      await expect(service.withDecryptedKey('openai', operation)).rejects.toThrow(ApiKeyStorageError);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should throw ApiKeyStorageError if safeStorage is unavailable during decryption', async () => {
      const fileContent = JSON.stringify({ encryptedKey: 'some-key', lastFourChars: 'xxxx' });
      mockedFsPromises.readFile.mockResolvedValue(fileContent);
      mockedFsPromises.access.mockResolvedValue(undefined);
      mockedSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      
      const operation = jest.fn();
      await expect(service.withDecryptedKey('openai', operation)).rejects.toThrow(ApiKeyStorageError);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should throw ApiKeyStorageError if decrypted key has invalid format', async () => {
      const fileContent = JSON.stringify({ encryptedKey: 'some-key', lastFourChars: 'xxxx' });
      mockedFsPromises.readFile.mockResolvedValue(fileContent);
      mockedFsPromises.access.mockResolvedValue(undefined);
      mockedSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockedSafeStorage.decryptString.mockReturnValue('invalid-api-key-format');
      
      const operation = jest.fn();
      await expect(service.withDecryptedKey('openai', operation)).rejects.toThrow(ApiKeyStorageError);
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('validateAndGetSecurePath', () => {
    it('should throw on path traversal attempt', () => {
      // This is an internal method, but its security is critical to test.
      // We use a cast to any to bypass TypeScript's private access modifier check for testing purposes.
      const internalService = service as any;
      const maliciousProviderId = '../other-folder/key';
      expect(() => internalService.validateAndGetSecurePath(maliciousProviderId)).toThrow(ApiKeyStorageError);
    });

    it('should throw on invalid characters in provider ID', () => {
      const internalService = service as any;
      const invalidProviderId = 'provider@id';
      expect(() => internalService.validateAndGetSecurePath(invalidProviderId)).toThrow(ApiKeyStorageError);
    });

    it('should return valid path for legitimate provider ID', () => {
      const internalService = service as any;
      const validProviderId = 'openai';
      const result = internalService.validateAndGetSecurePath(validProviderId);
      expect(result).toBe(path.join(mockUserDataPath, 'secure_api_keys', 'openai.json'));
    });
  });
});