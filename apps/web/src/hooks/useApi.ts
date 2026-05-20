"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetchWithAuth } from "@/lib/api";
import { useSession } from "./useSession";

export function useApi<T>(
  key: string[],
  path: string,
  options?: { enabled?: boolean },
): UseQueryResult<T> {
  const session = useSession();
  const enabled =
    (options?.enabled ?? true) && session !== undefined && session !== null;

  return useQuery({
    queryKey: [...key, session?.userId ?? "anon"],
    enabled,
    queryFn: async () => {
      const token = window.localStorage.getItem("stellar-orbit.sessionToken");
      if (!token) {
        throw new Error("Missing session token");
      }
      return apiFetchWithAuth<T>(token, path);
    },
  });
}
