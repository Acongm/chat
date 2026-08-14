/**
 * Same browser-safe pair already shipped on auth.acongm.com.
 * Last-resort only for acongm.com hosts when public-config has no usable key.
 */
export const ACONGM_SUPABASE_URL = 'https://ejprvntpxlyydkzsjqnv.supabase.co';

export const ACONGM_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcHJ2bnRweGx5eWRrenNqcW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzAxNjYsImV4cCI6MjA5NjI0NjE2Nn0.a6E_WLbG-7Fv4JUzV1z7yYZH-zP89yD5AVWKV3XUSB8';

export const ACONGM_PUBLIC_CONFIG = {
  supabaseUrl: ACONGM_SUPABASE_URL,
  supabaseAnonKey: ACONGM_SUPABASE_ANON_KEY,
};

export function isAcongmHost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  return hostname === 'acongm.com' || hostname.endsWith('.acongm.com');
}

export function knownPublicConfigForHost(hostname: string | undefined) {
  return isAcongmHost(hostname) ? ACONGM_PUBLIC_CONFIG : null;
}
