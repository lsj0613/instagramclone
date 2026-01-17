import { auth } from "@/lib/auth";
import { getUser } from "@/services/user.service"; // 위에서 만든 새 액션
import { notFound, redirect } from "next/navigation";
import ProfileView from "@/features/user/components/ProfileView";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  // 1. URL 파라미터 및 세션 가져오기
  const { username } = await params;
  const session = await auth();

  const user = await getUser(username, "username", "profile");
  // 2. 병렬로 데이터 fetching (유저 정보 + 게시물 리스트)
  // Promise.all을 사용하여 동시에 요청을 보내 성능을 높입니다.
  if (!session) {
    console.log("nologin");
    redirect("/login");
  }
  // 3. 유저가 없으면 404
  if (!user) {
    notFound();
  }

  return <ProfileView currentUser={session.user} user={user} />;
}
