import { redirect } from "next/navigation";
import CreatePostForm from "../../../features/post/components/CreatePostForm";
import GreetingHeader from "../../../features/post/components/GreetingHeader"; // 새로 만들 컴포넌트
import { getCurrentUser } from "@/services/user.service";
import { ROUTES } from "@/shared/constants";

export default async function CreatePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-4">
      {/* 클라이언트 컴포넌트로 분리하여 Hydration 오류 방지 */}
      <GreetingHeader currentUser={currentUser} />
      <CreatePostForm />
    </div>
  );
}
