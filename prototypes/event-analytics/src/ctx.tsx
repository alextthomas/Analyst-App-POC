import { createContext, useContext } from "react";

export type Role = "user" | "admin";
export type ScreenId = string;

export interface GuardOpts {
  /** Name of the REQ-27 / AC-8.5 action: opens S-3 when last authentication is stale. */
  stepUp?: string;
  /** Confirmation text (C-7). Shown after step-up. */
  confirm?: string;
}

export interface Proto {
  role: Role;
  setRole(r: Role): void;
  screen: ScreenId;
  st: string;
  setSt(s: string): void;
  app: string;
  setApp(a: string): void;
  go(s: ScreenId, st?: string): void;
  guard(o: GuardOpts, run: () => void): void;
  confirm(text: string, run: () => void): void;
  setLeaveGuard(text: string | null): void;
}

export const ProtoCtx = createContext<Proto | null>(null);

export function useProto(): Proto {
  const c = useContext(ProtoCtx);
  if (!c) throw new Error("ProtoCtx missing");
  return c;
}
