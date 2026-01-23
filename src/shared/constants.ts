// 1. 라우트 경로 관리 (오타 방지)
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  CREATE_POST: "/createpost",
  DEFAULT_PROFILEIMAGE: "/default-profile.png",
  ONBOARDING: "/onboarding",
  PROFILE: (username: string) => `/profile/${username}`,
  POST_DETAIL: (postId: string) => `/post/${postId}`,
} as const;

// 2. 에러 메시지 관리 (백엔드/프론트엔드 통일)
export const ERROR_MESSAGES = {
  // ✅ 제공해주신 부분
  AUTH_REQUIRED: "로그인이 필요한 서비스입니다.",
  INVALID_INPUT: "입력값을 확인해주세요.",
  SERVER_ERROR: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  POST_NOT_FOUND: "게시물을 찾을 수 없거나 삭제되었습니다.",
  USER_NOT_FOUND: "사용자를 찾을 수 없거나 삭제되었습니다.",
  UNAUTHORIZED: "권한이 없습니다.",
  DUPLICATE_USERNAME: "이미 사용 중인 아이디입니다.",

  // ➕ 로직을 위해 추가한 부분 (스타일 통일)
  SELF_LIKE_NOT_ALLOWED: "본인의 게시물에는 좋아요를 누를 수 없습니다.",
  SEARCH_ERROR: "검색 중 오류가 발생했습니다.",
  COMMENT_NOT_FOUND_OR_UNAUTHORIZED: "댓글을 찾을 수 없거나 삭제되었습니다."
} as const;

// 3. 비즈니스 로직 상수 (제한 등)
export const CONFIG = {
  MAX_IMAGE_COUNT: 5, // 게시물당 최대 이미지 수
  MAX_CAPTION_LENGTH: 2200, // 인스타그램 실제 제한
  PAGINATION_LIMIT: 12, // 한 번에 불러올 게시물 수
} as const;

// 4. UI 텍스트 (버튼 이름, 탭 이름 등 - 나중에 다국어 적용 시 유리)
export const UI_TEXT = {
  // 공통/액션
  ConfirmDelete: "정말 삭제하시겠습니까?",
  Delete: "삭제",
  Deleting: "삭제 중...", // 추가됨
  Edit: "수정",
  Cancel: "취소",
  Report: "신고", // 추가됨
  Post: "게시", // 추가됨 (댓글 게시 등)
  Share: "공유하기", // 추가됨
  Posting: "게시 중...", // 추가됨
  Required: "(필수)", // 추가됨
  Optional: "(선택)", // 추가됨

  // 게시물 관련
  posts: "게시물",
  followers: "팔로워",
  following: "팔로잉",
  Follow: "팔로우",
  Unfollow: "팔로우 취소",
  LikeCount: (count: number) => `좋아요 ${count}개`,
  NoComments: "아직 댓글이 없습니다.", // 추가됨

  // 입력 폼 관련
  TypeCommentPlaceholder: "댓글 달기...", // 수정됨
  CreatePostTitle: "새 게시물 만들기", // 추가됨
  CreatePostDesc: "당신의 특별한 순간을 공유해보세요.", // 추가됨
  UploadPhoto: "사진 업로드", // 추가됨
  ClickToUpload: "클릭하여 업로드하거나", // 추가됨
  DragAndDrop: "이미지를 여기로 끌어오세요", // 추가됨
  EnterCaption: "문구 입력", // 추가됨
  CaptionPlaceholder: "사진에 대한 설명을 적어주세요...", // 추가됨
  AddLocation: "위치 추가", // 추가됨
  LocationPlaceholder: "예: 서울특별시 강남구", // 추가됨

  // 알림 (Notification)
  NoNotifications: "새로운 알림이 없습니다.",
  NotificationLike: "님이 회원님의 게시물을 좋아합니다.",
  NotificationComment: "님이 회원님의 게시물에 댓글을 남겼습니다.",
  NotificationFollow: "님이 회원님을 팔로우하기 시작했습니다.",
  NotificationReply: "님이 회원님의 댓글에 답글을 남겼습니다.", // [수정] '게시물에 댓글' -> '댓글에 답글'로 더 명확하게 수정
  NotificationCommentLike: "님이 회원님의 댓글을 좋아합니다.",
  NotificationDefault: "알림이 도착했습니다.",

  // 홈 & 인증 (Home & Auth)
  WelcomeMessage: (name: string) => `${name}님 환영합니다`,
  DefaultUserName: "사용자",
  Login: "로그인",
  Logout: "로그아웃",
  HomeMainTitle: "홈페이지 메인 콘텐츠",
  HomeMainDesc: "여기에 인스타그램 클론의 피드나 주요 내용이 들어갑니다.",

  Search: "검색",
  SearchPlaceholder: "검색...",
  NoSearchResults: "검색 결과가 없습니다.",
  StartSearch: "검색어를 입력하여 사용자를 찾아보세요.",
  Searching: "검색 중...",
} as const;
