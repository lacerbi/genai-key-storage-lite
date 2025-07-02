import { OpenAIProvider } from './OpenAIProvider';

describe('OpenAIProvider', () => {
  const provider = new OpenAIProvider();

  it('should have the correct providerId', () => {
    expect(provider.providerId).toBe('openai');
  });

  describe('validateApiKey', () => {
    it.each([
      ['valid sk- key (32 chars after prefix)', `sk-${'a'.repeat(32)}`, true],
      ['valid org- key (32 chars after prefix)', `org-${'a'.repeat(32)}`, true],
      ['valid long sk- key', `sk-${'a'.repeat(100)}`, true],
      ['valid key with hyphens and underscores', `sk-${'abc_123-def_456-ghi_789'.repeat(2)}`, true],
      ['valid 200 char key', `sk-${'a'.repeat(200)}`, true],
      ['invalid short key (31 chars after prefix)', `sk-${'a'.repeat(31)}`, false],
      ['invalid prefix', `pk-${'a'.repeat(32)}`, false],
      ['invalid too long key', `sk-${'a'.repeat(201)}`, false],
      ['empty string', '', false],
      ['missing prefix', 'a'.repeat(35), false],
      ['invalid characters', `sk-${'a'.repeat(20)}@123#def`, false],
    ])('should return %s for %s', (_case, key, expected) => {
      expect(provider.validateApiKey(key)).toBe(expected);
    });
  });
});