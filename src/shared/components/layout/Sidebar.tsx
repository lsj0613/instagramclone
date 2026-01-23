"use client";

import {
  useState,
  useActionState,
  startTransition,
  ReactNode,
  Suspense,
} from "react";
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
import { searchUsersAction, SearchUser } from "@/features/user/actions";
import { UI_TEXT } from "@/shared/constants";
import NotificationListContainer from "@/features/notification/components/NotificationListContainer";
import { CurrentUserData } from "@/services/user.service";

export interface SessionUserProps {
  currentUser?: CurrentUserData | null;
}

const initialState = {
  success: false,
  data: [] as SearchUser[],
  error: undefined as string | undefined,
};

const BASE_NAV_ITEMS = [
  { name: "홈", href: "/", icon: Home, type: "link" },
  { name: UI_TEXT.Search, href: "#", icon: Search, type: "search" },
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

  const [state, dispatch, isPending] = useActionState(
    searchUsersAction,
    initialState
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const isLoading = isDebouncing || isPending;

  const debouncedSearch = useDebouncedCallback((value: string) => {
    startTransition(() => {
      dispatch(value);
    });
    setIsDebouncing(false);
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim() === "") {
      setIsDebouncing(false);
      debouncedSearch.cancel();
      return;
    }

    setIsDebouncing(true);
    debouncedSearch(value);
  };

  const currentUsername = currentUser?.username;

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

        {/* ⭐️ 사이드 패널 영역 */}
        <aside
          className={cn(
            "relative z-40 h-full bg-white border-r shadow-xl transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto",
            // ⭐️ 부모 컨테이너 너비: 320px
            expandedState !== "none" ? "w-[320px] opacity-100" : "w-0 opacity-0"
          )}
        >
          {/* ⭐️ [수정됨] 내부 컨테이너: w-[400px] -> w-full (혹은 w-[320px])로 변경하여 잘림 방지 */}
          <div className="flex h-full flex-col w-full">
            {/* -------------------- 검색 패널 -------------------- */}
            {expandedState === "search" && (
              // ⭐️ [수정됨] 패딩: p-6 -> p-4 (320px 너비에 맞게 축소)
              <div className="flex flex-col h-full p-4">
                <h2 className="mb-6 text-xl font-bold font-sans">
                  {UI_TEXT.Search}
                </h2>
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder={UI_TEXT.SearchPlaceholder}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full rounded-md bg-gray-100 p-2 pl-3 outline-none focus:ring-1 focus:ring-gray-300 text-sm placeholder:text-gray-500 text-black"
                  />
                  <div className="absolute right-3 top-2.5 text-gray-400">
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
                    <div className="mt-8 border-t pt-8 text-center text-sm text-gray-400">
                      {UI_TEXT.StartSearch}
                    </div>
                  ) : isLoading ? (
                    <div className="mt-8 flex justify-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" />
                        <span className="text-xs">{UI_TEXT.Searching}</span>
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
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
                                src={
                                  user.profileImage || "/default-profile.png"
                                }
                                alt={user.username}
                                fill
                                className="rounded-full object-cover border border-gray-200"
                              />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-semibold text-sm truncate">
                                {user.username}
                              </span>
                              {user.name && (
                                <span className="text-xs text-gray-500 truncate">
                                  {user.name}
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-8 border-t pt-8 text-center text-sm text-gray-400">
                      {UI_TEXT.NoSearchResults}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* -------------------- 알림 패널 -------------------- */}
            {expandedState === "notifications" && (
              <NotificationListContainer currentUser={currentUser} />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
