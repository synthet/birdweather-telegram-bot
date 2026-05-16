export class UserInputError extends Error {}
export const asErrorMessage = (err: unknown): string => err instanceof Error ? err.message : 'Unknown error';
