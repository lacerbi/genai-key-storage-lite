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
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(`${mockUserDataPath}/secure_api_keys`, { recursive: true });
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
      const expectedPath = `${mockUserDataPath}/secure_api_keys/${providerId}.json`;
      const expectedData = JSON.stringify({
        encryptedKey: encryptedKey.toString('base64'),
        lastFourChars: lastFour,
      });
      expect(mockedFsPromises.writeFile).toHaveBeenCalledWith(expectedPath, expectedData);
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
      expect(mockedFsPromises.readFile).toHaveBeenCalledWith(`${mockUserDataPath}/secure_api_keys/openai.json`, 'utf-8');
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
      const expectedPath = `${mockUserDataPath}/secure_api_keys/openai.json`;
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
  
  describe('validateAndGetSecurePath', () => {
    it('should throw on path traversal attempt', () => {
      // This is an internal method, but its security is critical to test.
      // We use a cast to any to bypass TypeScript's private access modifier check for testing purposes.
      const internalService = service as any;
      const maliciousProviderId = '../other-folder/key';
      expect(() => internalService.validateAndGetSecurePath(maliciousProviderId)).toThrow(ApiKeyStorageError);
    });
  });
});