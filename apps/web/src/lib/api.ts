import { env } from "@/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || response.statusText, response.status);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function apiFetchWithAuth<TResponse>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  return apiFetch<TResponse>(path, {
    ...init,
    headers,
  });
}

export async function authorizedFetchCsv(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, {
    ...init,
    headers,
  });
}
