import { parseClientMessage, type ClientMessage } from "./schemas";
import type { ChatSocket } from "./types";
import { broadcast, sendError, sendUserList } from "./utils";

const BRIDGE_TOKEN = Bun.env.BRIDGE_TOKEN ?? process.env.BRIDGE_TOKEN ?? "";

function handleAuth(ws: ChatSocket, data: Extract<ClientMessage, { type: "auth" }>) {
  if (ws.data.joined) {
    sendError(ws, "MOD_ONLY", "Joined clients cannot auth as bridge");
    return;
  }

  if (data.token !== BRIDGE_TOKEN) {
    sendError(ws, "AUTH_FAILED", "Auth failed");
    ws.close();
    return;
  }

  ws.data.isBridge = true;
}

function handleJoin(ws: ChatSocket, data: Extract<ClientMessage, { type: "join" }>) {
  if (ws.data.isBridge) {
    sendError(ws, "BRIDGE_ONLY", "Bridge clients cannot join");
    return;
  }

  if (ws.data.joined) {
    sendError(ws, "ALREADY_JOINED", "Client has already joined");
    return;
  }

  ws.data.joined = true;
  ws.data.username = data.username;

  broadcast({ type: "join", username: data.username }, ws);
  sendUserList(ws);
}

function handleMessage(ws: ChatSocket, data: Extract<ClientMessage, { type: "message" }>) {
  if (ws.data.isBridge) {
    if (ws.data.joined) {
      sendError(ws, "BRIDGE_ONLY", "Bridge clients cannot be joined users");
      return;
    }

    if (data.username === undefined) {
      sendError(ws, "MISSING_FIELD", "Missing field: username");
      return;
    }

    broadcast({ type: "message", username: data.username, content: data.content, discord: true });
    return;
  }

  if (!ws.data.joined || ws.data.username === null) {
    sendError(ws, "NOT_JOINED", "Client has not joined");
    return;
  }

  if ("username" in data) {
    sendError(ws, "INVALID_FIELD", "Joined clients must not send username");
    return;
  }

  broadcast({
    type: "message",
    username: ws.data.username,
    content: data.content,
    discord: false,
  });
}

export function handleIncoming(ws: ChatSocket, raw: string | Buffer) {
  let data: unknown;

  try {
    data = JSON.parse(typeof raw === "string" ? raw : raw.toString());
  } catch {
    sendError(ws, "INVALID_JSON", "Invalid JSON");
    return;
  }

  const message = parseClientMessage(ws, data);
  if (message === null) {
    return;
  }

  switch (message.type) {
    case "auth":
      handleAuth(ws, message);
      break;
    case "join":
      handleJoin(ws, message);
      break;
    case "message":
      handleMessage(ws, message);
      break;
    case "list":
      sendUserList(ws);
      break;
  }
}
