import db from "./src/lib/db";
import { comments } from "./src/db/schema";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const TARGET_POST_ID = "ff79b895-e903-48c3-b99c-0c8ac8f35de4";
const AUTHOR_ID = "942ba782-e9a1-4a54-b78d-678e9f36aa4b";
const TOTAL_COMMENT_COUNT = 100;
const ROOT_COMMENT_COUNT = 30; // 대댓글의 부모가 될 최상위 댓글 수

async function seedComments() {
  console.log("🚀 특정 게시물에 대한 댓글 시딩 시작...");

  try {
    // 1. 최상위 댓글(Root Comments) 생성
    // 대댓글이 존재하려면 먼저 부모 댓글의 ID가 필요하므로 1차 삽입을 진행합니다.
    console.log(`💬 최상위 댓글 ${ROOT_COMMENT_COUNT}개 생성 중...`);

    const rootCommentsData: (typeof comments.$inferInsert)[] = Array.from({
      length: ROOT_COMMENT_COUNT,
    }).map(() => ({
      postId: TARGET_POST_ID,
      authorId: AUTHOR_ID,
      content: faker.lorem.sentence(),
      parentId: null,
    }));

    const insertedRootComments = await db
      .insert(comments)
      .values(rootCommentsData)
      .returning({ id: comments.id });

    const rootIds = insertedRootComments.map((c) => c.id);

    // 2. 나머지 댓글 생성 (랜덤하게 대댓글 포함)
    console.log(
      `💬 나머지 ${TOTAL_COMMENT_COUNT - ROOT_COMMENT_COUNT}개 댓글 생성 중...`
    );

    const remainingCommentsData: (typeof comments.$inferInsert)[] = Array.from({
      length: TOTAL_COMMENT_COUNT - ROOT_COMMENT_COUNT,
    }).map(() => {
      // 40% 확률로 기존에 생성된 최상위 댓글 중 하나를 부모로 선택
      const isReply = Math.random() < 0.4;
      const parentId = isReply ? faker.helpers.arrayElement(rootIds) : null;

      return {
        postId: TARGET_POST_ID,
        authorId: AUTHOR_ID,
        content: faker.lorem.sentence(),
        parentId: parentId,
      };
    });

    // 효율성을 위해 남은 데이터를 한 번에 삽입 (Batch Insert)
    await db.insert(comments).values(remainingCommentsData);

    console.log(
      `✅ 성공: 총 ${TOTAL_COMMENT_COUNT}개의 댓글이 생성되었습니다.`
    );
  } catch (error) {
    console.error("❌ 시딩 실패:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedComments();
