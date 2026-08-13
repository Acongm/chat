export {
  claimAnonymousThreads,
  createBrowserClient,
  ensureAnonymousSession,
  getAuthBaseUrl,
  getOAuthLoginUrl,
  isAnonymousUser,
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
  getUserInfo,
  getUserMe,
  getUserSettings,
  updateUserProfile,
  updateUserSettings,
  UserApiError,
} from './profile';
export type {
  ApplicationProfile,
  ProfileUpdateResult,
  SettingsUpdateResult,
  UpdateApplicationProfile,
  UpdateUserSettings,
  UserInfoView,
  UserMe,
  UserSettingsView,
} from './profile';
export { useSession, useUser, useUserInfo, useAuthActions } from './hooks';
