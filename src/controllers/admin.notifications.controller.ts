import type { FastifyReply, FastifyRequest } from "fastify";
import { resolvePagination } from "../services/common/pagination.js";
import {
  clearAdminNotifications,
  deleteAdminNotification,
  deleteAdminPushSubscription,
  getAdminPushClientConfig,
  listAdminNotifications,
  markAllAdminNotificationsRead,
  saveAdminPushSubscription,
  setAdminNotificationReadState,
} from "../services/notifications/notifications.service.js";
import {
  AdminPushSubscriptionDeleteSchema,
  AdminPushSubscriptionSchema,
} from "../services/notifications/notifications.schemas.js";

type NotificationListQuery = {
  page?: string;
  pageSize?: string;
  all?: string;
};

export const AdminNotificationsController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const query = (req.query as NotificationListQuery | undefined) ?? {};
    const pagination = resolvePagination(query, { defaultPageSize: 6, maxPageSize: 50 });
    const notifications = await listAdminNotifications(pagination);
    return reply.send(notifications);
  },

  async markRead(req: FastifyRequest, reply: FastifyReply) {
    const id = (req.params as { id: string }).id;
    const notification = await setAdminNotificationReadState(id, true);

    if (!notification) {
      return reply.code(404).send({ message: "Notification not found" });
    }

    return reply.send({ notification });
  },

  async markAllRead(_: FastifyRequest, reply: FastifyReply) {
    const updated = await markAllAdminNotificationsRead();
    return reply.send({ updated });
  },

  async remove(req: FastifyRequest, reply: FastifyReply) {
    const id = (req.params as { id: string }).id;
    const notification = await deleteAdminNotification(id);

    if (!notification) {
      return reply.code(404).send({ message: "Notification not found" });
    }

    return reply.send({ deleted: true });
  },

  async clearAll(_: FastifyRequest, reply: FastifyReply) {
    const deleted = await clearAdminNotifications();
    return reply.send({ deleted });
  },

  async pushConfig(_: FastifyRequest, reply: FastifyReply) {
    return reply.send(getAdminPushClientConfig());
  },

  async subscribe(req: FastifyRequest, reply: FastifyReply) {
    const parsed = AdminPushSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const record = await saveAdminPushSubscription(parsed.data, req.admin);
    return reply.code(201).send({
      subscribed: true,
      subscriptionId: record.id,
    });
  },

  async unsubscribe(req: FastifyRequest, reply: FastifyReply) {
    const parsed = AdminPushSubscriptionDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    await deleteAdminPushSubscription(parsed.data.endpoint);
    return reply.send({ deleted: true });
  },
};
