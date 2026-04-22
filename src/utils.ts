import { clients, joinedUsers } from "./state";
import type { ChatSocket, ErrorCode } from "./types";

export function send(ws: ChatSocket, payload: unknown) {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    clients.delete(ws);
  }
}

export function sendError(ws: ChatSocket, code: ErrorCode, message: string) {
  send(ws, { type: "error", code, message });
}

export function broadcast(payload: unknown, except?: ChatSocket) {
  for (const client of clients) {
    if (client !== except) {
      send(client, payload);
    }
  }
}

export function sendUserList(ws: ChatSocket) {
  send(ws, { type: "list", users: joinedUsers() });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
