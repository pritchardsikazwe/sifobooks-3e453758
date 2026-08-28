import { createContext, useContext, type ReactNode } from "react";
import type { PosContext } from "@/lib/pos-permissions";

const Ctx = createContext<PosContext | null>(null);

export function PosContextProvider({ value, children }: { value: PosContext | null; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePosContext() {
  return useContext(Ctx);
}
