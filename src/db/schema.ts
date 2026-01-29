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
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";
import { relations, isNull } from "drizzle-orm";
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
    username: text("username").notNull(), // ⭐️ unique() 제거 -> 아래 uniqueIndex로 대체
    name: text("name"),
    email: text("email").notNull().unique(),
    password: text("password"),
    profileImage: text("profile_image"),
    bio: text("bio"),

    hasFinishedOnboarding: boolean("has_finished_onboarding")
      .default(false)
      .notNull(),
    isPrivate: boolean("is_private").default(false).notNull(),

    // ⭐️ [추가] 비정규화 카운트 (O(1) 조회용)
    postCount: integer("post_count").default(0).notNull(),
    followerCount: integer("follower_count").default(0).notNull(),
    followingCount: integer("following_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),

    // ⭐️ [추가] Soft Delete
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    // 🔍 검색 최적화
    nameIdx: index("users_name_idx").on(table.name),

    // ⭐️ [중요] "삭제 안 된 유저끼리만" 닉네임 중복 방지 (Partial Unique Index)
    // 탈퇴한 유저의 아이디를 다른 사람이 다시 쓸 수 있게 해줌.
    uniqueUsernameActive: uniqueIndex("users_username_active_unique")
      .on(table.username)
      .where(isNull(table.deletedAt)),
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

    // ⭐️ [추가] 비정규화 카운트
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),

    // ⭐️ [추가] Soft Delete
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    // 🔍 피드 최적화
    authorCreatedIdx: index("posts_author_created_idx").on(
      table.authorId,
      table.createdAt
    ),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),

    // ⭐️ [추가] 삭제된 글 필터링 최적화
    deletedAtIdx: index("posts_deleted_at_idx").on(table.deletedAt),
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

    publicId: text("public_id").notNull(),
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
    // ⭐️ any 타입 제거 및 Self Reference 안전하게 처리 (아래 foreignKey는 선택사항)
    parentId: uuid("parent_id"),

    content: text("content").notNull(),

    // ⭐️ [추가] 비정규화 카운트
    likeCount: integer("like_count").default(0).notNull(),
    replyCount: integer("reply_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),

    // ⭐️ [추가] Soft Delete
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    postCreatedIdx: index("comments_post_created_idx").on(
      table.postId,
      table.createdAt
    ),
    authorIdIdx: index("comments_author_id_idx").on(table.authorId),
    parentIdIdx: index("comments_parent_id_idx").on(table.parentId),
  })
);

// [PostLikes] 게시물 좋아요
export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueLike: unique("post_likes_unique").on(t.userId, t.postId),
    postIdIdx: index("post_likes_post_id_idx").on(t.postId),
  })
);

// [CommentLikes] 댓글 좋아요
export const commentLikes = pgTable(
  "comment_likes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    commentId: uuid("comment_id")
      .references(() => comments.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueLike: unique("comment_likes_unique").on(t.userId, t.commentId),
    commentIdIdx: index("comment_likes_comment_id_idx").on(t.commentId),
  })
);

// [Follows] 팔로우
export const follows = pgTable(
  "follows",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
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
    uniqueFollow: unique("follows_unique").on(t.followerId, t.followingId),
    followingIdIdx: index("follows_following_id_idx").on(
      t.followingId,
      t.status
    ),
    followerIdIdx: index("follows_follower_id_idx").on(t.followerId, t.status),
  })
);

// [Notifications] 알림
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

    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),

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
    recipientCreatedIdx: index("notifications_recipient_created_idx").on(
      table.recipientId,
      table.createdAt
    ),
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
