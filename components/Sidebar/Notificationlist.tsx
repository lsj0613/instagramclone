import Notification, { SerializedNotification } from './Notification';

interface NotificationListProps {
  notifications: SerializedNotification[];
}

/**
 * @description 알림 데이터 배열을 받아 리스트 형태로 렌더링하는 컴포넌트
 * @param {NotificationListProps} props - SerializedNotification 배열을 포함한 객체
 */
export default function NotificationList({ notifications }: NotificationListProps) {
  // 데이터가 없을 경우에 대한 예외 처리
  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex justify-center p-8 text-gray-500">
        새로운 알림이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-200">
      {notifications.map((notification) => (
        <Notification 
          key={notification._id} 
          notification={notification} 
        />
      ))}
    </div>
  );
}