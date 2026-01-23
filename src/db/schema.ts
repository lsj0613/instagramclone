import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  doublePrecision,
  index,
  boolean,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

// -------------------------------------------------------------------
// 1. Enum 정의
// -------------------------------------------------------------------

export const followStatusEnum = pgEnum("follow_status", [
  "PENDING",
  "ACCEPTED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "LIKE",
  "COMMENT",
  "FOLLOW",
  "FOLLOW_REQUEST",
  "REPLY",
  "COMMENT_LIKE",
]);

// -------------------------------------------------------------------
// 2. 테이블 정의
// -------------------------------------------------------------------

// [Users] 유저
export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    username: text("username").notNull().unique(),
    name: text("name"),
    email: text("email").notNull().unique(),
    password: text("password"),
    profileImage: text("profile_image"),
    bio: text("bio"),

    hasFinishedOnboarding: boolean("has_finished_onboarding")
      .default(false)
      .notNull(),
    isPrivate: boolean("is_private").default(false).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // 🔍 검색 최적화: 유저 아이디나 이름으로 검색할 때 속도 향상
    usernameIdx: index("users_username_idx").on(table.username),
    nameIdx: index("users_name_idx").on(table.name),
  })
);

// [Posts] 게시물
export const posts = pgTable(
  "posts",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    caption: text("caption"),
    locationName: text("location_name"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // 🔍 피드 최적화: "특정 유저의 최신 글"을 가져올 때 매우 중요 (복합 인덱스)
    authorCreatedIdx: index("posts_author_created_idx").on(
      table.authorId,
      table.createdAt
    ),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
  })
);

// [PostImages] 게시물 이미지
export const postImages = pgTable(
  "post_images",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url").notNull(),

    width: integer("width").notNull(),
    height: integer("height").notNull(),
    altText: text("alt_text"),

    order: integer("order").notNull().default(0),
  },
  (table) => ({
    postIdIdx: index("post_images_post_id_idx").on(table.postId),
  })
);

// [Comments] 댓글
export const comments = pgTable(
  "comments",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    parentId: uuid("parent_id").references((): any => comments.id, {
      onDelete: "cascade",
    }),
    content: text("content").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // 🔍 댓글 목록 최적화: "이 글의 댓글을 최신순/오래된순으로"
    postCreatedIdx: index("comments_post_created_idx").on(
      table.postId,
      table.createdAt
    ),
    authorIdIdx: index("comments_author_id_idx").on(table.authorId),
    parentIdIdx: index("comments_parent_id_idx").on(table.parentId),
  })
);

// [PostLikes] 게시물 좋아요 (PK 추가됨)
export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()), // ⭐️ 변경: 고유 ID 부여
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // ⭐️ 중요: (유저 + 게시물) 조합은 유니크해야 함 (중복 좋아요 방지)
    uniqueLike: unique("post_likes_unique").on(t.userId, t.postId),
    // 🔍 조회 최적화: "이 글의 좋아요 개수는?" 혹은 "누가 좋아요 했나?"
    postIdIdx: index("post_likes_post_id_idx").on(t.postId),
  })
);

// [CommentLikes] 댓글 좋아요 (PK 추가됨)
export const commentLikes = pgTable(
  "comment_likes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()), // ⭐️ 변경: 고유 ID 부여
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    commentId: uuid("comment_id")
      .references(() => comments.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // ⭐️ 중요: 중복 좋아요 방지
    uniqueLike: unique("comment_likes_unique").on(t.userId, t.commentId),
    commentIdIdx: index("comment_likes_comment_id_idx").on(t.commentId),
  })
);

// [Follows] 팔로우 (PK 추가됨)
export const follows = pgTable(
  "follows",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()), // ⭐️ 변경: 고유 ID 부여
    followerId: uuid("follower_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    followingId: uuid("following_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    status: followStatusEnum("status").default("ACCEPTED").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    // ⭐️ 중요: 중복 팔로우 방지
    uniqueFollow: unique("follows_unique").on(t.followerId, t.followingId),

    // 🔍 조회 최적화: "나를 팔로우하는 사람 목록(팔로워)" 조회 시 필수
    followingIdIdx: index("follows_following_id_idx").on(
      t.followingId,
      t.status
    ),
    // 🔍 "내가 팔로우하는 사람 목록(팔로잉)"은 unique constraint의 첫 번째 컬럼(followerId)을 타므로 별도 인덱스 불필요할 수 있으나, 명시적으로 두어도 됨.
    followerIdIdx: index("follows_follower_id_idx").on(t.followerId, t.status),
  })
);

// [Notifications] 알림 (Self-cleaning 적용)
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    recipientId: uuid("recipient_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    actorId: uuid("actor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: notificationTypeEnum("type").notNull(),

    // 🔗 연결 정보 (Deep Link용)
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),

    // 🧹 Self-cleaning을 위한 Trigger FK (이것들이 삭제되면 알림도 삭제됨)
    // 좋아요 취소 -> postLikes 행 삭제 -> notifications 행 자동 삭제
    postLikeId: uuid("post_like_id").references(() => postLikes.id, {
      onDelete: "cascade",
    }),
    commentLikeId: uuid("comment_like_id").references(() => commentLikes.id, {
      onDelete: "cascade",
    }),
    followId: uuid("follow_id").references(() => follows.id, {
      onDelete: "cascade",
    }),

    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // 🔍 알림 목록 조회: "내 알림을 최신순으로"
    recipientCreatedIdx: index("notifications_recipient_created_idx").on(
      table.recipientId,
      table.createdAt
    ),
    // 🔍 "안 읽은 알림 개수" 카운트용 (선택 사항)
    unreadIdx: index("notifications_unread_idx").on(
      table.recipientId,
      table.isRead
    ),
  })
);

// -------------------------------------------------------------------
// 3. 관계 설정 (Relations)
// -------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  postLikes: many(postLikes),
  commentLikes: many(commentLikes),
  comments: many(comments),
  following: many(follows, { relationName: "user_following" }),
  followers: many(follows, { relationName: "user_followers" }),
  notifications: many(notifications, { relationName: "user_notifications" }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  images: many(postImages),
  likes: many(postLikes),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  likes: many(commentLikes),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
}));

// 좋아요/팔로우 관계 설정 (단방향 참조가 많아 간단히 설정)
export const postLikesRelations = relations(postLikes, ({ one }) => ({
  user: one(users, { fields: [postLikes.userId], references: [users.id] }),
  post: one(posts, { fields: [postLikes.postId], references: [posts.id] }),
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  user: one(users, { fields: [commentLikes.userId], references: [users.id] }),
  comment: one(comments, {
    fields: [commentLikes.commentId],
    references: [comments.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "user_following",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "user_followers",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "user_notifications",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
  }),
  // 알림에서 연결된 원본 데이터로 바로 접근 가능하게 설정
  post: one(posts, { fields: [notifications.postId], references: [posts.id] }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));

export const postImagesRelations = relations(postImages, ({ one }) => ({
  post: one(posts, {
    fields: [postImages.postId],
    references: [posts.id],
  }),
}));
