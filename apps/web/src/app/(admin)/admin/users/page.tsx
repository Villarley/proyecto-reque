"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@stellar-orbit/ui";
import { apiFetchWithAuth } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type UserRow = {
  id: string;
  stellarPublicKey: string;
  name: string | null;
  email: string | null;
  role: "ambassador" | "country_lead" | "global_admin";
  chapterId: string;
  chapterName: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type UsersResponse = {
  users: UserRow[];
  total: number;
};

function truncate(value: string, left = 6, right = 4): string {
  if (value.length <= left + right) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function getToken(): string {
  return window.localStorage.getItem("stellar-orbit.sessionToken") ?? "";
}

export default function AdminUsersPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (roleFilter) qs.set("role", roleFilter);
  const qsStr = qs.toString() ? `?${qs.toString()}` : "";

  const usersQuery = useQuery({
    queryKey: ["admin", "users", search, roleFilter],
    queryFn: async () => {
      return apiFetchWithAuth<UsersResponse>(getToken(), `/admin/users${qsStr}`);
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: string;
    }) => {
      return apiFetchWithAuth<{ user: { id: string; role: string } }>(
        getToken(),
        `/admin/users/${userId}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        },
      );
    },
    onMutate: ({ userId }) => {
      setSavingId(userId);
      setSaveError(null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : t.users.updateRoleFailed);
    },
    onSettled: () => {
      setSavingId(null);
    },
  });

  const users = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-orbit-text">{t.users.title}</h1>
          <p className="mt-1 text-sm text-orbit-text-2">{t.users.subtitle}</p>
        </div>
        {total > 0 && (
          <p className="text-sm text-orbit-text-3">
            {total} {total === 1 ? "user" : "users"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder={t.users.searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          className="min-w-[220px] flex-1 rounded-lg border border-orbit-border bg-orbit-surface px-3 py-2 text-sm text-orbit-text placeholder:text-orbit-text-3 focus:border-orbit-violet/50 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
          }}
          className="rounded-lg border border-orbit-border bg-orbit-surface px-3 py-2 text-sm text-orbit-text focus:border-orbit-violet/50 focus:outline-none"
        >
          <option value="">{t.common.allRoles}</option>
          <option value="ambassador">{t.roles.ambassador}</option>
          <option value="country_lead">{t.roles.country_lead}</option>
          <option value="global_admin">{t.roles.global_admin}</option>
        </select>
      </div>

      {saveError && (
        <p className="text-sm text-orbit-error" role="alert">
          {saveError}
        </p>
      )}

      {usersQuery.isLoading ? (
        <p className="text-sm text-orbit-text-2">{t.common.loading}</p>
      ) : usersQuery.isError ? (
        <p className="text-sm text-orbit-error">{t.common.error}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-orbit-text-2">{t.users.noUsersFound}</p>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-orbit-raised text-[11px] font-semibold uppercase tracking-wide text-orbit-text-3">
                <tr className="border-b border-orbit-border">
                  <th className="px-4 py-3 text-left">{t.users.wallet}</th>
                  <th className="px-4 py-3 text-left">{t.users.name}</th>
                  <th className="px-4 py-3 text-left">{t.users.chapter}</th>
                  <th className="px-4 py-3 text-left">{t.users.role}</th>
                  <th className="px-4 py-3 text-left">{t.common.verified}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-orbit-border last:border-0 hover:bg-orbit-raised/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-xs text-orbit-text-2"
                        title={user.stellarPublicKey}
                      >
                        {truncate(user.stellarPublicKey)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-orbit-text">
                      {user.name ?? <span className="text-orbit-text-3">-</span>}
                    </td>
                    <td className="px-4 py-3 text-orbit-text-2">
                      {user.chapterName ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={(e) => {
                          roleMutation.mutate({
                            userId: user.id,
                            role: e.target.value,
                          });
                        }}
                        className="rounded-md border border-orbit-border bg-orbit-surface px-2 py-1 text-xs font-medium text-orbit-text focus:border-orbit-violet/50 focus:outline-none disabled:opacity-50"
                      >
                        <option value="ambassador">{t.roles.ambassador}</option>
                        <option value="country_lead">{t.roles.country_lead}</option>
                        <option value="global_admin">{t.roles.global_admin}</option>
                      </select>
                      {savingId === user.id && (
                        <span className="ml-2 text-xs text-orbit-text-3">{t.users.saving}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.verifiedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orbit-success/10 px-2 py-0.5 text-xs font-medium text-orbit-success">
                          {t.common.verified}
                        </span>
                      ) : (
                        <span className="text-xs text-orbit-text-3">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && (
        <p className="text-xs text-orbit-text-3">{t.users.roleChangesNote}</p>
      )}
    </div>
  );
}
