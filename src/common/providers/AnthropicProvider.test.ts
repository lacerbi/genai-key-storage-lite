import { AnthropicProvider } from './AnthropicProvider';

describe('AnthropicProvider', () => {
  const provider = new AnthropicProvider();

  it('should have the correct providerId', () => {
    expect(provider.providerId).toBe('anthropic');
  });

  describe('validateApiKey', () => {
    it.each([
      ['valid key (24 chars after prefix)', `sk-ant-${'a'.repeat(24)}`, true],
      ['valid key with hyphens', `sk-ant-${'abc-123-def-456-ghi'.repeat(2)}`, true],
      ['valid key with underscores', `sk-ant-${'abc_123_def_456_ghi'.repeat(2)}`, true],
      ['valid long key', `sk-ant-${'a'.repeat(50)}`, true],
      ['invalid short key (23 chars after prefix)', `sk-ant-${'a'.repeat(23)}`, false],
      ['invalid prefix', `sk-anth-${'a'.repeat(24)}`, false],
      ['missing sk-ant prefix', 'a'.repeat(30), false],
      ['empty string', '', false],
      ['invalid characters', `sk-ant-${'a'.repeat(15)}@123#def`, false],
      ['wrong prefix order', `ant-sk-${'a'.repeat(24)}`, false],
    ])('should return %s for %s', (_case, key, expected) => {
      expect(provider.validateApiKey(key)).toBe(expected);
    });
  });
});