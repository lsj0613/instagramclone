import "server-only";

import { getCurrentUser, getUser } from "@/services/user.service";
import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/shared/constants";
import ProfileDetailView from "./ProfileDetailView";

export default async function ProfileContainer({ username }: { username: string }) {
  // 1. 사용자 인증 (서버 체크)
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(ROUTES.LOGIN);
  }

  // 2. 프로필 데이터 조회
  const user = await getUser(username, "username", "profile", currentUser.id);

  // 3. 존재하지 않는 유저 처리
  if (!user) {
    notFound();
  }

  // 4. View에 데이터 주입
  return <ProfileDetailView user={user} />;
}
