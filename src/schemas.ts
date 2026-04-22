import { z } from "zod";
import type { ChatSocket } from "./types";
import { isRecord, sendError } from "./utils";

const nonEmptyString = z.string().trim().min(1);

const authMessageSchema = z.object({
  type: z.literal("auth"),
  token: z.string(),
});

const joinMessageSchema = z.object({
  type: z.literal("join"),
  username: nonEmptyString,
});

const messageSchema = z.object({
  type: z.literal("message"),
  content: z.string(),
  username: nonEmptyString.optional(),
});

const listMessageSchema = z.object({
  type: z.literal("list"),
});

const clientMessageSchema = z.discriminatedUnion("type", [
  authMessageSchema,
  joinMessageSchema,
  messageSchema,
  listMessageSchema,
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export function parseClientMessage(ws: ChatSocket, data: unknown) {
  if (!isRecord(data)) {
    sendError(ws, "INVALID_TYPE", "Message must be a JSON object");
    return null;
  }

  if (!("type" in data)) {
    sendError(ws, "MISSING_FIELD", "Missing field: type");
    return null;
  }

  if (typeof data.type !== "string") {
    sendError(ws, "INVALID_FIELD", "Invalid field: type");
    return null;
  }

  const result = clientMessageSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const missingField = result.error.issues.find(
    (issue) => issue.code === "invalid_type" && issue.input === undefined,
  );

  if (missingField !== undefined) {
    sendError(ws, "MISSING_FIELD", `Missing field: ${missingField.path.join(".")}`);
    return null;
  }

  if (result.error.issues.some((issue) => issue.path[0] === "type")) {
    sendError(ws, "INVALID_TYPE", "Invalid message type");
    return null;
  }

  const invalidField = result.error.issues[0]?.path.join(".") || "message";
  sendError(ws, "INVALID_FIELD", `Invalid field: ${invalidField}`);
  return null;
}
