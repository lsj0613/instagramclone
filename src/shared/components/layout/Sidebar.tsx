"use client";

import { useState, useActionState, startTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
  Home,
  Search,
  PlusSquare,
  User as UserIcon,
  Settings,
  Heart,
  MessageCircle,
  Star,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/shared/utils/utils";
import Notificationlist from "../../../features/notification/components/NotificationList";
import { searchUsers, SearchUser } from "@/features/user/actions/search-users";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  id?: string;
}

export interface SessionUserProps {
  currentUser?: SessionUser | null;
}

const initialState = {
  success: false,
  data: [] as SearchUser[],
  error: undefined as string | undefined,
};

const BASE_NAV_ITEMS = [
  { name: "홈", href: "/", icon: Home, type: "link" },
  { name: "검색", href: "#", icon: Search, type: "search" },
  { name: "알림", href: "#", icon: Heart, type: "notifications" },
  { name: "메시지", href: "/messages", icon: MessageCircle, type: "link" },
  { name: "만들기", href: "/createpost", icon: PlusSquare, type: "link" },
  { name: "설정", href: "/settings", icon: Settings, type: "link" },
];

export default function Sidebar({ currentUser }: SessionUserProps) {
  const pathname = usePathname();
  const [expandedState, setExpandedState] = useState<
    "none" | "search" | "notifications"
  >("none");

  // [2번 주자] isPending: 서버 요청이 시작된 후 ~ 응답 올 때까지 담당
  const [state, dispatch, isPending] = useActionState(searchUsers, initialState);

  const [searchQuery, setSearchQuery] = useState("");

  // [1번 주자] isDebouncing: 타자 입력 직후 ~ 디바운스 끝날 때까지 담당 (로컬 상태)
  const [isDebouncing, setIsDebouncing] = useState(false);

  // 통합 로딩 상태: 1번 주자가 뛰고 있거나, 2번 주자가 뛰고 있으면 '로딩 중'
  const isLoading = isDebouncing || isPending;

  // 디바운스 콜백
  const debouncedSearch = useDebouncedCallback((value: string) => {
    // [바통 터치 구간]
    // 0.5초가 지나서 이 함수가 실행되는 순간,
    // 1. 서버 액션을 시작시켜서 'isPending'을 true로 만듭니다. (2번 주자 출발)
    startTransition(() => {
      dispatch(value);
    });

    // 2. 동시에 로컬 대기 상태는 끕니다. (1번 주자 퇴장)
    setIsDebouncing(false);
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // 검색어를 다 지운 경우
    if (value.trim() === "") {
      setIsDebouncing(false); // 즉시 1번 주자 멈춤
      debouncedSearch.cancel(); // 예약된 2번 주자 출발 취소
      // (선택) 이전 결과를 지우고 싶다면 여기서 별도 처리가 필요할 수 있습니다.
      return;
    }

    // [1번 주자 출발]
    // 입력하자마자 로딩 상태를 켜서 사용자에게 즉각 피드백 제공
    setIsDebouncing(true);
    debouncedSearch(value);
  };

  const currentUsername = currentUser?.name;

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

  const navItems = [
    ...BASE_NAV_ITEMS.slice(0, 5),
    {
      name: "프로필",
      href: currentUsername ? `/profile/${currentUsername}` : "/profile",
      icon: UserIcon,
      type: "link",
    },
    ...(currentUser ? [BASE_NAV_ITEMS[5]] : []),
  ];

  const searchResults = state.data || [];

  return (
    <>
      {expandedState !== "none" && (
        <div
          className="fixed inset-0 z-40 bg-black/0"
          onClick={() => setExpandedState("none")}
        />
      )}

      <div className="fixed left-0 top-0 z-50 flex h-full pointer-events-none">
        <nav
          className={cn(
            "relative z-50 flex h-full w-20 flex-col border-r bg-white p-4 transition-all duration-300 pointer-events-auto",
            expandedState !== "none" ? "shadow-2xl" : ""
          )}
        >
          <div className="mb-10 flex justify-center px-2">
            <Link href="/" onClick={() => setExpandedState("none")}>
              <Star size={28} className="fill-current text-black" />
            </Link>
          </div>

          <ul className="flex flex-1 flex-col items-center gap-4">
            {navItems.map((item) => {
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

        <aside
          className={cn(
            "relative z-40 h-full bg-white border-r shadow-xl transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto",
            expandedState !== "none" ? "w-80 opacity-100" : "w-0 opacity-0"
          )}
        >
          <div className="flex h-full flex-col p-6 w-80">
            {expandedState === "search" && (
              <>
                <h2 className="mb-6 text-xl font-bold font-sans">검색</h2>
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder="검색"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full rounded-md bg-gray-100 p-2 pl-3 outline-none focus:ring-1 focus:ring-gray-300 text-sm placeholder:text-gray-500 text-black"
                  />
                  <div className="absolute right-3 top-2.5 text-gray-400">
                    {/* isLoading(통합 상태)을 사용하여 반응성 확보 */}
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : searchQuery ? (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          debouncedSearch.cancel();
                          setIsDebouncing(false);
                        }}
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {!searchQuery ? (
                    /* 1. 검색어가 없을 때 */
                    <div className="mt-8 border-t pt-8 text-center text-sm text-gray-400">
                      검색어를 입력하세요.
                    </div>
                  ) : isLoading ? (
                    /* 2. 로딩 중 (디바운스 중 OR 서버 요청 중) - 이전 결과 숨김 */
                    <div className="mt-8 flex justify-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" />
                        <span className="text-xs">검색 중...</span>
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    /* 3. 로딩 끝 & 결과 있음 */
                    <ul className="flex flex-col gap-2">
                      {searchResults.map((user) => (
                        <li key={user.id}>
                          <Link
                            href={`/profile/${user.username}`}
                            onClick={() => setExpandedState("none")}
                            className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-50 transition-colors"
                          >
                            <div className="relative h-10 w-10 shrink-0">
                              <Image
                                src={user.profileImage || "@/default-profile.png"}
                                alt={user.username}
                                fill
                                className="rounded-full object-cover border border-gray-200"
                              />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-semibold text-sm truncate">
                                {user.username}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    /* 4. 로딩 끝 & 결과 없음 */
                    <div className="mt-8 border-t pt-8 text-center text-sm text-gray-400">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </>
            )}

            {expandedState === "notifications" && (
              <>
                <h2 className="mb-6 text-xl font-bold font-sans">알림</h2>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
                  <Notificationlist currentUser={currentUser} />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}