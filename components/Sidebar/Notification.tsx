'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 1. Populate된 Issuer(발신자) 객체 타입 정의
interface PopulatedIssuer {
  _id: string;
  username: string;
  profileImage: string;
}

// 2. 서버에서 직렬화(JSON.stringify)되어 넘어온 알림 데이터 타입 정의
export interface SerializedNotification {
  _id: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';
  issuer: PopulatedIssuer; // Populate된 객체 형태
  receiver: string;        // ID 문자열
  postId?: string;         // ID 문자열 (선택 사항)
  commentId?: string;      // ID 문자열 (선택 사항)
  isRead: boolean;
  createdAt: string;       // Date 객체가 아닌 ISO 문자열
}

interface NotificationProps {
  notification: SerializedNotification;
}

export default function Notification({ notification }: NotificationProps) {
  const { issuer, type, createdAt, postId } = notification;

  // 알림 타입별 렌더링 로직 (Logic)
  const getNotificationContent = () => {
    switch (type) {
      case 'LIKE':
        return {
          text: '님이 회원님의 사진을 좋아합니다.',
          href: `/post/${postId}`,
        };
      case 'COMMENT':
        return {
          text: '님이 댓글을 남겼습니다.',
          href: `/post/${postId}`,
        };
      case 'FOLLOW':
        return {
          text: '님이 회원님을 팔로우하기 시작했습니다.',
          href: `/profile/${issuer.username}`,
        };
      default:
        return { text: '알림이 도착했습니다.', href: '#' };
    }
  };

  const content = getNotificationContent();

  return (
    <Link 
      href={content.href}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0"
    >
      {/* 발신자 프로필 이미지 */}
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-gray-100 bg-gray-200">
        <Image
          src={issuer.profileImage || '/default-profile.png'}
          alt={issuer.username}
          fill
          sizes="44px"
          className="object-cover"
        />
      </div>

      {/* 알림 메시지 영역 */}
      <div className="flex flex-1 flex-col justify-center overflow-hidden">
        <p className="text-sm leading-snug text-black">
          <span className="font-bold">{issuer.username}</span>
          {content.text}
        </p>
        
        {/* 상대 시간 표시 (문자열인 createdAt을 Date 객체로 변환하여 처리) */}
        <span className="mt-1 text-xs text-gray-500">
          {formatDistanceToNow(new Date(createdAt), { 
            addSuffix: true, 
            locale: ko 
          })}
        </span>
      </div>

      {/* 읽지 않은 알림 표시 (파란색 점) */}
      {!notification.isRead && (
        <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="읽지 않은 알림" />
      )}
    </Link>
  );
}