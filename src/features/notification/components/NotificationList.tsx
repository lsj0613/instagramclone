import Notification from "./Notification";
import { type NotificationWithRelations } from "@/services/notification.service";
import { UI_TEXT } from "@/shared/constants";

interface NotificationListProps {
  notifications: NotificationWithRelations[];
}

export default function NotificationList({
  notifications,
}: NotificationListProps) {
  // 1. 데이터가 없을 경우 (Empty State)
  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-black">
          <svg
            aria-label="알림 없음"
            className="h-7 w-7 text-black"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.956-5.197 7.227-.2.177-.606.516-.982.875a1 1 0 0 1-1.323 0c-.375-.359-.781-.698-.98-.875-2.546-2.271-5.198-4.155-5.198-7.227a4.989 4.989 0 0 1 4.972-5.218c1.55 0 2.8.706 3.998 1.936a5.003 5.003 0 0 1 4-1.936Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-black">알림이 없습니다.</p>
        <p className="text-xs text-gray-500 mt-1 break-keep">
          {UI_TEXT.NoNotifications}
        </p>
      </div>
    );
  }

  // 2. 리스트 렌더링
  return (
    <div className="flex flex-col pb-4">
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
