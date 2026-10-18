import type { QueryClient } from '@tanstack/react-query';
import {
  getGetAdminAuditQueryKey, getGetAdminLessonsQueryKey, getGetAdminOverviewQueryKey,
  getGetAdminSettingsQueryKey, getGetAdminUsersQueryKey, getGetBillingStatusQueryKey,
  getGetCoursesQueryKey, getGetProgressQueryKey, getGetPublicSettingsQueryKey, getGetVocabularyQueryKey,
} from '@workspace/api-client-react';

export function invalidateAdmin(qc: QueryClient, scope: 'users' | 'settings' | 'lessons') {
  const keys: readonly (readonly unknown[])[] = [
    getGetAdminOverviewQueryKey(), getGetAdminAuditQueryKey(),
    ...(scope === 'users' ? [getGetAdminUsersQueryKey(), getGetBillingStatusQueryKey()] : []),
    ...(scope === 'settings' ? [getGetAdminSettingsQueryKey(), getGetPublicSettingsQueryKey(), getGetBillingStatusQueryKey()] : []),
    ...(scope === 'lessons' ? [getGetAdminLessonsQueryKey(), getGetCoursesQueryKey(), getGetProgressQueryKey(), getGetVocabularyQueryKey()] : []),
  ];
  for (const k of keys) void qc.invalidateQueries({ queryKey: k });
}

export function errMsg(e: unknown, fallback: string): string {
  const x = e as { data?: { error?: string; message?: string }; message?: string } | null;
  return x?.data?.error ?? x?.data?.message ?? x?.message ?? fallback;
}

export function fmtDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' });
}
