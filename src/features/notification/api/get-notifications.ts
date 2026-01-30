import { PaginatedNotifications } from "../types";

/**
 * 클라이언트에서 호출할 알림 페칭 함수 (TanStack Query용)
 */
export async function fetchNotifications({
  pageParam, // cursor ID
}: {
  pageParam?: string;
}): Promise<PaginatedNotifications> {
  const queryParams = new URLSearchParams({
    limit: "20",
  });

  if (pageParam) {
    queryParams.append("cursor", pageParam);
  }

  const response = await fetch(`/api/notifications?${queryParams.toString()}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch notifications");
  }

  return response.json();
}
