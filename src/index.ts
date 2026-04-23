import { handleIncoming } from "./handlers";
import { clients, initialClientState } from "./state";
import type { ClientState } from "./types";
import { broadcast } from "./utils";

const server = Bun.serve<ClientState>({
  fetch(request, server) {
    const upgraded = server.upgrade(request, {
      data: initialClientState(),
    });

    if (upgraded) {
      return undefined;
    }

    return new Response("WebSocket chat server");
  },
  websocket: {
    open(ws) {
      clients.add(ws);
    },
    message(ws, message) {
      handleIncoming(ws, message);
    },
    close(ws) {
      const username = ws.data.joined ? ws.data.username : null;
      clients.delete(ws);

      if (username !== null) {
        broadcast({ type: "leave", username });
      }
    },
  },
});

console.log(`Server running at ${server.url}`);