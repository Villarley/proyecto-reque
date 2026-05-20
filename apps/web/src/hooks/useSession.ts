"use client";

import type { Role } from "@stellar-orbit/types";
import { useEffect, useState } from "react";

const STORAGE_KEY = "stellar-orbit.sessionToken";

export type SessionPayload = {
  userId: string;
  role: Role;
  chapterId: string;
  stellarPublicKey: string;
};

function decodeJwtPayloadSegment(segment: string): unknown {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const json = atob(base64 + pad);
  return JSON.parse(json) as unknown;
}

function parseSessionPayload(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payloadSegment = parts[1];
  if (!payloadSegment) {
    return null;
  }
  try {
    const raw = decodeJwtPayloadSegment(payloadSegment) as Record<string, unknown>;
    const sub = raw["sub"];
    const role = raw["role"];
    const chapterId = raw["chapterId"];
    const stellarPublicKey = raw["stellarPublicKey"];

    if (typeof sub !== "string") {
      return null;
    }
    if (typeof stellarPublicKey !== "string") {
      return null;
    }
    if (typeof chapterId !== "string") {
      return null;
    }
    if (role !== "ambassador" && role !== "country_lead" && role !== "global_admin") {
      return null;
    }

    return {
      userId: sub,
      role,
      chapterId,
      stellarPublicKey,
    };
  } catch {
    return null;
  }
}

/** `undefined` while hydrating, `null` if missing or invalid token, otherwise session claims. */
export function useSession(): SessionPayload | null | undefined {
  const [state, setState] = useState<SessionPayload | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const token = window.localStorage.getItem(STORAGE_KEY);
    if (!token) {
      setState(null);
      return;
    }
    setState(parseSessionPayload(token));
  }, []);

  return state;
}
