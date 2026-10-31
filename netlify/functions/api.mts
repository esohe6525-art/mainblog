import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { getUser, verifyRequestOrigin, type User } from "@netlify/identity";
import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { comments, likes, posts, profiles } from "../../db/schema.js";

const PAGE_SIZE = 15;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};
const EXT_TYPES = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([type, ext]) => [ext, type]));

const uploads = () => getStore("uploads");

type Profile = typeof profiles.$inferSelect;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

const imageUrl = (key: string | null) => (key ? `/api/images/${key}` : null);

const publicProfile = (p: Profile) => ({
  username: p.username,
  name: p.name,
  displayName: p.name.trim() || p.username,
  bio: p.bio,
  location: p.location,
  avatarUrl: imageUrl(p.avatarKey),
  createdAt: p.createdAt,
});

function slugifyUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
}

// Identity users get a matching profile row the first time they hit the API.
async function ensureProfile(user: User): Promise<Profile> {
  const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (existing) return existing;

  const meta = user.userMetadata ?? {};
  let base = slugifyUsername(String(meta.username ?? "")) || slugifyUsername(user.email?.split("@")[0] ?? "");
  if (base.length < 3) base = `user${base}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? base : `${base.slice(0, 25)}${Math.floor(Math.random() * 10000)}`;
    const [taken] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, username));
    if (taken) continue;
    const [created] = await db
      .insert(profiles)
      .values({ id: user.id, username, name: String(meta.full_name ?? "").slice(0, 150) })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const [raced] = await db.select().from(profiles).where(eq(profiles.id, user.id));
    if (raced) return raced;
  }
  throw new HttpError(500, "Could not create a profile for this account.");
}

async function currentProfile(): Promise<Profile | null> {
  const user = await getUser();
  return user ? ensureProfile(user) : null;
}

async function requireProfile(): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) throw new HttpError(401, "Please sign in to continue.");
  return profile;
}

async function saveImage(file: FormDataEntryValue | null, folder: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new HttpError(422, "Images must be JPEG, PNG, GIF or WebP.");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(422, "Images must be 5 MB or smaller.");
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  await uploads().set(key, await file.arrayBuffer());
  return key;
}

async function deleteImage(key: string | null) {
  if (key) await uploads().delete(key);
}

async function profileStats(profileId: string) {
  const [[postCount], [likeCount], [commentCount]] = await Promise.all([
    db.select({ n: count() }).from(posts).where(eq(posts.authorId, profileId)),
    db
      .select({ n: count() })
      .from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .where(eq(posts.authorId, profileId)),
    db.select({ n: count() }).from(comments).where(eq(comments.authorId, profileId)),
  ]);
  return { posts: postCount.n, likes: likeCount.n, comments: commentCount.n };
}

async function loadComments(postIds: number[], viewer: Profile | null, postAuthors: Map<number, string>) {
  if (postIds.length === 0) return new Map<number, unknown[]>();
  const rows = await db
    .select({ comment: comments, author: profiles })
    .from(comments)
    .innerJoin(profiles, eq(comments.authorId, profiles.id))
    .where(inArray(comments.postId, postIds))
    .orderBy(asc(comments.createdAt));

  const grouped = new Map<number, unknown[]>();
  for (const { comment, author } of rows) {
    const list = grouped.get(comment.postId) ?? [];
    list.push({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: publicProfile(author),
      canDelete: !!viewer && (viewer.id === comment.authorId || viewer.id === postAuthors.get(comment.postId)),
    });
    grouped.set(comment.postId, list);
  }
  return grouped;
}

async function listPosts(viewer: Profile | null, where: SQL | undefined, page: number, commentLimit?: number) {
  const viewerId = viewer?.id ?? "";
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        post: posts,
        author: profiles,
        likeCount: sql<number>`(select count(*)::int from ${likes} where ${likes.postId} = ${posts.id})`,
        commentCount: sql<number>`(select count(*)::int from ${comments} where ${comments.postId} = ${posts.id})`,
        liked: sql<boolean>`exists(select 1 from ${likes} where ${likes.postId} = ${posts.id} and ${likes.userId} = ${viewerId})`,
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .where(where)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .where(where),
  ]);

  const authors = new Map(rows.map((r) => [r.post.id, r.post.authorId]));
  const commentMap = await loadComments([...authors.keys()], viewer, authors);

  return {
    posts: rows.map((r) => {
      const all = commentMap.get(r.post.id) ?? [];
      return {
        id: r.post.id,
        content: r.post.content,
        imageUrl: imageUrl(r.post.imageKey),
        createdAt: r.post.createdAt,
        author: publicProfile(r.author),
        likeCount: r.likeCount,
        commentCount: r.commentCount,
        liked: r.liked,
        isOwner: viewer?.id === r.post.authorId,
        comments: commentLimit === undefined ? all : all.slice(0, commentLimit),
      };
    }),
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, "Not found.");
  return id;
}

function cleanText(value: FormDataEntryValue | null | undefined, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = req.method;

  // Auth rides on the nf_jwt cookie, so reject cross-site writes.
  if (method !== "GET" && method !== "HEAD") verifyRequestOrigin(req);

  // GET /api/images/:folder/:file
  if (parts[0] === "images" && method === "GET" && parts.length === 3) {
    const key = `${parts[1]}/${parts[2]}`;
    const data = await uploads().get(key, { type: "arrayBuffer" });
    if (!data) return new Response("Not found", { status: 404 });
    const type = EXT_TYPES[parts[2].split(".").pop() ?? ""] ?? "application/octet-stream";
    return new Response(data, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  // /api/me
  if (parts[0] === "me" && parts.length === 1) {
    if (method === "GET") {
      const me = await currentProfile();
      if (!me) return json({ user: null });
      return json({ user: { ...publicProfile(me), stats: await profileStats(me.id) } });
    }
    if (method === "PUT") {
      const me = await requireProfile();
      const form = await req.formData();
      const avatarKey = await saveImage(form.get("avatar"), "avatars");
      const [updated] = await db
        .update(profiles)
        .set({
          name: cleanText(form.get("name"), 150),
          bio: cleanText(form.get("bio"), 300),
          location: cleanText(form.get("location"), 100),
          ...(avatarKey ? { avatarKey } : {}),
        })
        .where(eq(profiles.id, me.id))
        .returning();
      if (avatarKey) await deleteImage(me.avatarKey);
      return json({ user: publicProfile(updated) });
    }
  }

  // GET /api/members — most active community members
  if (parts[0] === "members" && method === "GET") {
    const me = await currentProfile();
    const rows = await db
      .select({ profile: profiles, n: count(posts.id) })
      .from(profiles)
      .leftJoin(posts, eq(posts.authorId, profiles.id))
      .where(me ? ne(profiles.id, me.id) : undefined)
      .groupBy(profiles.id)
      .orderBy(desc(count(posts.id)), desc(profiles.createdAt))
      .limit(5);
    return json({ members: rows.map((r) => publicProfile(r.profile)) });
  }

  // GET /api/users/:username
  if (parts[0] === "users" && parts.length === 2 && method === "GET") {
    const username = parts[1].toLowerCase();
    const [profile] = await db.select().from(profiles).where(eq(profiles.username, username));
    if (!profile) throw new HttpError(404, "User not found.");
    const me = await currentProfile();
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    return json({
      profile: { ...publicProfile(profile), stats: await profileStats(profile.id) },
      isOwnProfile: me?.id === profile.id,
      ...(await listPosts(me, eq(posts.authorId, profile.id), page, 0)),
    });
  }

  // /api/posts
  if (parts[0] === "posts" && parts.length === 1) {
    if (method === "GET") {
      const me = await currentProfile();
      const q = (url.searchParams.get("q") ?? "").trim();
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const pattern = `%${escapeLike(q)}%`;
      const where = q
        ? or(ilike(posts.content, pattern), ilike(profiles.username, pattern), ilike(profiles.name, pattern))
        : undefined;
      return json(await listPosts(me, where, page, 2));
    }
    if (method === "POST") {
      const me = await requireProfile();
      const form = await req.formData();
      const content = cleanText(form.get("content"), 5000);
      if (!content) throw new HttpError(422, "Write something before posting.");
      const imageKey = await saveImage(form.get("image"), "posts");
      const [post] = await db.insert(posts).values({ authorId: me.id, content, imageKey }).returning();
      return json({ id: post.id }, 201);
    }
  }

  // /api/posts/:id[/like|/comments]
  if (parts[0] === "posts" && parts.length >= 2) {
    const id = parseId(parts[1]);
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) throw new HttpError(404, "Post not found.");

    if (parts.length === 2 && method === "GET") {
      const me = await currentProfile();
      const { posts: [full] } = await listPosts(me, eq(posts.id, id), 1);
      return json({ post: full });
    }

    if (parts.length === 2 && method === "DELETE") {
      const me = await requireProfile();
      if (post.authorId !== me.id) throw new HttpError(403, "You can only delete your own posts.");
      await db.delete(posts).where(eq(posts.id, id));
      await deleteImage(post.imageKey);
      return json({ ok: true });
    }

    if (parts[2] === "like" && method === "POST") {
      const me = await requireProfile();
      const removed = await db
        .delete(likes)
        .where(and(eq(likes.postId, id), eq(likes.userId, me.id)))
        .returning();
      if (removed.length === 0) {
        await db.insert(likes).values({ postId: id, userId: me.id }).onConflictDoNothing();
      }
      const [{ n }] = await db.select({ n: count() }).from(likes).where(eq(likes.postId, id));
      return json({ liked: removed.length === 0, likeCount: n });
    }

    if (parts[2] === "comments" && method === "POST") {
      const me = await requireProfile();
      const body = await req.json().catch(() => ({}));
      const content = cleanText(body.content, 500);
      if (!content) throw new HttpError(422, "Comment cannot be empty.");
      const [comment] = await db.insert(comments).values({ postId: id, authorId: me.id, content }).returning();
      return json({ id: comment.id }, 201);
    }
  }

  // DELETE /api/comments/:id — comment author or post author
  if (parts[0] === "comments" && parts.length === 2 && method === "DELETE") {
    const me = await requireProfile();
    const id = parseId(parts[1]);
    const [row] = await db
      .select({ authorId: comments.authorId, postAuthorId: posts.authorId })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(eq(comments.id, id));
    if (!row) throw new HttpError(404, "Comment not found.");
    if (row.authorId !== me.id && row.postAuthorId !== me.id) {
      throw new HttpError(403, "You do not have permission to delete this comment.");
    }
    await db.delete(comments).where(eq(comments.id, id));
    return json({ ok: true });
  }

  throw new HttpError(404, "Not found.");
}

export default async (req: Request) => {
  try {
    return await handle(req);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof Error && "status" in error && error.status === 403) {
      return json({ error: "Request blocked." }, 403);
    }
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
