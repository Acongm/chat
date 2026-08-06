export {
  claimAnonymousThreads,
  createBrowserClient,
  getAuthBaseUrl,
  getOAuthLoginUrl,
  isAuthConfigured,
  isSocialAuthProvider,
  signInWithGitHub,
  signInWithGoogle,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from './client';
export type {
  AuthClientOptions,
  ClaimAnonymousThreadsInput,
  ClaimAnonymousThreadsResult,
  EmailAuthResult,
  Session,
  SocialAuthProvider,
  User,
} from './client';
export { createServerClient } from './server';
export type { CookieStore, ServerClientOptions } from './server';
export { AuthAccountButton } from './AuthAccountButton';
export type { AuthAccountButtonProps } from './AuthAccountButton';
export {
  useSession,
  useUser,
  useAuthActions,
} from './hooks';
