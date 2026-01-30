import { notifications } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

export type NotificationEntity = InferSelectModel<typeof notifications>;

export interface NotificationWithRelations extends NotificationEntity {
  actor: {
    id: string;
    username: string;
    profileImage: string | null;
  };
}

export interface PaginatedNotifications {
  items: NotificationWithRelations[];
  nextCursor?: string | null;
}
