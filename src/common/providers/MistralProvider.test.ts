import { MistralProvider } from './MistralProvider';

describe('MistralProvider', () => {
  const provider = new MistralProvider();

  it('should have the correct providerId', () => {
    expect(provider.providerId).toBe('mistral');
  });

  describe('validateApiKey', () => {
    it.each([
      ['valid key (32 chars)', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', true],
      ['valid key (64 chars)', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', true],
      ['valid key with hyphens', 'abc-def-ghi-jkl-mno-pqr-stu-vwx-yz', true],
      ['valid key with underscores', 'abc_def_ghi_jkl_mno_pqr_stu_vwx_yz', true],
      ['valid mixed alphanumeric', 'AbC123dEf456GhI789jKl012MnO345pQr678', true],
      ['exactly 32 chars', 'abcdefghijklmnopqrstuvwxyz123456', true],
      ['exactly 64 chars', 'abcdefghijklmnopqrstuvwxyz123456abcdefghijklmnopqrstuvwxyz123456', true],
      ['too short (31 chars)', 'abcdefghijklmnopqrstuvwxyz12345', false],
      ['too long (65 chars)', 'abcdefghijklmnopqrstuvwxyz123456abcdefghijklmnopqrstuvwxyz1234567', false],
      ['contains invalid character', 'abc!123', false],
      ['contains spaces', 'abc def ghi jkl mno pqr stu vwx yz', false],
      ['contains special chars', 'abc@123#def$456%ghi^789&jkl*012', false],
      ['empty string', '', false],
    ])('should return %s for %s', (_case, key, expected) => {
      expect(provider.validateApiKey(key)).toBe(expected);
    });
  });
});