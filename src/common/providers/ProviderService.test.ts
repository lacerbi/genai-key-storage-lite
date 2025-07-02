// src/common/providers/ProviderService.test.ts
import { ProviderService } from './ProviderService';
import { VALID_PROVIDERS } from '../types';

describe('ProviderService', () => {
  let providerService: ProviderService;

  beforeEach(() => {
    providerService = new ProviderService();
  });

  it('should register all built-in providers on instantiation', () => {
    const providerIds = providerService.getAllProviderIds();
    expect(providerIds).toEqual(expect.arrayContaining(VALID_PROVIDERS));
    expect(providerIds.length).toBe(VALID_PROVIDERS.length);
  });

  it('should return a provider validator by its ID', () => {
    const openaiProvider = providerService.getProvider('openai');
    expect(openaiProvider).toBeDefined();
    expect(openaiProvider?.providerId).toBe('openai');
  });

  it('should return undefined for a non-existent provider', () => {
    const nonExistentProvider = providerService.getProvider('non-existent' as any);
    expect(nonExistentProvider).toBeUndefined();
  });

  describe('API Key Validation', () => {
    it('should validate a correct OpenAI key', () => {
      expect(providerService.validateApiKey('openai', 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });
    
    it('should reject an incorrect OpenAI key', () => {
      expect(providerService.validateApiKey('openai', 'sk-xxxxxxxx')).toBe(false);
    });

    it('should validate a correct Anthropic key', () => {
      expect(providerService.validateApiKey('anthropic', 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxx')).toBe(true);
    });

    it('should reject an incorrect Anthropic key', () => {
      expect(providerService.validateApiKey('anthropic', 'ant-xxxxxxxx')).toBe(false);
    });

    it('should validate a correct Gemini key', () => {
      expect(providerService.validateApiKey('gemini', 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxx')).toBe(true);
    });
    
    it('should reject an incorrect Gemini key', () => {
      expect(providerService.validateApiKey('gemini', 'AIza-xxxxxxxx')).toBe(false);
    });

    it('should validate a correct Mistral key', () => {
      expect(providerService.validateApiKey('mistral', 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true); // 32 chars
    });

    it('should reject an incorrect Mistral key', () => {
      expect(providerService.validateApiKey('mistral', 'short')).toBe(false);
    });

    it('should return false for an unknown provider', () => {
      expect(providerService.validateApiKey('non-existent' as any, 'any-key')).toBe(false);
    });
  });
});