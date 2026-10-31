import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function openDatabase(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, password TEXT,
      bio TEXT NOT NULL DEFAULT '', avatar TEXT NOT NULL DEFAULT '',
      private INTEGER NOT NULL DEFAULT 1, verified INTEGER NOT NULL DEFAULT 0,
      verified_only INTEGER NOT NULL DEFAULT 1, intention TEXT NOT NULL DEFAULT 'friends',
      demo INTEGER NOT NULL DEFAULT 0, sample INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), caption TEXT NOT NULL, image TEXT, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS likes (post_id TEXT REFERENCES posts(id), user_id TEXT REFERENCES users(id), PRIMARY KEY(post_id, user_id));
    CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT REFERENCES posts(id), user_id TEXT REFERENCES users(id), text TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS follows (follower TEXT REFERENCES users(id), following TEXT REFERENCES users(id), status TEXT NOT NULL, PRIMARY KEY(follower,following));
    CREATE TABLE IF NOT EXISTS blocks (user_id TEXT REFERENCES users(id), blocked TEXT REFERENCES users(id), PRIMARY KEY(user_id,blocked));
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), peer_id TEXT REFERENCES users(id),
      dare TEXT NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created TEXT NOT NULL,
      UNIQUE(user_id,day,dare)
    );
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, match_id TEXT REFERENCES matches(id), user_id TEXT REFERENCES users(id), text TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), target_id TEXT NOT NULL, reason TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL);
  `);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO users (id,name,bio,avatar,private,verified,intention,demo,sample) VALUES (?,?,?,?,?,?,?,?,1)",
  );
  insert.run(
    "sample-jamie",
    "Jamie Chen",
    "Finding joy in the little things. Coffee, creativity & a good conversation.",
    "/images/avatar-jamie.jpg",
    0,
    1,
    "friends",
    1,
  );
  insert.run(
    "sample-alex",
    "Alex Morgan",
    "Usually taking the scenic route. Here for new friends and little adventures.",
    "/images/avatar-alex.jpg",
    0,
    1,
    "both",
    1,
  );
  insert.run(
    "sample-sophie",
    "Sophie Taylor",
    "A sketchbook, a playlist, and a little curiosity.",
    "/images/avatar-sophie.jpg",
    1,
    1,
    "both",
    1,
  );
  insert.run(
    "sample-riley",
    "Riley Park",
    "Collecting small moments and trying something new.",
    "",
    0,
    0,
    "friends",
    1,
  );
  const post = db.prepare(
    "INSERT OR IGNORE INTO posts (id,user_id,caption,image,created) VALUES (?,?,?,?,?)",
  );
  post.run(
    "sample-post-1",
    "sample-jamie",
    "Today’s little win: looking up instead of looking down. A little fresh air goes a long way. 🌿",
    "/images/forest.jpg",
    "2026-10-31T09:35:00.000Z",
  );
  post.run(
    "sample-post-2",
    "sample-alex",
    "Somewhere between getting lost and finding a new favorite view. Your sign to take the scenic route. ☁️",
    "/images/mountains.jpg",
    "2026-10-31T08:20:00.000Z",
  );
  post.run(
    "sample-post-3",
    "sample-riley",
    "Made a little space for creativity today. What’s one thing you made just for fun?",
    "/images/creative.jpg",
    "2026-10-31T07:10:00.000Z",
  );
  return db;
}
