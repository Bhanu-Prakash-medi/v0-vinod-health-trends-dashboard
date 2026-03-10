// @docsapp/analytics is a private npm package - use direct Hotjar API in v0 runtime
// Replace with @docsapp/analytics import when deploying to production
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
