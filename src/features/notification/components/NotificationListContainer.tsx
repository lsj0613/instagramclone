"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import NotificationList from "./NotificationList";
import NotificationListSkeleton from "./NotificationListSkeleton";
import { CurrentUserData } from "@/services/user.service";
import { ERROR_MESSAGES } from "@/shared/constants";
import { fetchNotifications } from "../api/get-notifications";

export default function NotificationListContainer({
  currentUser,
}: {
  currentUser?: CurrentUserData | null;
}) {
  const { ref, inView } = useInView();

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["notifications", currentUser?.id],
      queryFn: fetchNotifications,
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!currentUser,
      staleTime: 0,
      gcTime: 0,
    });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const renderContent = () => {
    // 인증 안됨
    if (!currentUser) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          {ERROR_MESSAGES.AUTH_REQUIRED}
        </div>
      );
    }

    // 로딩 중
    if (isLoading) {
      return <NotificationListSkeleton />;
    }

    // 데이터 있음
    const allNotifications = data?.pages.flatMap((page) => page.items) || [];

    return (
      <div className="flex flex-col min-h-full">
        <NotificationList notifications={allNotifications} />

        {/* 무한 스크롤 트리거 */}
        <div
          ref={ref}
          className="flex h-10 w-full shrink-0 items-center justify-center py-4"
        >
          {isFetchingNextPage && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* 제목 영역: 320px 패널에 맞게 여백 최적화 */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h2 className="text-xl font-bold font-sans">알림</h2>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {renderContent()}
      </div>
    </div>
  );
}
