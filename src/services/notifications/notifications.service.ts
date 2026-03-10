import { createHash, randomUUID } from "node:crypto";
import webpush from "web-push";
import { env } from "../../configs/env.js";
import { supabase } from "../../configs/supabase.js";
import { buildPaginationMeta, type PaginationRequest } from "../common/pagination.js";
import type { AuthedAdmin } from "../auth/auth.middleware.js";
import {
  ADMIN_NOTIFICATION_PREFIX,
  PUSH_SUBSCRIPTION_PREFIX,
  type AdminNotification,
  type AdminNotificationsSummary,
  type AdminPushSubscription,
  type AdminPushSubscriptionRecord,
} from "./notifications.types.js";

type SettingsRow = {
  key: string;
  value: string | null;
};

type MessageNotificationInput = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  created_at: string;
};

let vapidConfigured = false;

function getNotificationPreview(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= 140) return compact;
  return `${compact.slice(0, 137)}...`;
}

function isAdminNotification(value: unknown): value is AdminNotification {
  if (!value || typeof value !== "object") return false;

  const maybe = value as Partial<AdminNotification>;

  return (
    typeof maybe.id === "string" &&
    maybe.kind === "message_created" &&
    typeof maybe.created_at === "string" &&
    typeof maybe.message_id === "string" &&
    typeof maybe.message_name === "string" &&
    typeof maybe.message_preview === "string" &&
    typeof maybe.is_read === "boolean" &&
    typeof maybe.is_deleted === "boolean"
  );
}

function isAdminPushSubscriptionRecord(value: unknown): value is AdminPushSubscriptionRecord {
  if (!value || typeof value !== "object") return false;

  const maybe = value as Partial<AdminPushSubscriptionRecord>;

  return (
    typeof maybe.id === "string" &&
    typeof maybe.created_at === "string" &&
    typeof maybe.updated_at === "string" &&
    !!maybe.subscription &&
    typeof maybe.subscription.endpoint === "string" &&
    !!maybe.subscription.keys &&
    typeof maybe.subscription.keys.auth === "string" &&
    typeof maybe.subscription.keys.p256dh === "string"
  );
}

function parseSettingsJsonRows<T>(
  rows: SettingsRow[] | null | undefined,
  guard: (value: unknown) => value is T,
) {
  return (rows ?? [])
    .map((row) => {
      if (!row.value) return null;

      try {
        const parsed = JSON.parse(row.value) as unknown;
        return guard(parsed) ? parsed : null;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is T => entry !== null);
}

function getActiveNotifications(notifications: AdminNotification[]) {
  return notifications
    .filter((notification) => !notification.is_deleted)
    .sort((first, second) => second.created_at.localeCompare(first.created_at));
}

function buildNotificationsSummary(notifications: AdminNotification[]): AdminNotificationsSummary {
  return {
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.is_read).length,
  };
}

function paginateItems<T>(items: T[], pagination: PaginationRequest) {
  if (pagination.all) {
    return {
      items,
      ...buildPaginationMeta(items.length, 1, Math.max(1, items.length || 1)),
    };
  }

  return {
    items: items.slice(pagination.from, pagination.to + 1),
    ...buildPaginationMeta(items.length, pagination.page, pagination.pageSize),
  };
}

function buildNotificationKey(createdAt: string) {
  return `${ADMIN_NOTIFICATION_PREFIX}${createdAt}::${randomUUID()}`;
}

function buildSubscriptionKey(endpoint: string) {
  const digest = createHash("sha256").update(endpoint).digest("hex");
  return `${PUSH_SUBSCRIPTION_PREFIX}${digest}`;
}

function serializeSettingsEntry(key: string, value: unknown) {
  return {
    key,
    value: JSON.stringify(value),
  };
}

async function listNotificationRows() {
  const { data, error } = await supabase
    .from("settings")
    .select("key,value")
    .like("key", `${ADMIN_NOTIFICATION_PREFIX}%`)
    .order("key", { ascending: false });

  if (error) throw error;

  return parseSettingsJsonRows(data, isAdminNotification);
}

async function getNotificationById(id: string) {
  const { data, error } = await supabase.from("settings").select("key,value").eq("key", id).maybeSingle();

  if (error) throw error;
  if (!data?.value) return null;

  try {
    const parsed = JSON.parse(data.value) as unknown;
    return isAdminNotification(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function upsertNotifications(notifications: AdminNotification[]) {
  if (notifications.length === 0) return;

  const { error } = await supabase
    .from("settings")
    .upsert(notifications.map((notification) => serializeSettingsEntry(notification.id, notification)), {
      onConflict: "key",
    });

  if (error) throw error;
}

async function listSubscriptionRows() {
  const { data, error } = await supabase
    .from("settings")
    .select("key,value")
    .like("key", `${PUSH_SUBSCRIPTION_PREFIX}%`);

  if (error) throw error;

  return parseSettingsJsonRows(data, isAdminPushSubscriptionRecord);
}

function ensureWebPushConfigured() {
  if (!env.WEB_PUSH_PUBLIC_KEY || !env.WEB_PUSH_PRIVATE_KEY) {
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(env.WEB_PUSH_SUBJECT, env.WEB_PUSH_PUBLIC_KEY, env.WEB_PUSH_PRIVATE_KEY);
    vapidConfigured = true;
  }

  return true;
}

export function getAdminPushClientConfig() {
  const enabled = ensureWebPushConfigured();

  return {
    enabled,
    publicKey: enabled ? env.WEB_PUSH_PUBLIC_KEY ?? null : null,
  };
}

export async function createAdminNotificationFromMessage(message: MessageNotificationInput) {
  const notification: AdminNotification = {
    id: buildNotificationKey(message.created_at),
    kind: "message_created",
    created_at: message.created_at,
    message_id: message.id,
    message_name: message.name,
    message_email: message.email,
    message_phone: message.phone,
    message_preview: getNotificationPreview(message.message),
    is_read: false,
    read_at: null,
    is_deleted: false,
    deleted_at: null,
  };

  await upsertNotifications([notification]);
  return notification;
}

export async function listAdminNotifications(pagination: PaginationRequest) {
  const notifications = getActiveNotifications(await listNotificationRows());
  const summary = buildNotificationsSummary(notifications);
  const paginated = paginateItems(notifications, pagination);

  return {
    notifications: paginated.items,
    summary,
    page: paginated.page,
    pageSize: paginated.pageSize,
    total: paginated.total,
    totalPages: paginated.totalPages,
  };
}

export async function setAdminNotificationReadState(id: string, isRead: boolean) {
  const notification = await getNotificationById(id);
  if (!notification || notification.is_deleted) {
    return null;
  }

  const updated: AdminNotification = {
    ...notification,
    is_read: isRead,
    read_at: isRead ? new Date().toISOString() : null,
  };

  await upsertNotifications([updated]);
  await supabase.from("messages").update({ is_read: isRead }).eq("id", updated.message_id);

  return updated;
}

export async function setNotificationsReadStateByMessageId(messageId: string, isRead: boolean) {
  const notifications = (await listNotificationRows()).filter(
    (notification) => notification.message_id === messageId && !notification.is_deleted,
  );

  if (notifications.length === 0) {
    return 0;
  }

  const changedAt = isRead ? new Date().toISOString() : null;
  const updatedNotifications = notifications.map((notification) => ({
    ...notification,
    is_read: isRead,
    read_at: changedAt,
  }));

  await upsertNotifications(updatedNotifications);
  return updatedNotifications.length;
}

export async function markAllAdminNotificationsRead() {
  const notifications = getActiveNotifications(await listNotificationRows()).filter((notification) => !notification.is_read);

  if (notifications.length === 0) {
    return 0;
  }

  const changedAt = new Date().toISOString();
  const updatedNotifications = notifications.map((notification) => ({
    ...notification,
    is_read: true,
    read_at: changedAt,
  }));

  await upsertNotifications(updatedNotifications);

  const messageIds = updatedNotifications.map((notification) => notification.message_id);
  if (messageIds.length > 0) {
    await supabase.from("messages").update({ is_read: true }).in("id", messageIds);
  }

  return updatedNotifications.length;
}

export async function deleteAdminNotification(id: string) {
  const notification = await getNotificationById(id);
  if (!notification || notification.is_deleted) {
    return null;
  }

  const updated: AdminNotification = {
    ...notification,
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  };

  await upsertNotifications([updated]);
  return updated;
}

export async function deleteNotificationsByMessageId(messageId: string) {
  const notifications = (await listNotificationRows()).filter(
    (notification) => notification.message_id === messageId && !notification.is_deleted,
  );

  if (notifications.length === 0) {
    return 0;
  }

  const deletedAt = new Date().toISOString();
  const updatedNotifications = notifications.map((notification) => ({
    ...notification,
    is_deleted: true,
    deleted_at: deletedAt,
  }));

  await upsertNotifications(updatedNotifications);
  return updatedNotifications.length;
}

export async function clearAdminNotifications() {
  const notifications = getActiveNotifications(await listNotificationRows());

  if (notifications.length === 0) {
    return 0;
  }

  const deletedAt = new Date().toISOString();
  const updatedNotifications = notifications.map((notification) => ({
    ...notification,
    is_deleted: true,
    deleted_at: deletedAt,
  }));

  await upsertNotifications(updatedNotifications);
  return updatedNotifications.length;
}

export async function saveAdminPushSubscription(
  subscription: AdminPushSubscription,
  actor?: Pick<AuthedAdmin, "adminId" | "email">,
) {
  const key = buildSubscriptionKey(subscription.endpoint);
  const now = new Date().toISOString();
  const existing = (await listSubscriptionRows()).find((entry) => entry.id === key);

  const record: AdminPushSubscriptionRecord = {
    id: key,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    admin_id: actor?.adminId ?? existing?.admin_id ?? null,
    admin_email: actor?.email ?? existing?.admin_email ?? null,
    subscription,
  };

  const { error } = await supabase.from("settings").upsert([serializeSettingsEntry(record.id, record)], {
    onConflict: "key",
  });

  if (error) throw error;

  return record;
}

export async function deleteAdminPushSubscription(endpoint: string) {
  const { error } = await supabase.from("settings").delete().eq("key", buildSubscriptionKey(endpoint));

  if (error) throw error;
}

async function deletePushSubscriptionsByEndpoints(endpoints: string[]) {
  if (endpoints.length === 0) return;

  const keys = [...new Set(endpoints.map((endpoint) => buildSubscriptionKey(endpoint)))];
  const { error } = await supabase.from("settings").delete().in("key", keys);

  if (error) throw error;
}

export async function sendAdminNotificationPush(notification: AdminNotification) {
  if (!ensureWebPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await listSubscriptionRows();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: "New contact message",
    body: `${notification.message_name}: ${notification.message_preview}`,
    tag: notification.id,
    url: "/page/admin/messages",
    notificationId: notification.id,
    messageId: notification.message_id,
  });

  const expiredEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (record) => {
      try {
        await webpush.sendNotification(record.subscription, payload);
        sent += 1;
      } catch (error) {
        failed += 1;

        const statusCode =
          typeof error === "object" && error && "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(record.subscription.endpoint);
        }
      }
    }),
  );

  await deletePushSubscriptionsByEndpoints(expiredEndpoints);

  return {
    sent,
    failed,
  };
}
