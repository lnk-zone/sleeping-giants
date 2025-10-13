export interface Message {
  readonly id: string;
  readonly payload: Record<string, unknown>;
}

export const createMessage = (id: string, payload: Record<string, unknown>): Message => ({
  id,
  payload
});
