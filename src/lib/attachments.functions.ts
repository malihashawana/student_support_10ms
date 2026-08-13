import { createServerFn } from "@tanstack/react-start";

import { friendly, readSession } from "./session.server";
import { db } from "./support.server";
import { ALLOWED_FILE_TYPES, MAX_FILE_MB } from "./support-constants";

export const uploadAttachment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      ticketId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      base64: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const session = await readSession();
    if (session.role !== "student" || !session.studentId) {
      throw friendly("Your session has expired. Please sign in again.");
    }
    const { data: ticket } = await db
      .from("tickets")
      .select("id")
      .eq("id", data.ticketId)
      .eq("student_id", session.studentId)
      .maybeSingle();
    if (!ticket) throw friendly("This ticket was not found in your account.");

    if (!ALLOWED_FILE_TYPES.includes(data.fileType)) {
      throw friendly("Upload failed. This file type is not supported.");
    }
    if (data.fileSize > MAX_FILE_MB * 1024 * 1024) {
      throw friendly(`Upload failed. Files must be smaller than ${MAX_FILE_MB} MB.`);
    }

    const binary = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${data.ticketId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await db.storage
      .from("ticket-attachments")
      .upload(path, binary, { contentType: data.fileType, upsert: false });
    if (uploadError) throw friendly("Upload failed. Please check the file type and size.");

    const { data: row, error } = await db
      .from("attachments")
      .insert({
        ticket_id: data.ticketId,
        file_name: data.fileName.slice(0, 200),
        file_type: data.fileType,
        file_size: data.fileSize,
        storage_path: path,
      })
      .select("id, file_name, file_type, file_size, created_at")
      .single();
    if (error) throw friendly("Upload failed. Please try again.");
    return row;
  });

export const addLinkAttachment = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; url: string }) => input)
  .handler(async ({ data }) => {
    const session = await readSession();
    if (session.role !== "student" || !session.studentId) {
      throw friendly("Your session has expired. Please sign in again.");
    }
    const url = (data.url ?? "").trim();
    if (!/^https?:\/\//i.test(url) || url.length > 500) {
      throw friendly("Please provide a valid link starting with http:// or https://");
    }
    const { data: ticket } = await db
      .from("tickets")
      .select("id")
      .eq("id", data.ticketId)
      .eq("student_id", session.studentId)
      .maybeSingle();
    if (!ticket) throw friendly("This ticket was not found in your account.");
    await db
      .from("attachments")
      .insert({ ticket_id: data.ticketId, file_name: url, file_type: "link", external_url: url });
    return { ok: true };
  });

export const getAttachmentUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const session = await readSession();
    const { data: attachment } = await db
      .from("attachments")
      .select("id, storage_path, external_url, ticket_id, file_type")
      .eq("id", data.id)
      .maybeSingle();
    if (!attachment) throw friendly("This attachment could not be found.");

    if (session.role === "student") {
      const { data: ticket } = await db
        .from("tickets")
        .select("id")
        .eq("id", attachment.ticket_id)
        .eq("student_id", session.studentId ?? "")
        .maybeSingle();
      if (!ticket) throw friendly("You don't have permission to open this attachment.");
    } else if (session.role !== "staff") {
      throw friendly("Your session has expired. Please sign in again.");
    }

    if (attachment.external_url) return { url: attachment.external_url };
    if (!attachment.storage_path) throw friendly("This attachment is unavailable.");
    const { data: signed, error } = await db.storage
      .from("ticket-attachments")
      .createSignedUrl(attachment.storage_path, 60 * 30);
    if (error || !signed) throw friendly("This attachment could not be opened right now.");
    return { url: signed.signedUrl };
  });
