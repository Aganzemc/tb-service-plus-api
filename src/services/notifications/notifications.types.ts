export const ADMIN_NOTIFICATION_PREFIX = "admin_notification::";
export const PUSH_SUBSCRIPTION_PREFIX = "admin_push_subscription::";

export type AdminNotification = {
  id: string;
  kind: "message_created";
  created_at: string;
  message_id: string;
  message_name: string;
  message_email: string | null;
  message_phone: string | null;
  message_preview: string;
  is_read: boolean;
  read_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
};

export type AdminPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type AdminPushSubscriptionRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  admin_id: string | null;
  admin_email: string | null;
  subscription: AdminPushSubscription;
};

export type AdminNotificationsSummary = {
  total: number;
  unread: number;
};
