import { GeminiProvider } from './GeminiProvider';

describe('GeminiProvider', () => {
  const provider = new GeminiProvider();

  it('should have the correct providerId', () => {
    expect(provider.providerId).toBe('gemini');
  });

  describe('validateApiKey', () => {
    it.each([
      ['valid key (37 chars total)', `AI${'a'.repeat(35)}`, true],
      ['valid key with hyphens and underscores', `AI${'a_b-c'.repeat(7)}`, true],
      ['exactly 37 chars total', `AI${'a'.repeat(35)}`, true],
      ['exactly 47 chars total', `AI${'a'.repeat(45)}`, true],
      ['valid mixed characters', `AI${'abc123_def-456_ghi-789abc123def4567890'}`, true],
      ['too short (36 chars)', `AI${'a'.repeat(34)}`, false],
      ['too long (48 chars)', `AI${'a'.repeat(46)}`, false],
      ['invalid prefix', `BI${'a'.repeat(35)}`, false],
      ['missing AI prefix', `za${'a'.repeat(35)}`, false],
      ['empty string', '', false],
      ['invalid characters', `AI${'a'.repeat(25)}@#$%^&*()`, false],
      ['only AI prefix', 'AI', false],
    ])('should return %s for %s', (_case, key, expected) => {
      expect(provider.validateApiKey(key)).toBe(expected);
    });
  });
});