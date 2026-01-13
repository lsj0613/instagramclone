import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  primaryKey,
  doublePrecision,
  index,
  boolean, // boolean 추가됨
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -------------------------------------------------------------------
// 1. 유저 테이블 (Users)
// -------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  profileImage: text("profile_image"),
  bio: text("bio"),

  // [반정규화 필드] 프로필 페이지 로딩 속도 최적화
  postCount: integer("post_count").default(0).notNull(),
  followerCount: integer("follower_count").default(0).notNull(),
  followingCount: integer("following_count").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -------------------------------------------------------------------
// 2. 게시물 테이블 (Posts)
// -------------------------------------------------------------------
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    caption: text("caption"),
    
    // 위치 정보
    locationName: text("location_name"), 
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    
    // 반정규화 (좋아요/댓글 수)
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    authorIdCreatedAtIdx: index("posts_author_id_created_at_idx").on(
      table.authorId,
      table.createdAt
    ),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
  })
);

// -------------------------------------------------------------------
// 3. 게시물 이미지 테이블 (Post Images)
// -------------------------------------------------------------------
export const postImages = pgTable(
  "post_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url").notNull(),
    order: integer("order").notNull().default(0),
  },
  (table) => ({
    postIdIdx: index("post_images_post_id_idx").on(table.postId),
  })
);

// -------------------------------------------------------------------
// 4. 좋아요 테이블 (Likes)
// -------------------------------------------------------------------
export const likes = pgTable(
  "likes",
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
    postIdIdx: index("likes_post_id_idx").on(t.postId),
  })
);

// -------------------------------------------------------------------
// 5. 댓글 테이블 (Comments)
// -------------------------------------------------------------------
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { 
      onDelete: "cascade" 
    }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    postIdCreatedAtIdx: index("comments_post_id_created_at_idx").on(
      table.postId,
      table.createdAt
    ),
    authorIdIdx: index("comments_author_id_idx").on(table.authorId),
    parentIdCreatedAtIdx: index("comments_parent_id_created_at_idx").on(
      table.parentId,
      table.createdAt
    ),
  })
);

// -------------------------------------------------------------------
// 6. 팔로우 테이블 (Follows)
// -------------------------------------------------------------------
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    followingId: uuid("following_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followingId] }),
    followingIdIdx: index("follows_following_id_idx").on(t.followingId),
  })
);

// -------------------------------------------------------------------
// 7. 알림 테이블 (Notifications) [NEW ✨]
// -------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    recipientId: uuid("recipient_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
      
    actorId: uuid("actor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
      
    // [수정됨] 타입 정의 (주석으로 명시)
    // 'FOLLOW' | 'LIKE' (게시물 좋아요) | 'COMMENT' (게시물 댓글) 
    // 'REPLY' (대댓글) | 'COMMENT_LIKE' (댓글 좋아요)
    type: text("type").notNull(),
    
    // 게시물 관련 알림일 때 사용 (FOLLOW 제외)
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" }),
    
    // [추가됨] 대댓글이나 댓글 좋아요일 때, '어떤 댓글'인지 식별용
    commentId: uuid("comment_id")
      .references(() => comments.id, { onDelete: "cascade" }),

    isRead: boolean("is_read").default(false).notNull(),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // 1. [조회용] 내 알림함 (변동 없음)
    recipientIdCreatedAtIdx: index("notifications_recipient_id_created_at_idx").on(
      table.recipientId,
      table.createdAt
    ),

    // 2. [삭제/검색용] 인덱스 순서 최적화! ⭐️
    // actorId(누가) -> type(뭘) -> postId(어디에) 순서가 가장 효율적입니다.
    // 예: "내가(Actor) 한 팔로우(FOLLOW) 취소" -> actorId + type 만으로 검색 가능
    // 예: "내가(Actor) 이 글(PostId)에 단 댓글(COMMENT) 삭제" -> actorId + type + postId 로 검색 가능
    undoActionIdx: index("notifications_undo_action_idx").on(
      table.actorId,
      table.type, 
      table.postId,
      table.commentId
    ),
  })
);

// -------------------------------------------------------------------
// 관계 설정 (Relations)
// -------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  likes: many(likes),
  comments: many(comments),
  following: many(follows, { relationName: "user_following" }),
  followers: many(follows, { relationName: "user_followers" }),
  // 내가 받은 알림들
  notifications: many(notifications, { relationName: "user_notifications" }),
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

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  images: many(postImages),
  likes: many(likes),
  comments: many(comments),
}));

export const postImagesRelations = relations(postImages, ({ one }) => ({
  post: one(posts, {
    fields: [postImages.postId],
    references: [posts.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, { fields: [comments.authorId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_replies",
  }),
  replies: many(comments, { relationName: "comment_replies" }),
}));

// [NEW] 알림 관계 설정
export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "user_notifications",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "notification_actor",
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
  // [추가] 댓글 정보 연결 (알림 클릭 시 해당 댓글 내용 미리보기 등 가능)
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));