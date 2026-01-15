"use server";
import { revalidatePath } from "next/cache";
import { PostCreateSchema } from "@/shared/validation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createPostInDB, deletePostInDb } from "@/services/post.service";
import db from "@/lib/db";
import { likes, posts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm"; // ⭐️ sql 임포트 필수!
import {
  deleteNotification,
  createNotification,
} from "@/services/notification.service";

// 반환 값에 대한 타입 정의
export interface createPostErrorResponse {
  errors?: { images?: string[]; caption?: string[]; location?: string[] };
  message?: string;
}

/*formData(caption, location, images)를 받아 새 Post를 db에 생성 */
export async function createPost(
  prevState: createPostErrorResponse | null, // 첫 번째 인자 추가
  formData: FormData
): Promise<createPostErrorResponse> {
  const session = await auth();
  const currentUser = session?.user?.id;

  if (!currentUser) {
    // 에러를 던져서 즉시 catch 블록으로 이동시킴 (아래 로직 실행 안 됨)
    throw new Error("로그인이 필요한 서비스입니다.");
  }
  const rawInput = {
    // 이미지는 여러 개이므로 getAll() 사용
    images: formData.getAll("images") as string[],

    // 나머지는 하나씩이므로 get() 사용
    // (빈 문자열이 올 경우 null이나 undefined로 처리하고 싶다면 여기서 변환 로직 추가 가능)
    caption: formData.get("caption")?.toString() || undefined,
    location: formData.get("location")?.toString() || undefined,
  };

  // 1-1. (선택사항) 빈 문자열 이미지 URL 필터링 등 기초적인 정제
  // Zod의 .url() 검사 전에 명백히 잘못된 데이터(빈 값)는 미리 쳐내는 게 깔끔할 수 있습니다.
  rawInput.images = rawInput.images.filter((url) => url.trim() !== "");

  // 2. 공유된 스키마로 검증 (Validation)
  const validation = PostCreateSchema.safeParse(rawInput);

  if (!validation.success) {
    // 검증 실패 시 에러 반환
    return {
      errors: validation.error.flatten().fieldErrors,
      message: "입력값을 확인해주세요.",
    };
  }

  // 3. 검증 통과된 데이터 사용
  const validatedData = validation.data;
  // validatedData는 이제 { images: string[], caption?: string, location?: string } 타입이 확실함
  try {
    // 2. 데이터베이스 저장
    await createPostInDB({
      authorId: currentUser,
      caption: validatedData.caption as string,
      locationName: validatedData.location, // 스키마의 locationName과 매칭
      images: validatedData.images,
    });
  } catch (error) {
    let errorMessage = "알 수 없는 오류가 발생했습니다.";

    if (error instanceof Error) {
      // 1. 표준 에러 객체인 경우
      errorMessage = error.message;
    } else if (typeof error === "string") {
      // 2. 문자열만 던져진 경우
      errorMessage = error;
    }

    // 로그 기록 (서버 사이드)
    console.error("실제 에러 로그:", error);

    return {
      message: errorMessage,
    };
  }
  revalidatePath(`/profile/${session?.user?.name}`);

  redirect(`/profile/${session?.user?.name}`);
}

export async function togglePostLikeAction(postId: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. 인증 확인
      const authSession = await auth();
      if (!authSession?.user?.id) throw new Error("인증이 필요합니다.");
      const userId = authSession.user.id;

      // 2. 게시물 및 기존 좋아요 여부 조회
      const postWithLikes = await tx.query.posts.findFirst({
        where: eq(posts.id, postId),
        columns: {
          authorId: true,
        },
        with: {
          likes: {
            where: eq(likes.userId, userId),
            columns: { userId: true },
          },
        },
      });

      if (!postWithLikes) throw new Error("게시물을 찾을 수 없습니다.");

      if (postWithLikes.authorId === userId) {
        throw new Error("본인의 게시물에는 좋아요를 누를 수 없습니다.");
      }

      const isLiked = postWithLikes.likes.length > 0;

      if (isLiked) {
        // ▼▼▼ [취소 로직] ▼▼▼
        const deletedRows = await tx
          .delete(likes)
          .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
          .returning();

        // 실제로 삭제된 경우에만 카운트 감소 및 알림 삭제
        if (deletedRows.length > 0) {
          // 1. 게시물 좋아요 숫자 -1 (Atomic Decrement)
          await tx
            .update(posts)
            .set({
              likeCount: sql`${posts.likeCount} - 1`, // ⭐️ SQL 레벨 연산
            })
            .where(eq(posts.id, postId));

          // 2. 알림 삭제
          await deleteNotification(
            {
              actorId: userId,
              recipientId: postWithLikes.authorId,
              type: "LIKE",
              postId: postId,
            },
            tx
          );
        }
      } else {
        // ▼▼▼ [추가 로직] ▼▼▼
        const insertedRows = await tx
          .insert(likes)
          .values({
            userId: userId,
            postId: postId,
          })
          .onConflictDoNothing()
          .returning();

        // 실제로 추가된 경우에만 카운트 증가 및 알림 전송
        if (insertedRows.length > 0) {
          // 1. 게시물 좋아요 숫자 +1 (Atomic Increment)
          await tx
            .update(posts)
            .set({
              likeCount: sql`${posts.likeCount} + 1`, // ⭐️ SQL 레벨 연산
            })
            .where(eq(posts.id, postId));

          // 2. 알림 생성
          // (내 글에 내가 좋아요 누른 경우는 알림 안 보내는 게 국룰)
          if (postWithLikes.authorId !== userId) {
            await createNotification(
              {
                actorId: userId,
                recipientId: postWithLikes.authorId,
                type: "LIKE",
                postId: postId,
              },
              tx
            );
          }
        }
      }

      // 3. 캐시 갱신
      // 경로 앞에 슬래시(/)가 있어야 안전합니다.
      revalidatePath(`/post/${postId}`);

      return { success: true };
    });
  } catch (error) {
    console.error("Like toggle transaction error:", error);
    throw new Error(error.message || "작업 처리 중 문제가 발생했습니다.");
  }
}


// ✅ 실제 구현 (bind 사용 시)
export async function deletePostAction(
  postId: string,      // 1. bind로 넘겨준 값 (가장 먼저 옴)
  prevState: null | {message : string},      // 2. useActionState가 넣어주는 이전 상태
  formData: FormData   // 3. form이 제출될 때 들어오는 데이터 (여기선 안 씀)
) {
  
  const session = await auth();
  if (!session || !session.user?.id) {
      return { success: false, message: "로그인이 필요합니다." };
  }
  
  try {
    // DB 삭제 로직 (postId와 session.user.id로 검증)
    const deletedPost = await deletePostInDb(postId, session.user.id);

    if (!deletedPost) {
      return { success: false, message: "삭제 권한이 없거나 이미 삭제되었습니다." };
    }

    revalidatePath("/");
    revalidatePath(`/profile/${session.user.name}`);
  } catch (error) {
    console.error(error);
    return { success: false, message: "서버 오류가 발생했습니다." };
  }

  // 성공 시 이동
  redirect(`/profile/${session.user.name}`);
}