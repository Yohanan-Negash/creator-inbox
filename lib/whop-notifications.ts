import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

type SendExperienceNotificationArgs = {
  event: string;
  experienceId: string;
  userIds?: string[];
  title: string;
  content: string;
  restPath?: string;
  iconUserId?: string;
};

type SubmissionCreatedAdminArgs = {
  experienceId: string;
  creatorUserId: string;
  requesterUserName: string;
  requestTypeTitle: string;
};

type SubmissionAnsweredUserArgs = {
  experienceId: string;
  requesterUserId: string;
  creatorUserId: string;
  requestTypeTitle: string;
};

type SubmissionRefundedUserArgs = {
  experienceId: string;
  requesterUserId: string;
  creatorUserId: string;
  requestTypeTitle: string;
};

function sanitizeUserIds(userIds: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of userIds) {
    const userId = raw.trim();
    if (!userId || seen.has(userId)) {
      continue;
    }

    seen.add(userId);
    output.push(userId);
  }

  return output;
}

function getDefaultRestPath(experienceId: string) {
  return `/experiences/${encodeURIComponent(experienceId)}`;
}

function getWhopNotificationClient() {
  return getWhopSdk() as {
    notifications?: {
      create?: (input: {
        experience_id?: string;
        user_ids?: string[];
        title: string;
        content: string;
        rest_path?: string;
        icon_user_id?: string;
      }) => Promise<unknown>;
    };
  };
}

function parseNotificationQueued(response: unknown) {
  if (!response || typeof response !== "object") {
    return false;
  }

  if (!("success" in response)) {
    return false;
  }

  return (response as { success?: boolean }).success === true;
}

export async function sendExperienceNotification(args: SendExperienceNotificationArgs) {
  const recipients = sanitizeUserIds(args.userIds ?? []);
  if (recipients.length === 0) {
    logger.error("Whop experience notification skipped due to empty recipients", {
      event: "whop.notification.skipped_empty_recipients",
      notificationEvent: args.event,
      experienceId: args.experienceId,
    });
    return false;
  }

  const whopSdk = getWhopNotificationClient();

  if (!whopSdk.notifications?.create) {
    logger.error("Whop notifications client is unavailable", {
      event: "whop.notification.client_unavailable",
      notificationEvent: args.event,
      experienceId: args.experienceId,
      recipientCount: recipients.length,
    });
    return false;
  }

  try {
    const response = await whopSdk.notifications.create({
      experience_id: args.experienceId,
      user_ids: recipients.length > 0 ? recipients : undefined,
      title: args.title,
      content: args.content,
      rest_path: args.restPath ?? getDefaultRestPath(args.experienceId),
      icon_user_id: args.iconUserId,
    });

    if (!parseNotificationQueued(response)) {
      logger.error("Whop notification was not queued", {
        event: "whop.notification.not_queued",
        notificationEvent: args.event,
        experienceId: args.experienceId,
        recipientCount: recipients.length,
      });
      return false;
    }

    logger.info("Whop notification queued", {
      event: "whop.notification.queued",
      notificationEvent: args.event,
      experienceId: args.experienceId,
      recipientCount: recipients.length,
      recipientUserIds: recipients,
    });

    return true;
  } catch (error) {
    logger.error("Whop notification send failed", {
      event: "whop.notification.failed",
      notificationEvent: args.event,
      experienceId: args.experienceId,
      recipientCount: recipients.length,
      recipientUserIds: recipients,
      errorMessage: getSafeErrorMessage(error),
    });
    return false;
  }
}

export async function notifyAdminSubmissionCreated(args: SubmissionCreatedAdminArgs) {
  const requesterName = args.requesterUserName.trim() || "A member";
  const requestType = args.requestTypeTitle.trim() || "a request";
  const creatorRecipients = sanitizeUserIds([args.creatorUserId]);

  logger.info("Dispatching admin submission notification", {
    event: "whop.notification.dispatch",
    notificationEvent: "submission.created.admin",
    experienceId: args.experienceId,
    creatorRecipientCount: creatorRecipients.length,
    creatorRecipientUserIds: creatorRecipients,
  });

  return sendExperienceNotification({
    event: "submission.created.admin",
    experienceId: args.experienceId,
    userIds: creatorRecipients,
    title: "New request",
    content: `${requesterName} submitted ${requestType}.`,
    restPath: `${getDefaultRestPath(args.experienceId)}/admin`,
    iconUserId: args.creatorUserId,
  });
}

export async function notifyUserSubmissionAnswered(args: SubmissionAnsweredUserArgs) {
  const requestType = args.requestTypeTitle.trim() || "your request";

  return sendExperienceNotification({
    event: "submission.answered.user",
    experienceId: args.experienceId,
    userIds: [args.requesterUserId],
    title: "Your request was answered",
    content: `Your ${requestType} request has a response.`,
    iconUserId: args.creatorUserId,
  });
}

export async function notifyUserSubmissionRefunded(args: SubmissionRefundedUserArgs) {
  const requestType = args.requestTypeTitle.trim() || "request";

  return sendExperienceNotification({
    event: "submission.refunded.user",
    experienceId: args.experienceId,
    userIds: [args.requesterUserId],
    title: "Your request was refunded",
    content: `Refund issued for your ${requestType} request.`,
    iconUserId: args.creatorUserId,
  });
}
