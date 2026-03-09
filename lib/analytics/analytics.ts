import { AnalyticsManager, MBAnalytics } from "@docsapp/analytics";
import { HOTJAR } from "../../constants";
import { EventPayloadType } from "../../types";

const __MB_Analytics = new MBAnalytics(
  [HOTJAR],
  process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
);

const analyticsManager = new AnalyticsManager({
  analyticsInstance: __MB_Analytics,
  platforms: {},
  schemas: {},
  defaultServiceName: "",
  defaultProviders: [HOTJAR],
});

export const sendHotjarEvent = (
  name: string,
  payload: EventPayloadType
) => {
  analyticsManager.sendHotjarEvent(
    name,
    payload as Record<string, string>
  );
};

export { __MB_Analytics };
