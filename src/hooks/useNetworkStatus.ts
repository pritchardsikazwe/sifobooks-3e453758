import { useEffect, useState } from "react";
import {
  getNetworkSnapshot,
  subscribeNetwork,
  type NetworkSnapshot,
} from "@/lib/network-status";

/** Live online/offline/syncing state plus pending-transaction counters. */
export function useNetworkStatus(): NetworkSnapshot {
  const [snap, setSnap] = useState<NetworkSnapshot>(getNetworkSnapshot);
  useEffect(() => subscribeNetwork(setSnap), []);
  return snap;
}
