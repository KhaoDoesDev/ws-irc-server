import type { ChatSocket, ClientState } from "./types";

export const clients = new Set<ChatSocket>();

export function initialClientState(): ClientState {
  return {
    joined: false,
    username: null,
    isBridge: false,
  };
}

export function joinedUsers() {
  const users: string[] = [];

  for (const client of clients) {
    if (client.data.joined && client.data.username !== null) {
      users.push(client.data.username);
    }
  }

  return users;
}
