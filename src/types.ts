export type ClientState = {
  joined: boolean;
  username: string | null;
  isBridge: boolean;
};

export type ErrorCode =
  | "AUTH_FAILED"
  | "INVALID_JSON"
  | "INVALID_TYPE"
  | "MISSING_FIELD"
  | "INVALID_FIELD"
  | "NOT_JOINED"
  | "ALREADY_JOINED"
  | "BRIDGE_ONLY"
  | "MOD_ONLY";

export type ChatSocket = Bun.ServerWebSocket<ClientState>;
