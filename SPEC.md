# "RTC" Chat Integration Spec

## Env

PORT for the server's port
BRIDGE_TOKEN to auth the Discord bot with the server as the "bridge bot"

All messages are JSON with a `type` field.

## Roles

### Mod / Client (Minecraft side)

joins with a username, sends messages without a username field.

### Discord Bot / Bridge Client

auths using `BRIDGE_TOKEN`, sends messages with a Discord display name, and don't send join message.

### Unauthed client

A socket that has not joined and has not authed as a bridge or anything can stay connected, get messages, and request the current user list but cannot send chat messages.

## Socket State

Each socket inits with:

```json
{
  "joined": false,
  "username": null,
  "isBridge": false
}
```

## Client To Server Messages

### `auth`

Auth a Discord bridge client.

```json
{
  "type": "auth",
  "token": "bridge-token" // this is in .env
}
```

Rules:

- Only bridge clients should send this.
- If `token` does not match `BRIDGE_TOKEN`, the server sends `AUTH_FAILED` and closes the socket.
- A socket that has already joined as a mod client cannot become a bridge cause why?

### `join`

Join as a client.

```json
{
  "type": "join",
  "username": "Steve"
}
```

Rules:

- Bridge clients cannot join.
- A socket can join only once.
- After a successful join, the server sends the joined client a `list` response.
- Other clients receive a `join` event.

### `message` From regular client

Send a chat message.

```json
{
  "type": "message",
  "content": "Hello"
}
```

Rules:

- Socket must already be joined.
- `content` is required.
- `username` must not be included. (for bridge clients)
- The server uses the username stored during `join`.
- Broadcast'ed message has `discord: false`.

### `message` From Bridge

Send a Discord chat message into chat.

```json
{
  "type": "message",
  "username": "DiscordUser",
  "content": "Hello from Discord"
}
```

Rules:

- Socket must already be authenticated with `auth`.
- Socket must not be joined.
- `username` is required.
- `content` is required.
- Broadcast'ed message has `discord: true`.

### `list`

Request currently joined users.

```json
{
  "type": "list"
}
```

Rules:

- Any connected socket can request `list`.
- Unauthed clients/Not joined sockets are never included.

## Server To Client Messages

### `join`

Sent to all other clients when another client joins.

```json
{
  "type": "join",
  "username": "Steve"
}
```

### `leave`

Sent to all remaining clients when a joined client disconnects.
This is now sent by the server, the client doesn't have to send this before ending the client.

```json
{
  "type": "leave",
  "username": "Steve"
}
```

### `message`

Broadcast chat message.

```json
{
  "type": "message",
  "username": "Steve",
  "content": "Hello",
  "discord": false
}
```

Fields:

- `username`: Minecraft username for client messages, Discord display name for bridge messages.
- `content`: Message body.
- `discord`: `false` for client messages, `true` for Discord bridge messages.

### `list`

Response to `list`, and also sent after `join`.

```json
{
  "type": "list",
  "users": ["Steve", "Alex"]
}
```

### `error`

```json
{
  "type": "error",
  "code": "NOT_JOINED",
  "message": "Client has not joined"
}
```

## Expected Flows

### Clients

1. Open WebSocket connection.
2. Send `join`.
3. Receive `list`.
4. Send `message` without `username`.
5. Listen for `join`, `leave`, `message`, `list`, and `error`.

Example:

```json
{ "type": "join", "username": "Steve" }
```

```json
{ "type": "message", "content": "Hello everyone" }
```

### Discord Bridge Client

1. Open WebSocket connection.
2. Send `auth` with `BRIDGE_TOKEN`.
3. Send Discord messages using bridge `message` shape.
4. Listen for mod and bridge broadcasts.
5. Optionally request `list`.

Example:

```json
{ "type": "auth", "token": "shared-token" }
```

```json
{ "type": "message", "username": "DiscordUser", "content": "Hello from Discord" }
```