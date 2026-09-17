export function logOperationError(
  scope: string,
  operation: string,
  error: unknown,
) {
  const details =
    error instanceof Error
      ? {
          message: error.message,
          ...(error.stack ? { stack: error.stack } : {}),
        }
      : { message: String(error) };

  console.error(`[${scope}] D1 operation failed: ${operation}`, details);
}

export async function withD1OperationLogging<T>(
  scope: string,
  operation: string,
  callback: () => Promise<T>,
): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    logOperationError(scope, operation, error);
    throw error;
  }
}