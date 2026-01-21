import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  primaryKey,
  doublePrecision,
  index,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid"; // ⭐️ UUID v7 임포트

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

// 유저 테이블
export const users = pgTable("users", {
  // ⭐️ UUID v7 적용
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
});

// 게시물 테이블
export const posts = pgTable(
  "posts",
  {
    // ⭐️ UUID v7 적용
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
    authorIdIdx: index("posts_author_id_idx").on(table.authorId),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
    authorCreatedIdx: index("posts_author_created_idx").on(
      table.authorId,
      table.createdAt
    ),
  })
);

// 게시물 이미지
export const postImages = pgTable(
  "post_images",
  {
    // ⭐️ UUID v7 적용
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url").notNull(),

    // CLS 방지용 메타데이터
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    altText: text("alt_text"),

    order: integer("order").notNull().default(0),
  },
  (table) => ({
    postIdIdx: index("post_images_post_id_idx").on(table.postId),
  })
);

// 댓글 테이블
export const comments = pgTable(
  "comments",
  {
    // ⭐️ UUID v7 적용
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
    postIdIdx: index("comments_post_id_idx").on(table.postId),
    authorIdIdx: index("comments_author_id_idx").on(table.authorId),
    parentIdIdx: index("comments_parent_id_idx").on(table.parentId),
    postCreatedIdx: index("comments_post_created_idx").on(
      table.postId,
      table.createdAt
    ),
  })
);

// 게시물 좋아요 (PK가 복합키라 ID 컬럼 없음 -> 변경 불필요)
export const postLikes = pgTable(
  "post_likes",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.postId] }),
    postIdIdx: index("post_likes_post_id_idx").on(t.postId),
  })
);

// 댓글 좋아요 (PK가 복합키라 ID 컬럼 없음 -> 변경 불필요)
export const commentLikes = pgTable(
  "comment_likes",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    commentId: uuid("comment_id")
      .references(() => comments.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.commentId] }),
    commentIdIdx: index("comment_likes_comment_id_idx").on(t.commentId),
  })
);

// 팔로우 (PK가 복합키라 ID 컬럼 없음 -> 변경 불필요)
export const follows = pgTable(
  "follows",
  {
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
    pk: primaryKey({ columns: [t.followerId, t.followingId] }),
    followingIdIdx: index("follows_following_id_idx").on(
      t.followingId,
      t.status
    ),
    statusIdx: index("follows_status_idx").on(t.status),
  })
);

// 알림
export const notifications = pgTable(
  "notifications",
  {
    // ⭐️ UUID v7 적용
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

    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    recipientIdIdx: index("notifications_recipient_id_idx").on(
      table.recipientId,
      table.createdAt
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
