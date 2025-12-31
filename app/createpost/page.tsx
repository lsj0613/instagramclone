import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CreatePostForm from "./CreatePostForm";
import GreetingHeader from "./GreetingHeader"; /**
 * Renders the create-post page for an authenticated user.
 *
 * Redirects to "/login" when no authenticated user is present. When authenticated,
 * displays a greeting header and a create-post form populated with the user's name and id.
 *
 * @returns A JSX element containing the page layout with GreetingHeader and CreatePostForm.
 */

export default async function CreatePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userName = session.user.name || "사용자";
  const userId = session.user.id;

  return (
    <div className="max-w-xl mx-auto mt-10 p-4">
      {/* 클라이언트 컴포넌트로 분리하여 Hydration 오류 방지 */}
      <GreetingHeader userName={userName} />
      <CreatePostForm userId={userId} username={userName} />{" "}
    </div>
  );
}