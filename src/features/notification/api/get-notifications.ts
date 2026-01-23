import { NotificationWithRelations } from "@/services/notification.service";

interface FetchNotificationsResponse {
  items: NotificationWithRelations[];
  nextCursor?: string | null;
}

// ⭐️ pageParam의 타입은 API에서 내려주는 nextCursor 타입과 같아야 함 (string)
export async function fetchNotifications({
  pageParam,
}: {
  pageParam?: string;
}) {
  const queryParams = new URLSearchParams({
    limit: "20",
  });

  // 커서가 있으면 파라미터에 추가 (첫 페이지일 땐 없음)
  if (pageParam) {
    queryParams.append("cursor", pageParam);
  }

  const response = await fetch(`/api/notifications?${queryParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json() as Promise<FetchNotificationsResponse>;
}
