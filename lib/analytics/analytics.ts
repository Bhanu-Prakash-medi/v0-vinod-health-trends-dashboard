import { EventPayloadType } from "../../types";

export const sendHotjarEvent = (
  name: string,
  payload: EventPayloadType
) => {
  try {
    if (typeof window !== "undefined" && typeof (window as any).hj === "function") {
      (window as any).hj("event", name);
    }
  } catch {
    // non-blocking
  }
};
