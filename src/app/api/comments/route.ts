import { NextResponse } from "next/server";
import { getCommentsInDb } from "@/services/comment.service";
import { getCurrentUser } from "@/services/user.service";
import { ROUTES } from "@/shared/constants";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  const cursor = searchParams.get("cursor");

  const safeCursor =
    cursor === "undefined" || cursor === "null" ? undefined : cursor;

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(ROUTES.LOGIN);
  }

  const data = await getCommentsInDb({
    postId,
    currentUserId: currentUser?.id,
    cursorId: safeCursor || undefined,
  });

  console.log(data.comments.length);
  return NextResponse.json(data);
}
