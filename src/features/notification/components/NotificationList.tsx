"use client";

import Notification from "./Notification";
import { SessionUserProps } from "@/shared/components/layout/Sidebar";
import { useEffect, useState } from "react";
import { getNotificationsByUserIdAction } from "@/features/notification/actions";
import { type NotificationWithRelations } from "@/services/notification.service";
import { UI_TEXT } from "@/shared/constants"; // ⭐️ 상수 임포트

/**
 * @description 알림 데이터 배열을 받아 리스트 형태로 렌더링하는 컴포넌트
 */

export default function NotificationList({ currentUser }: SessionUserProps) {
  // 1. 상태 관리 (데이터 및 로딩 상태)
  const [notifications, setNotifications] = useState<
    NotificationWithRelations[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. 데이터 페칭 로직 (컴포넌트 마운트 시 실행)
  useEffect(() => {
    const fetchNotifications = async () => {
      // 유저 ID가 없으면 로딩 끝내고 리턴
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 서버 액션 호출
        const response = await getNotificationsByUserIdAction();

        if (response.success && response.data) {
          setNotifications(response.data);
        }
      } catch (error) {
        console.error("알림 불러오기 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUser?.id]); // currentUser.id가 바뀔 때마다 재실행

  // 3. 로딩 중일 때 표시할 UI
  if (isLoading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      </div>
    );
  }

  // 4. 데이터가 없을 경우 예외 처리
  if (!notifications || notifications.length === 0) {
    return (
      <div className="mt-10 text-center text-sm text-gray-400">
        {/* [변경] 상수로 대체 */}
        {UI_TEXT.NoNotifications}
      </div>
    );
  }

  // 5. 알림 리스트 렌더링
  return (
    <div className="flex flex-col divide-y divide-gray-200">
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
