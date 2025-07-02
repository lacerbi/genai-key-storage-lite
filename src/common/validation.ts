// AI Summary: Provides validation utilities for API provider IDs.
// Includes a type guard and a throwing validator to ensure provider IDs are valid.

import { ApiKeyStorageError } from "./errors";
import { ApiProvider, VALID_PROVIDERS } from "./types";

/**
 * Type guard to check if a string is a valid ApiProvider.
 *
 * @param providerId The provider ID to check.
 * @returns True if the providerId is a valid ApiProvider.
 */
export function isValidProvider(providerId: string): providerId is ApiProvider {
  return VALID_PROVIDERS.includes(providerId as ApiProvider);
}

/**
 * Validates a provider ID and throws an error if it is invalid.
 *
 * @param providerId The provider ID to validate.
 * @throws ApiKeyStorageError if the providerId is not a valid ApiProvider.
 */
export function validateProviderOrThrow(providerId: string): void {
  if (!isValidProvider(providerId)) {
    throw new ApiKeyStorageError(`Invalid provider ID: ${providerId}`);
  }
}
