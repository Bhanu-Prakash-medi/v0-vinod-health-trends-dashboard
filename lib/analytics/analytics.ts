import { EventPayloadType } from "../../types";
import { isAnalyticsAllowed } from "./access-gate";

export const sendHotjarEvent = (
  name: string,
  payload: EventPayloadType
) => {
  if (!isAnalyticsAllowed()) return;
  try {
    if (typeof window !== "undefined" && typeof (window as any).hj === "function") {
      (window as any).hj("event", name);
    }
  } catch {
    // non-blocking
  }
};
