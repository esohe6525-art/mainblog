import { integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

// One profile per Netlify Identity user; `id` is the Identity user id.
export const profiles = pgTable("profiles", {
  id: text().primaryKey(),
  username: text().notNull().unique(),
  name: text().notNull().default(""),
  bio: text().notNull().default(""),
  location: text().notNull().default(""),
  avatarKey: text("avatar_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial().primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  content: text().notNull(),
  imageKey: text("image_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const likes = pgTable(
  "likes",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export const comments = pgTable("comments", {
  id: serial().primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  content: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
