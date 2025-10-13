export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

export const serializeEvent = (event: AnalyticsEvent): string => {
  return JSON.stringify(event);
};
