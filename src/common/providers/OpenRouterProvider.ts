// AI Summary: OpenRouter API key provider with format validation.
// Validates OpenRouter API keys against the expected sk-or- prefix and minimum length.

import { IApiProviderValidator } from './ProviderInterface';
import { ApiProvider } from '../types';

/**
 * Provider implementation for OpenRouter API keys
 *
 * Handles OpenRouter-specific validation and format checking.
 */
export class OpenRouterProvider implements IApiProviderValidator {
  readonly providerId: ApiProvider = 'openrouter';

  /**
   * Validates if an API key has the correct format for OpenRouter
   *
   * OpenRouter API keys:
   * - Start with the prefix 'sk-or-'
   * - Are at least 40 characters long
   * - Should not include leading or trailing whitespace
   *
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return apiKey === apiKey.trim() && apiKey.startsWith('sk-or-') && apiKey.length >= 40;
  }
}
