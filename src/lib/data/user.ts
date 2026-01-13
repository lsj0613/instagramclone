import 'server-only';
import { cache } from 'react';
import db from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// [핵심] 외부 변수로 뺐던 Config를 함수 내부로 가져오거나
// 타입을 유지하기 위해 Helper 함수를 사용합니다.

// -------------------------------------------------------------------
// 1. 타입 추론을 위한 헬퍼 함수 (Type Helpers)
// -------------------------------------------------------------------
// 이 함수들은 실행되지 않고 오직 "타입 추출용"으로만 쓰입니다.
const getSummaryQuery = () => db.query.users.findFirst({
  columns: { id: true, username: true, profileImage: true, bio: true },
  with: {
    posts: {
      columns: { id: true, likeCount: true, commentCount: true },
      with: {
        images: { orderBy: (imgs, { asc }) => [asc(imgs.order)], limit: 1, columns: { url: true } },
      },
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      limit: 3,
    },
  },
});

const getProfileQuery = () => db.query.users.findFirst({
  columns: {
    id: true, username: true, profileImage: true, bio: true,
    postCount: true, followerCount: true, followingCount: true,
  },
  with: {
    posts: {
      columns: { id: true, likeCount: true, commentCount: true },
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      with: {
        images: { limit: 1, orderBy: (imgs, { asc }) => [asc(imgs.order)], }
      }
    },
  },
});

// ✅ 여기서 스키마 기반의 완벽한 타입이 생성됩니다.
export type UserSummaryData = Awaited<ReturnType<typeof getSummaryQuery>>;
export type UserProfileData = Awaited<ReturnType<typeof getProfileQuery>>;

// -------------------------------------------------------------------
// 2. 실제 데이터 페칭 함수 (통합 버전)
// -------------------------------------------------------------------
// 오버로딩 정의
type GetUserFunction = {
  (identifier: string, by: 'id' | 'username', mode: 'summary'): Promise<UserSummaryData>;
  (identifier: string, by: 'id' | 'username', mode: 'profile'): Promise<UserProfileData>;
};

const _getUserImpl = async (
  identifier: string,
  by: 'id' | 'username',
  mode: 'summary' | 'profile'
) => {
  const condition = by === 'id' ? eq(users.id, identifier) : eq(users.username, identifier);

  // 💡 중요: Config를 변수로 분리하지 않고, 조건문 안에서 직접 실행하거나
  // switch-case로 분기하면 Drizzle이 타입을 잃어버리지 않습니다.
  // 하지만 코드 중복을 피하기 위해 여기서는 위에서 정의한 쿼리와 동일한 구조를 사용해야 합니다.

  if (mode === 'summary') {
    // getSummaryQuery() 와 동일한 내용
    return await db.query.users.findFirst({
      where: condition,
      columns: { id: true, username: true, profileImage: true, bio: true },
      with: {
        posts: {
          columns: { id: true, likeCount: true, commentCount: true },
          with: {
            images: { orderBy: (imgs, { asc }) => [asc(imgs.order)], limit: 1, columns: { url: true } },
          },
          orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          limit: 3,
        },
      },
    });
  } else {
    // getProfileQuery() 와 동일한 내용
    return await db.query.users.findFirst({
      where: condition,
      columns: {
        id: true, username: true, profileImage: true, bio: true,
        postCount: true, followerCount: true, followingCount: true,
      },
      with: {
        posts: {
          columns: { id: true, likeCount: true, commentCount: true },
          orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          with: {
            images: { limit: 1, orderBy: (imgs, { asc }) => [asc(imgs.order)], }
          }
        },
      },
    });
  }
};

// -------------------------------------------------------------------
// 3. 내보내기 (Cache 적용)
// -------------------------------------------------------------------
// as GetUserFunction을 붙여서 오버로딩 타입을 강제합니다.
// 내부 구현에서는 if/else로 타입을 맞췄으므로 any 없이 안전합니다.
export const getUser = cache(_getUserImpl) as GetUserFunction;