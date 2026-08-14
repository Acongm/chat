export {
  claimAnonymousThreads,
  createBrowserClient,
  ensureAnonymousSession,
  getAuthBaseUrl,
  getAuthPublicConfig,
  getOAuthLoginUrl,
  loadAuthPublicConfig,
  isAnonymousSession,
  isAnonymousUser,
  isAuthConfigured,
  isSocialAuthProvider,
  linkOAuthIdentity,
  resolveOAuthLoginMode,
  signInWithGitHub,
  signInWithGoogle,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  startOAuthFlow,
} from './client';
export type {
  AuthPublicConfig,
  AuthClientOptions,
  ClaimAnonymousThreadsInput,
  ClaimAnonymousThreadsResult,
  EmailAuthResult,
  OAuthIntent,
  OAuthStartMode,
  Session,
  SocialAuthProvider,
  User,
} from './client';
export { createServerClient } from './server';
export type { CookieStore, ServerClientOptions } from './server';
export { AuthAccountButton } from './AuthAccountButton';
export type { AuthAccountButtonProps } from './AuthAccountButton';
export { AuthAccountMenu } from './AuthAccountMenu';
export type { AuthAccountMenuProps } from './AuthAccountMenu';
export {
  clearAuthSessionCache,
  getAuthSession,
  getUserInfo,
  getUserMe,
  getUserProfile,
  getUserSettings,
  updateUserProfile,
  updateUserSettings,
  UserApiError,
} from './profile';
export type {
  AuthSessionView,
  ApplicationProfile,
  ProfileUpdateResult,
  SettingsUpdateResult,
  UpdateApplicationProfile,
  UpdateUserSettings,
  UserInfoView,
  UserMe,
  UserProfileResult,
  UserSettingsView,
} from './profile';
export {
  useSession,
  useUser,
  useUserInfo,
  useAuthActions,
} from './hooks';
export type { UseSessionOptions } from './hooks';
export { resolveAuthSessionStatus } from './session-status';
export type { AuthSessionStatus } from './session-status';
