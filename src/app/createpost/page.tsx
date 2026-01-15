import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreatePostForm from "../../features/post/components/CreatePostForm";
import GreetingHeader from "../../features/post/components/GreetingHeader"; // 새로 만들 컴포넌트

export default async function CreatePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userName = session.user.name || "사용자";
  
  return (
    <div className="max-w-xl mx-auto mt-10 p-4">
      {/* 클라이언트 컴포넌트로 분리하여 Hydration 오류 방지 */}
      <GreetingHeader userName={userName} />
      <CreatePostForm />{" "}
    </div>
  );
}
