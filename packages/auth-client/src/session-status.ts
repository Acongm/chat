export type AuthSessionStatus =
  | 'restoring'
  | 'anonymous'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export function resolveAuthSessionStatus(input: {
  configured: boolean;
  loading: boolean;
  hasSession: boolean;
  isAnonymous: boolean;
  error?: string | null;
}): AuthSessionStatus {
  if (!input.configured) return 'unauthenticated';
  if (input.loading) return 'restoring';
  if (input.error) return 'error';
  if (!input.hasSession) return 'unauthenticated';
  if (input.isAnonymous) return 'anonymous';
  return 'authenticated';
}
