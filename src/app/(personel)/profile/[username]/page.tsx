import { getCurrentUser, getUser } from "@/services/user.service"; // 위에서 만든 새 액션
import { notFound, redirect } from "next/navigation";
import ProfileView from "@/features/user/components/ProfileView";
import { ROUTES } from "@/shared/constants";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  // 1. URL 파라미터 및 세션 가져오기
  const { username } = await params;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(ROUTES.LOGIN);
  }

  const user = await getUser(username, "username", "profile");

  // 3. 유저가 없으면 404
  if (!user) {
    notFound();
  }

  return <ProfileView currentUser={currentUser} user={user} />;
}
