// src/preload/index.test.ts
import { createApiKeyManagerBridge } from './index';
import { ipcRenderer } from 'electron';
import { IPCChannelNames } from '../common/types';

jest.mock('electron', () => ({
    ipcRenderer: {
        invoke: jest.fn(),
    },
}));

describe('createApiKeyManagerBridge', () => {
  const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;
  const bridge = createApiKeyManagerBridge();

  beforeEach(() => {
      jest.clearAllMocks();
  });
  
  it('should call invoke for storeKey', () => {
      const payload = { providerId: 'openai', apiKey: 'key123' };
      bridge.storeKey(payload.providerId, payload.apiKey);
      expect(mockedIpcRenderer.invoke).toHaveBeenCalledWith(IPCChannelNames.SECURE_API_KEY_STORE, payload);
  });

  it('should call invoke for deleteKey', () => {
      bridge.deleteKey('openai');
      expect(mockedIpcRenderer.invoke).toHaveBeenCalledWith(IPCChannelNames.SECURE_API_KEY_DELETE, 'openai');
  });
});