"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { type NotificationWithRelations } from "@/services/notification.service";
import { UI_TEXT } from "@/shared/constants";

interface NotificationProps {
  notification: NotificationWithRelations;
}

export default function Notification({ notification }: NotificationProps) {
  const { actor, type, createdAt, postId, isRead } = notification;

  const getNotificationContent = () => {
    switch (type) {
      case "LIKE":
        return { text: UI_TEXT.NotificationLike, href: `/post/${postId}` };
      case "COMMENT":
        return { text: UI_TEXT.NotificationComment, href: `/post/${postId}` };
      case "FOLLOW":
        return {
          text: UI_TEXT.NotificationFollow,
          href: `/profile/${actor.username}`,
        };
      case "REPLY":
        return { text: UI_TEXT.NotificationReply, href: `/post/${postId}` };
      case "COMMENT_LIKE":
        return {
          text: UI_TEXT.NotificationCommentLike,
          href: `/post/${postId}`,
        };
      default:
        return { text: UI_TEXT.NotificationDefault, href: "#" };
    }
  };

  const content = getNotificationContent();

  return (
    <Link
      href={content.href}
      className="flex w-full items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100 group"
    >
      {/* 프로필 이미지 */}
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 mt-0.5">
        <Image
          src={actor.profileImage || "/default-profile.png"}
          alt={actor.username}
          fill
          sizes="44px"
          className="object-cover"
        />
      </div>

      {/* 텍스트 영역 */}
      <div className="flex flex-1 flex-col min-w-0 justify-center min-h-[44px]">
        {/* ⭐️ 수정 포인트:
            1. break-words -> break-keep: 한글 단어 단위 줄바꿈 (가독성 UP)
            2. break-words도 함께 사용 고민? -> break-keep이 우선순위가 높아 보통 무시되지만,
               영어 긴 단어(URL 등) 대응을 위해 break-all을 섞는 경우도 있음.
               하지만 일반적인 댓글은 break-keep이 가장 깔끔함.
        */}
        <p className="text-sm text-black leading-snug line-clamp-3 break-keep">
          <span className="font-semibold mr-1">{actor.username}</span>
          <span>{content.text}</span>

          <span className="text-xs text-gray-400 font-normal ml-1 inline-block whitespace-nowrap">
            {formatDistanceToNow(new Date(createdAt), {
              addSuffix: true,
              locale: ko,
            })}
          </span>
        </p>
      </div>

      {/* 읽지 않음 표시 */}
      {!isRead && (
        <div className="shrink-0 pt-2 pl-1">
          <div
            className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white"
            aria-label="읽지 않음"
          />
        </div>
      )}
    </Link>
  );
}
