import { OpenRouterProvider } from './OpenRouterProvider';

describe('OpenRouterProvider', () => {
  const provider = new OpenRouterProvider();

  it('should have the correct providerId', () => {
    expect(provider.providerId).toBe('openrouter');
  });

  describe('validateApiKey', () => {
    it.each([
      ['valid key', `sk-or-${'a'.repeat(34)}`, true],
      ['valid v1-style key', `sk-or-v1-${'a'.repeat(31)}`, true],
      ['valid longer key', `sk-or-${'A1_-'.repeat(12)}`, true],
      ['non-OpenRouter prefix', `sk-${'a'.repeat(37)}`, false],
      ['OpenAI-style project prefix', `sk-proj-${'a'.repeat(33)}`, false],
      ['too short', `sk-or-${'a'.repeat(33)}`, false],
      ['leading whitespace', ` sk-or-${'a'.repeat(34)}`, false],
      ['trailing whitespace', `sk-or-${'a'.repeat(34)} `, false],
      ['whitespace only', ' '.repeat(40), false],
      ['empty string', '', false],
    ])('should return %s for %s', (_case, key, expected) => {
      expect(provider.validateApiKey(key)).toBe(expected);
    });
  });
});
