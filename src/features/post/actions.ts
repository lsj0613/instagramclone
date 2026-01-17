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
import { ActionResponse } from "@/lib/types"; // 정의해둔 ActionState 타입 경로

/* formData(caption, location, images)를 받아 새 Post를 db에 생성 */
export async function createPostAction(
  prevState: ActionResponse | null, // 1. 타입 적용
  formData: FormData
): Promise<ActionResponse> {
  // 1. 인증 확인
  const session = await auth();
  const currentUser = session?.user;

  if (!currentUser) {
    // 3. throw 대신 실패 상태 반환 (클라이언트에서 메시지 처리 가능)
    return {
      success: false,
      message: "로그인이 필요한 서비스입니다.",
    };
  }

  // 2. 데이터 추출 및 전처리
  // ⭐️ 중요: formData 값은 다 string이므로 숫자로 변환 필요
  const latStr = formData.get("latitude")?.toString();
  const lngStr = formData.get("longitude")?.toString();

  const rawInput = {
    authorId: currentUser.id,
    caption: formData.get("caption")?.toString() || "", // 필수면 빈 문자열로 넘겨서 Zod가 잡게 함
    locationName: formData.get("locationName")?.toString() || undefined,
    // ⭐️ 숫자로 변환 (값이 있으면 변환, 없으면 undefined)
    latitude: latStr ? parseFloat(latStr) : undefined,
    longitude: lngStr ? parseFloat(lngStr) : undefined,
    images: formData.getAll("images") as string[],
  };

  // 빈 이미지 URL 필터링
  rawInput.images = rawInput.images.filter((url) => url.trim() !== "");

  // 3. Zod 검증
  const validation = PostCreateSchema.safeParse(rawInput);

  if (!validation.success) {
    // 4. 유효성 검사 실패 시 fieldErrors에 담아 반환
    return {
      success: false,
      message: "입력값을 확인해주세요.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  // 4. DB 저장 시도
  try {
    const validatedData = validation.data;

    await createPostInDB(validatedData);

    // 5. 성공 시 데이터 갱신 (DB 저장이 성공했을 때만 실행)
    revalidatePath(`/profile/${session?.user?.username}`);
    revalidatePath("/");
  } catch (error) {
    // 6. DB/서버 에러 처리
    console.error("Create Post Error:", error);

    // 에러 메시지 추출 로직
    const userMessage =
      "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."; // 기본 메시지
    /* 에러 메시지 핸들링 - <할것> */
    return {
      success: false,
      message: userMessage,
    };
  }

  // 7. 성공 시 페이지 이동 (try-catch 밖에서 실행해야 함)
  redirect(`/profile/${session?.user?.username}`);
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
  postId: string,
  prevState: null | ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const session = await auth();
  if (!session || !session.user?.id) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  try {
    // ⭐️ [Happy Path]
    // 이제 null 체크를 할 필요가 없습니다.
    // 실패(권한 없음, 게시물 없음)하면 deletePostInDb가 알아서 에러를 던져서 catch로 보냅니다.
    await deletePostInDb(postId, session.user.id);

    // 여기까지 코드가 도달했다는 건 무조건 성공했다는 뜻입니다.
    revalidatePath("/");
    revalidatePath(`/profile/${session.user.username}`);
  } catch (error) {
    // 서버 로그에는 전체 에러를 찍어서 디버깅을 용이하게 합니다.
    console.error("[DeletePostAction Error]:", error);

    // 에러 객체에서 메시지 추출
    const errorMessage = error instanceof Error ? error.message : "";

    // 🕵️‍♂️ 에러 종류에 따라 사용자에게 보여줄 메시지 분기
    if (errorMessage === "POST_NOT_FOUND_OR_UNAUTHORIZED") {
      // 의도된 비즈니스 로직 에러
      return {
        success: false,
        message: "삭제 권한이 없거나 이미 삭제되었습니다.",
      };
    }

    // 그 외 예측 불가능한 시스템 에러 (DB 연결 끊김 등)
    return {
      success: false,
      message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  // 성공 시 이동 (try-catch 밖에서 실행)
  redirect(`/profile/${session.user.username}`);
}
