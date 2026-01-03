"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import Notificationlist from "./Notificationlist";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  id?: string;
}

export interface SessionUserProps {
  currentUser?: SessionUser | null;
}

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

  /**
   * 논리적 수정 사항:
   * 1. BASE_NAV_ITEMS[5]가 '설정' 아이템임을 식별.
   * 2. currentUser가 존재할 때만 해당 아이템을 배열에 포함.
   */
  const navItems = [
    ...BASE_NAV_ITEMS.slice(0, 5),
    {
      name: "프로필",
      href: currentUsername ? `/profile/${currentUsername}` : "/profile",
      icon: UserIcon,
      type: "link",
    },
    // currentUser가 null이나 undefined가 아닐 때만 설정 아이템을 추가
    ...(currentUser ? [BASE_NAV_ITEMS[5]] : []),
  ];

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