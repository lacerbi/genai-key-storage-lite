// src/common/errors.test.ts
import { ApiKeyStorageError } from './errors';

describe('ApiKeyStorageError', () => {
  it('should create an instance with the correct message and name', () => {
    const errorMessage = 'Test error message';
    const error = new ApiKeyStorageError(errorMessage);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiKeyStorageError);
    expect(error.message).toBe(errorMessage);
    expect(error.name).toBe('ApiKeyStorageError');
  });
});