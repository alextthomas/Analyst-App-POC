import type { ReactElement } from "react";
import type { StateDef } from "./ui";
import {
  S1,
  S1_STATES,
  S19,
  S19_STATES,
  S2,
  S2_STATES,
  S3,
  S3_STATES,
} from "./screens/auth";
import { S18, S18_STATES, S4, S4_STATES, S5, S5_STATES } from "./screens/dash";
import {
  S6,
  S6_STATES,
  S7,
  S7_STATES,
  S8,
  S8_STATES,
  S9,
  S9_STATES,
} from "./screens/admin1";
import {
  S10,
  S10_STATES,
  S11,
  S11_STATES,
  S12,
  S12_STATES,
  S13,
  S13_STATES,
  S14,
  S14_STATES,
} from "./screens/admin2";
import {
  S15,
  S15_STATES,
  S16,
  S16_STATES,
  S17,
  S17_STATES,
} from "./screens/admin3";

export interface ScreenDef {
  id: string;
  title: string;
  states: StateDef[];
  admin?: boolean;
  /** Pre-authentication screen: no application navigation. */
  pre?: boolean;
  render(st: string): ReactElement;
}

export const SCREENS: ScreenDef[] = [
  {
    id: "S-1",
    title: "Sign-in",
    states: S1_STATES,
    pre: true,
    render: (st) => <S1 st={st} />,
  },
  {
    id: "S-2",
    title: "Authenticator code (TOTP)",
    states: S2_STATES,
    pre: true,
    render: (st) => <S2 st={st} />,
  },
  {
    id: "S-3",
    title: "Step-up re-authentication",
    states: S3_STATES,
    admin: true,
    render: (st) => <S3 st={st} />,
  },
  {
    id: "S-4",
    title: "Application list",
    states: S4_STATES,
    render: (st) => <S4 st={st} />,
  },
  {
    id: "S-5",
    title: "Application overview",
    states: S5_STATES,
    render: (st) => (
      <S5 key={st === "partial-comparison" ? "c" : "n"} st={st} />
    ),
  },
  {
    id: "S-6",
    title: "Admin: Tenants",
    states: S6_STATES,
    admin: true,
    render: (st) => <S6 st={st} />,
  },
  {
    id: "S-7",
    title: "Admin: User entitlements",
    states: S7_STATES,
    admin: true,
    render: (st) => <S7 st={st} />,
  },
  {
    id: "S-8",
    title: "Admin: Ingestion health",
    states: S8_STATES,
    admin: true,
    render: (st) => <S8 st={st} />,
  },
  {
    id: "S-9",
    title: "Admin: Dead-letter events",
    states: S9_STATES,
    admin: true,
    render: (st) => <S9 st={st} />,
  },
  {
    id: "S-10",
    title: "Admin: Data-subject access and erasure",
    states: S10_STATES,
    admin: true,
    render: (st) => <S10 st={st} />,
  },
  {
    id: "S-11",
    title: "Admin: Objection (suppression list)",
    states: S11_STATES,
    admin: true,
    render: (st) => <S11 st={st} />,
  },
  {
    id: "S-12",
    title: "Admin: Restriction list",
    states: S12_STATES,
    admin: true,
    render: (st) => <S12 st={st} />,
  },
  {
    id: "S-13",
    title: "Admin: Tenant retention",
    states: S13_STATES,
    admin: true,
    render: (st) => <S13 st={st} />,
  },
  {
    id: "S-14",
    title: "Admin: Allow-listed property keys",
    states: S14_STATES,
    admin: true,
    render: (st) => <S14 st={st} />,
  },
  {
    id: "S-15",
    title: "Admin: Accounts",
    states: S15_STATES,
    admin: true,
    render: (st) => <S15 st={st} />,
  },
  {
    id: "S-16",
    title: "Admin: Producer credentials",
    states: S16_STATES,
    admin: true,
    render: (st) => <S16 st={st} />,
  },
  {
    id: "S-17",
    title: "Admin: Audit log",
    states: S17_STATES,
    admin: true,
    render: (st) => <S17 st={st} />,
  },
  { id: "S-18", title: "Not found", states: S18_STATES, render: () => <S18 /> },
  {
    id: "S-19",
    title: "Set password via one-time link",
    states: S19_STATES,
    pre: true,
    render: (st) => <S19 st={st} />,
  },
];

export function screenDef(id: string): ScreenDef {
  const d = SCREENS.find((s) => s.id === id);
  if (!d) throw new Error(`Unknown screen ${id}`);
  return d;
}
export function defaultState(id: string): string {
  return screenDef(id).states[0]?.id ?? "";
}
