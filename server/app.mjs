import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { z } from "zod";
import { openDatabase } from "./db.mjs";

export const DARES = [
  {
    id: "little-things",
    title: "The little things",
    category: "A little perspective",
    description:
      "Find something that makes you smile. Share a photo and the story behind it.",
    duration: "10–15 min",
    icon: "camera",
    color: "peach",
    rules: [
      "Choose an object, a view, or a small detail — never a stranger’s face.",
      "No faces, addresses, documents, or identifying details in your photo.",
      "Share only what you’re comfortable with. You can skip or leave anytime.",
    ],
  },
  {
    id: "drawn-together",
    title: "Drawn together",
    category: "A little creativity",
    description:
      "Pick a word together. Make a tiny doodle, then share your masterpieces.",
    duration: "5–10 min",
    icon: "pencil",
    color: "lavender",
    rules: [
      "Keep your word and drawing kind, respectful, and suitable for everyone.",
      "No artistic skills needed — and no pressure to share an image.",
      "Stay in the app. Never share your address, phone number, or private details.",
    ],
  },
];
const day = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  bio: u.bio,
  avatar: u.avatar,
  private: !!u.private,
  verified: !!u.verified,
  verifiedOnly: !!u.verified_only,
  intention: u.intention,
  demo: !!u.demo,
  sample: !!u.sample,
});
const hash = (token) => createHash("sha256").update(token).digest("hex");
const fail = (res, status, message) =>
  res.status(status).json({ error: message });
const textSchema = z.string().trim().min(1).max(1000);
const compatible = (a, b) =>
  (!a.verified_only || b.verified) &&
  (!b.verified_only || a.verified) &&
  (a.intention === b.intention ||
    a.intention === "both" ||
    b.intention === "both");

export function createApp({
  dataDir = resolve(".data"),
  production = false,
  trustProxyHops = 0,
} = {}) {
  z.number().int().min(0).max(3).parse(trustProxyHops);
  mkdirSync(join(dataDir, "uploads"), { recursive: true });
  const db = openDatabase(join(dataDir, "dareme.sqlite"));
  const app = express();
  if (trustProxyHops) app.set("trust proxy", trustProxyHops);
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              "img-src": ["'self'", "blob:", "data:"],
              "script-src": ["'self'"],
              "connect-src": ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 160,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "A little too fast. Please try again in a minute." },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (origin && new URL(origin).host !== req.get("host"))
        return fail(res, 403, "This request must come from the app.");
      if (req.get("sec-fetch-site") === "cross-site")
        return fail(res, 403, "Cross-site requests are not allowed.");
    }
    const raw = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("dareme_session="))
      ?.slice(15);
    if (raw) {
      const session = db
        .prepare("SELECT * FROM sessions WHERE token=? AND expires>?")
        .get(hash(raw), Date.now());
      if (session) {
        req.user = db
          .prepare("SELECT * FROM users WHERE id=?")
          .get(session.user_id);
        req.sessionHash = hash(raw);
      }
    }
    next();
  });
  const getUser = (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id);
  const blocked = (a, b) =>
    !!db
      .prepare(
        "SELECT 1 FROM blocks WHERE (user_id=? AND blocked=?) OR (user_id=? AND blocked=?)",
      )
      .get(a, b, b, a);
  const canSeeUser = (viewer, u) => {
    if (!u || blocked(viewer.id, u.id)) return false;
    if (u.id === viewer.id || u.sample) return true;
    return viewer.demo ? false : !u.demo;
  };
  const canSeePosts = (viewer, u) =>
    canSeeUser(viewer, u) &&
    (!u.private ||
      viewer.id === u.id ||
      !!db
        .prepare(
          "SELECT 1 FROM follows WHERE follower=? AND following=? AND status='accepted'",
        )
        .get(viewer.id, u.id));
  const auth = (req, res, next) =>
    req.user ? next() : fail(res, 401, "Please sign in to continue.");
  const session = (res, id) => {
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      hash(token),
      id,
      Date.now() + 7 * 86400_000,
    );
    res.cookie("dareme_session", token, {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 86400_000,
    });
  };
  const postJson = (p, viewer) => ({
    ...p,
    image: p.image?.startsWith("/images/")
      ? p.image
      : p.image
        ? `/api/media/${p.id}`
        : null,
    user: publicUser(getUser(p.user_id)),
    likes:
      (getUser(p.user_id).sample ? (p.id === "sample-post-1" ? 24 : 18) : 0) +
      db
        .prepare(
          "SELECT u.* FROM likes l JOIN users u ON l.user_id=u.id WHERE l.post_id=?",
        )
        .all(p.id)
        .filter((u) => canSeeUser(viewer, u)).length,
    liked: !!db
      .prepare("SELECT 1 FROM likes WHERE post_id=? AND user_id=?")
      .get(p.id, viewer.id),
    comments: db
      .prepare(
        "SELECT u.* FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=?",
      )
      .all(p.id)
      .filter((u) => canSeeUser(viewer, u)).length,
  });
  const matchJson = (m, viewer) => ({
    ...m,
    peer: publicUser(getUser(m.user_id === viewer.id ? m.peer_id : m.user_id)),
    incoming: m.user_id !== viewer.id,
    dareInfo: DARES.find((d) => d.id === m.dare),
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/demo", (req, res) => {
    if (req.user) return res.json({ user: publicUser(req.user) });
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id,name,bio,private,verified,demo) VALUES (?,?,?,?,?,1)",
    ).run(
      id,
      "Jordan Ellis",
      "A little curious. Here for good people and new experiences.",
      1,
      1,
    );
    session(res, id);
    res.json({ user: publicUser(getUser(id)) });
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 25,
    message: {
      error: "Too many sign-in attempts. Please try again in 15 minutes.",
    },
  });
  app.post("/api/auth/register", authLimit, (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(50),
        email: z
          .email()
          .max(254)
          .transform((s) => s.toLowerCase()),
        password: z.string().min(12).max(128),
        adult: z.literal(true),
        rules: z.literal(true),
      })
      .parse(req.body);
    if (db.prepare("SELECT 1 FROM users WHERE email=?").get(input.email))
      return fail(
        res,
        409,
        "Unable to create this account. Try signing in instead.",
      );
    const salt = randomBytes(16).toString("hex");
    const password = `${salt}:${scryptSync(input.password, salt, 64).toString("hex")}`;
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id,name,email,password) VALUES (?,?,?,?)",
    ).run(id, input.name, input.email, password);
    session(res, id);
    res.status(201).json({ user: publicUser(getUser(id)) });
  });
  app.post("/api/auth/login", authLimit, (req, res) => {
    const input = z
      .object({
        email: z.email().transform((s) => s.toLowerCase()),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    const user = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(input.email);
    const [salt, stored] = user?.password?.split(":") || [
      "invalid-salt",
      "00".repeat(64),
    ];
    const valid = timingSafeEqual(
      Buffer.from(stored, "hex"),
      scryptSync(input.password, salt, 64),
    );
    if (!user || !valid)
      return fail(res, 401, "That email and password don’t match.");
    session(res, user.id);
    res.json({ user: publicUser(user) });
  });
  app.post("/api/auth/logout", auth, (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token=?").run(req.sessionHash);
    res.clearCookie("dareme_session", { path: "/" });
    res.json({ ok: true });
  });
  app.get("/api/state", auth, (req, res) => {
    const viewer = req.user;
    const people = db
      .prepare("SELECT * FROM users WHERE id!=? ORDER BY sample DESC,name")
      .all(viewer.id)
      .filter((u) => canSeeUser(viewer, u));
    const posts = db
      .prepare("SELECT * FROM posts ORDER BY created DESC")
      .all()
      .filter((p) => canSeePosts(viewer, getUser(p.user_id)))
      .map((p) => postJson(p, viewer));
    const matches = db
      .prepare(
        "SELECT * FROM matches WHERE (user_id=? OR peer_id=?) ORDER BY created DESC",
      )
      .all(viewer.id, viewer.id)
      .filter((m) => !blocked(m.user_id, m.peer_id))
      .map((m) => matchJson(m, viewer));
    const requests = db
      .prepare("SELECT * FROM follows WHERE following=? AND status='pending'")
      .all(viewer.id)
      .map((f) => publicUser(getUser(f.follower)))
      .filter((u) => !blocked(viewer.id, u.id));
    const follows = db
      .prepare("SELECT following,status FROM follows WHERE follower=?")
      .all(viewer.id);
    res.json({
      user: publicUser(viewer),
      posts,
      people: people.map(publicUser),
      matches,
      requests,
      follows,
      dares: DARES,
      day: day(),
      resetAt: `${new Date(Date.now() + 86400_000).toISOString().slice(0, 10)}T00:00:00Z`,
      blocks: db
        .prepare("SELECT blocked FROM blocks WHERE user_id=?")
        .all(viewer.id)
        .map((b) => b.blocked),
    });
  });
  app.patch("/api/me", auth, (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(50).optional(),
        bio: z.string().trim().max(240).optional(),
        private: z.boolean().optional(),
        verifiedOnly: z.boolean().optional(),
        intention: z.enum(["friends", "dating", "both"]).optional(),
      })
      .strict()
      .parse(req.body);
    const keys = {
      name: "name",
      bio: "bio",
      private: "private",
      verifiedOnly: "verified_only",
      intention: "intention",
    };
    for (const [k, v] of Object.entries(input))
      db.prepare(`UPDATE users SET ${keys[k]}=? WHERE id=?`).run(
        typeof v === "boolean" ? Number(v) : v,
        req.user.id,
      );
    res.json({ user: publicUser(getUser(req.user.id)) });
  });
  app.get("/api/users/:id", auth, (req, res) => {
    const u = getUser(req.params.id);
    if (!canSeeUser(req.user, u)) return fail(res, 404, "Profile not found.");
    const visible = canSeePosts(req.user, u);
    res.json({
      user: publicUser(u),
      canSeePosts: visible,
      posts: visible
        ? db
            .prepare(
              "SELECT * FROM posts WHERE user_id=? ORDER BY created DESC",
            )
            .all(u.id)
            .map((p) => postJson(p, req.user))
        : [],
    });
  });
  app.post("/api/users/:id/follow", auth, (req, res) => {
    const u = getUser(req.params.id);
    if (!u || u.id === req.user.id || !canSeeUser(req.user, u))
      return fail(res, 404, "Profile not found.");
    const old = db
      .prepare("SELECT 1 FROM follows WHERE follower=? AND following=?")
      .get(req.user.id, u.id);
    if (old)
      db.prepare("DELETE FROM follows WHERE follower=? AND following=?").run(
        req.user.id,
        u.id,
      );
    else
      db.prepare("INSERT INTO follows VALUES (?,?,?)").run(
        req.user.id,
        u.id,
        u.private ? "pending" : "accepted",
      );
    res.json({ ok: true });
  });
  app.post("/api/requests/:id/accept", auth, (req, res) => {
    if (blocked(req.user.id, req.params.id))
      return fail(res, 404, "Request not found.");
    db.prepare(
      "UPDATE follows SET status='accepted' WHERE follower=? AND following=?",
    ).run(req.params.id, req.user.id);
    res.json({ ok: true });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
    fileFilter: (_req, file, cb) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
        ? cb(null, true)
        : cb(
            Object.assign(new Error("Unsupported image type"), { status: 400 }),
          ),
  });
  app.post(
    "/api/posts",
    auth,
    upload.single("image"),
    async (req, res, next) => {
      let image;
      try {
        const caption = z
          .string()
          .trim()
          .min(1)
          .max(1500)
          .parse(req.body.caption);
        if (req.file) {
          image = `${randomUUID()}.webp`;
          await sharp(req.file.buffer, {
            limitInputPixels: 24_000_000,
            animated: false,
          })
            .rotate()
            .resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 84 })
            .toFile(join(dataDir, "uploads", image));
        }
        const id = randomUUID();
        db.prepare("INSERT INTO posts VALUES (?,?,?,?,?)").run(
          id,
          req.user.id,
          caption,
          image || null,
          now(),
        );
        res.status(201).json({
          post: postJson(
            db.prepare("SELECT * FROM posts WHERE id=?").get(id),
            req.user,
          ),
        });
      } catch (e) {
        if (image)
          await unlink(join(dataDir, "uploads", image)).catch(() => {});
        next(e);
      }
    },
  );
  app.get("/api/media/:id", auth, async (req, res) => {
    const post = db
      .prepare("SELECT * FROM posts WHERE id=?")
      .get(req.params.id);
    if (
      !post?.image ||
      post.image.startsWith("/") ||
      !canSeePosts(req.user, getUser(post.user_id))
    )
      return fail(res, 404, "Image not found.");
    try {
      res
        .type("webp")
        .send(await readFile(join(dataDir, "uploads", post.image)));
    } catch {
      fail(res, 404, "Image not found.");
    }
  });
  app.delete("/api/posts/:id", auth, async (req, res) => {
    const p = db
      .prepare("SELECT * FROM posts WHERE id=? AND user_id=?")
      .get(req.params.id, req.user.id);
    if (!p) return fail(res, 404, "Post not found.");
    db.prepare("DELETE FROM likes WHERE post_id=?").run(p.id);
    db.prepare("DELETE FROM comments WHERE post_id=?").run(p.id);
    db.prepare("DELETE FROM posts WHERE id=?").run(p.id);
    if (p.image && !p.image.startsWith("/"))
      await unlink(join(dataDir, "uploads", p.image)).catch(() => {});
    res.json({ ok: true });
  });
  const visiblePost = (req, res, next) => {
    req.post = db.prepare("SELECT * FROM posts WHERE id=?").get(req.params.id);
    if (!req.post || !canSeePosts(req.user, getUser(req.post.user_id)))
      return fail(res, 404, "Post not found.");
    next();
  };
  app.post("/api/posts/:id/like", auth, visiblePost, (req, res) => {
    const liked = db
      .prepare("SELECT 1 FROM likes WHERE post_id=? AND user_id=?")
      .get(req.post.id, req.user.id);
    if (liked)
      db.prepare("DELETE FROM likes WHERE post_id=? AND user_id=?").run(
        req.post.id,
        req.user.id,
      );
    else
      db.prepare("INSERT INTO likes VALUES (?,?)").run(
        req.post.id,
        req.user.id,
      );
    res.json({ ok: true });
  });
  app.get("/api/posts/:id/comments", auth, visiblePost, (req, res) =>
    res.json({
      comments: db
        .prepare("SELECT * FROM comments WHERE post_id=? ORDER BY created")
        .all(req.post.id)
        .map((c) => ({ ...c, user: publicUser(getUser(c.user_id)) }))
        .filter((c) => canSeeUser(req.user, getUser(c.user_id))),
    }),
  );
  app.post("/api/posts/:id/comments", auth, visiblePost, (req, res) => {
    const { text } = z.object({ text: textSchema }).parse(req.body);
    db.prepare("INSERT INTO comments VALUES (?,?,?,?,?)").run(
      randomUUID(),
      req.post.id,
      req.user.id,
      text,
      now(),
    );
    res.status(201).json({ ok: true });
  });
  app.post("/api/dares/:id/accept", auth, (req, res) => {
    const dare = DARES.find((d) => d.id === req.params.id);
    const { consent } = z.object({ consent: z.literal(true) }).parse(req.body);
    if (!dare || !consent)
      return fail(res, 400, "Choose one of today’s two reviewed dares.");
    const existing = db
      .prepare("SELECT * FROM matches WHERE user_id=? AND day=? AND dare=?")
      .get(req.user.id, day(), dare.id);
    if (existing && existing.status !== "left")
      return fail(res, 409, "You’ve already accepted this dare today.");
    const incoming = db
      .prepare(
        "SELECT * FROM matches WHERE peer_id=? AND day=? AND dare=? AND status!='left'",
      )
      .get(req.user.id, day(), dare.id);
    if (incoming)
      return fail(res, 409, "You already have this dare in My dares.");
    // A real connection requires two independently consenting accounts. Sample partners exist only in preview.
    const candidates = db
      .prepare(
        "SELECT * FROM users WHERE id!=? AND demo=? AND sample=? ORDER BY name",
      )
      .all(req.user.id, req.user.demo ? 1 : 0, req.user.demo ? 1 : 0);
    const peer = candidates.find(
      (u) =>
        !blocked(req.user.id, u.id) &&
        (!req.user.verified_only || u.verified) &&
        (!u.verified_only || req.user.verified) &&
        (u.intention === req.user.intention ||
          u.intention === "both" ||
          req.user.intention === "both") &&
        (req.user.demo ||
          !db
            .prepare(
              "SELECT 1 FROM matches WHERE day=? AND dare=? AND (user_id=? OR peer_id=?) AND status!='left'",
            )
            .get(day(), dare.id, u.id, u.id)),
    );
    if (!peer)
      return fail(
        res,
        409,
        "No compatible people are available right now. Try later, or review your matching preferences.",
      );
    if (existing)
      db.prepare("DELETE FROM messages WHERE match_id=?").run(existing.id);
    const id = existing?.id || randomUUID();
    db.prepare(
      "INSERT INTO matches VALUES (?,?,?,?,?,'pending',?) ON CONFLICT(user_id,day,dare) DO UPDATE SET peer_id=excluded.peer_id,status='pending',created=excluded.created",
    ).run(id, req.user.id, peer.id, dare.id, day(), now());
    res.status(201).json({
      match: matchJson(
        db.prepare("SELECT * FROM matches WHERE id=?").get(id),
        req.user,
      ),
    });
  });
  const ownMatch = (req, res, next) => {
    const m = db
      .prepare("SELECT * FROM matches WHERE id=? AND (user_id=? OR peer_id=?)")
      .get(req.params.id, req.user.id, req.user.id);
    if (!m || blocked(m.user_id, m.peer_id))
      return fail(res, 404, "Connection not found.");
    req.match = m;
    next();
  };
  app.post("/api/matches/:id/accept", auth, ownMatch, (req, res) => {
    z.object({ consent: z.literal(true) }).parse(req.body);
    if (req.match.peer_id !== req.user.id || req.match.status !== "pending")
      return fail(res, 403, "Only your partner can accept this request.");
    if (!compatible(req.user, getUser(req.match.user_id)))
      return fail(
        res,
        409,
        "This invitation no longer matches your connection preferences. You can leave it and try another dare.",
      );
    db.prepare("UPDATE matches SET status='active' WHERE id=?").run(
      req.match.id,
    );
    res.json({ ok: true });
  });
  app.post("/api/matches/:id/preview-accept", auth, ownMatch, (req, res) => {
    if (
      !req.user.demo ||
      !getUser(req.match.peer_id).sample ||
      req.match.user_id !== req.user.id ||
      req.match.status !== "pending"
    )
      return fail(
        res,
        403,
        "Sample acceptance is available only in preview mode.",
      );
    db.prepare("UPDATE matches SET status='active' WHERE id=?").run(
      req.match.id,
    );
    db.prepare("INSERT INTO messages VALUES (?,?,?,?,?)").run(
      randomUUID(),
      req.match.id,
      req.match.peer_id,
      "Hi! This is a sample conversation. What’s one little thing that made you smile today?",
      now(),
    );
    res.json({ ok: true });
  });
  app.post("/api/matches/:id/leave", auth, ownMatch, (req, res) => {
    db.prepare("UPDATE matches SET status='left' WHERE id=?").run(req.match.id);
    res.json({ ok: true });
  });
  app.post("/api/matches/:id/complete", auth, ownMatch, (req, res) => {
    if (req.match.status !== "active")
      return fail(res, 409, "This dare isn’t active.");
    db.prepare("UPDATE matches SET status='completed' WHERE id=?").run(
      req.match.id,
    );
    res.json({ ok: true });
  });
  app.get("/api/matches/:id/messages", auth, ownMatch, (req, res) => {
    if (!["active", "completed"].includes(req.match.status))
      return fail(res, 403, "Chat opens only when both people accept.");
    res.json({
      messages: db
        .prepare("SELECT * FROM messages WHERE match_id=? ORDER BY created")
        .all(req.match.id),
    });
  });
  app.post("/api/matches/:id/messages", auth, ownMatch, (req, res) => {
    if (req.match.status !== "active")
      return fail(
        res,
        403,
        "Chat opens only for an active, mutually accepted dare.",
      );
    const { text } = z.object({ text: textSchema }).parse(req.body);
    db.prepare("INSERT INTO messages VALUES (?,?,?,?,?)").run(
      randomUUID(),
      req.match.id,
      req.user.id,
      text,
      now(),
    );
    res.status(201).json({ ok: true });
  });
  app.post("/api/reports", auth, (req, res) => {
    const input = z
      .object({
        targetId: z.string().min(1).max(100),
        reason: z.enum([
          "Harassment or bullying",
          "Unsafe or harmful content",
          "Unwanted sexual content",
          "Fake profile or underage user",
          "Something else",
        ]),
        detail: z.string().trim().max(1000).default(""),
      })
      .parse(req.body);
    const id = randomUUID();
    db.prepare("INSERT INTO reports VALUES (?,?,?,?,?,?)").run(
      id,
      req.user.id,
      input.targetId,
      input.reason,
      input.detail,
      now(),
    );
    res.status(201).json({
      id,
      message:
        "Report saved. This prototype does not have a staffed moderation team. Block the person to stop contact.",
    });
  });
  app.post("/api/users/:id/block", auth, (req, res) => {
    if (
      !canSeeUser(req.user, getUser(req.params.id)) ||
      req.params.id === req.user.id
    )
      return fail(res, 404, "Profile not found.");
    db.prepare("INSERT OR IGNORE INTO blocks VALUES (?,?)").run(
      req.user.id,
      req.params.id,
    );
    db.prepare(
      "DELETE FROM follows WHERE (follower=? AND following=?) OR (follower=? AND following=?)",
    ).run(req.user.id, req.params.id, req.params.id, req.user.id);
    db.prepare(
      "UPDATE matches SET status='left' WHERE (user_id=? AND peer_id=?) OR (user_id=? AND peer_id=?)",
    ).run(req.user.id, req.params.id, req.params.id, req.user.id);
    res.json({ ok: true });
  });
  app.use("/api", (_req, res) => fail(res, 404, "Not found."));
  if (production) {
    app.use(express.static(resolve("dist")));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve("dist/index.html")),
    );
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return fail(
        res,
        400,
        error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(". "),
      );
    if (error instanceof multer.MulterError)
      return fail(
        res,
        400,
        error.code === "LIMIT_FILE_SIZE"
          ? "Choose an image smaller than 5 MB."
          : "Upload one JPEG, PNG, or WebP image.",
      );
    if (error.status === 400)
      return fail(res, 400, "That request could not be read.");
    if (/Input buffer|pixel limit|unsupported image/i.test(error.message))
      return fail(
        res,
        400,
        "This image could not be processed. Try a smaller JPEG, PNG, or WebP.",
      );
    console.error("Request failed:", error.message);
    fail(res, 500, "Something went wrong. Please try again.");
  });
  return { app, db };
}
