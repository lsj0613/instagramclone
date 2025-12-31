"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  PlusSquare,
  User,
  Settings,
  Heart,
  MessageCircle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Notificationlist from "./Sidebar/Notificationlist";
import { getNotifications } from "@/lib/actions/GetNotificationsByUserId";
import { SerializedNotification } from "@/components/Sidebar/Notification";

const NAV_ITEMS = [
  { name: "홈", href: "/", icon: Home, type: "link" },
  { name: "검색", href: "#", icon: Search, type: "search" },
  { name: "알림", href: "#", icon: Heart, type: "notifications" },
  { name: "메시지", href: "/messages", icon: MessageCircle, type: "link" },
  { name: "만들기", href: "/createpost", icon: PlusSquare, type: "link" },
  { name: "프로필", href: "/profile", icon: User, type: "link" },
  { name: "설정", href: "/settings", icon: Settings, type: "link" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedState, setExpandedState] = useState<
    "none" | "search" | "notifications"
  >("none");

  // 데이터 상태 관리
  const [notifications, setNotifications] = useState<SerializedNotification[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  // 세션에서 가져와야 할 유저 ID (테스트용 하드코딩)
  const currentUserId = "695258da5b4fd08d2ce34e3a";

  // 알림 데이터 페칭 로직
  useEffect(() => {
    const fetchNotifications = async () => {
      if (expandedState === "notifications" && currentUserId) {
        setIsLoading(true);
        try {
          const response = await getNotifications(currentUserId);
          if (response.success && response.data) {
            const parsedData: SerializedNotification[] = JSON.parse(
              response.data
            );
            setNotifications(parsedData);
          }
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();
  }, [expandedState, currentUserId]);

  const toggleExpand = (type: string) => {
    if (type === "search") {
      setExpandedState(expandedState === "search" ? "none" : "search");
    } else if (type === "notifications") {
      setExpandedState(
        expandedState === "notifications" ? "none" : "notifications"
      );
    } else {
      setExpandedState("none");
    }
  };

  return (
    <>
      {/* 1. 외부 클릭 감지용 오버레이 (패널이 열렸을 때만 활성화) */}
      {expandedState !== "none" && (
        <div
          className="fixed inset-0 z-40 bg-black/0"
          onClick={() => setExpandedState("none")}
        />
      )}

      <div className="fixed left-0 top-0 z-50 flex h-full pointer-events-none">
        {/* 2. 메인 네비게이션 바 */}
        <nav
          className={cn(
            "relative z-50 flex h-full w-20 flex-col border-r bg-white p-4 transition-all duration-300 pointer-events-auto",
            expandedState !== "none" ? "shadow-2xl" : ""
          )}
        >
          {/* 로고 */}
          <div className="mb-10 flex justify-center px-2">
            <Link href="/" onClick={() => setExpandedState("none")}>
              <Star size={28} className="fill-current text-black" />
            </Link>
          </div>

          {/* 메뉴 리스트 */}
          <ul className="flex flex-1 flex-col items-center gap-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href && item.type === "link";
              const isExpanded =
                (item.type === "search" && expandedState === "search") ||
                (item.type === "notifications" &&
                  expandedState === "notifications");

              return (
                <li key={item.name} className="w-full">
                  {item.type === "link" ? (
                    <Link
                      href={item.href}
                      onClick={() => setExpandedState("none")}
                      className={cn(
                        "flex justify-center rounded-lg p-3 transition-colors hover:bg-gray-100 text-gray-600",
                        isActive && "text-black"
                      )}
                    >
                      <Icon size={26} strokeWidth={isActive ? 3 : 2} />
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggleExpand(item.type)}
                      className={cn(
                        "flex w-full justify-center rounded-lg p-3 transition-colors hover:bg-gray-100 text-gray-600",
                        isExpanded &&
                          "border border-gray-200 text-black shadow-inner bg-gray-50"
                      )}
                    >
                      <Icon size={26} strokeWidth={isExpanded ? 3 : 2} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 3. 확장 패널 (Search / Notifications) */}
        <aside
          className={cn(
            "relative z-40 h-full bg-white border-r shadow-xl transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto",
            expandedState !== "none" ? "w-80 opacity-100" : "w-0 opacity-0"
          )}
        >
          <div className="flex h-full flex-col p-6 w-80">
            {/* 검색 패널 */}
            {expandedState === "search" && (
              <>
                <h2 className="mb-6 text-xl font-bold font-sans">검색</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="검색"
                    className="w-full rounded-md bg-gray-100 p-2 pl-3 outline-none focus:ring-1 focus:ring-gray-300 text-sm"
                  />
                </div>
                <div className="mt-8 border-t pt-8 text-center text-sm text-gray-400">
                  최근 검색 내역이 없습니다.
                </div>
              </>
            )}

            {/* 알림 패널 */}
            {expandedState === "notifications" && (
              <>
                <h2 className="mb-6 text-xl font-bold font-sans">알림</h2>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex justify-center pt-20">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                    </div>
                  ) : (
                    <Notificationlist notifications={notifications} />
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
