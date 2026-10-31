import seed from "./demo-seed.json";
import type { AppState, Comment, Message, Post, User } from "./types";

const STORAGE_KEY = "dareme-static-demo-v1";
const day = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const asset = (path: string) =>
  path.startsWith("/") ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path;
type DemoStore = {
  version: 1;
  state: AppState;
  comments: Record<string, Comment[]>;
  messages: Record<string, Message[]>;
  reports: { id: string; targetId: string; reason: string }[];
};
let memory: DemoStore | undefined;
function initial(): DemoStore {
  const people = seed.people.map((u) => ({
    ...u,
    avatar: asset(u.avatar),
  })) as User[];
  const user: User = {
    id: "demo-you",
    name: "Jordan Ellis",
    bio: "A little curious. Here for good people and new experiences.",
    avatar: "",
    private: true,
    verified: true,
    verifiedOnly: true,
    intention: "friends",
    demo: true,
    sample: false,
  };
  return {
    version: 1,
    state: {
      user,
      people,
      posts: seed.posts.map((p) => ({
        ...p,
        image: asset(p.image),
        user: people.find((u) => u.id === p.user_id)!,
      })),
      matches: [],
      requests: [],
      follows: [],
      blocks: [],
      dares: seed.dares,
      day: day(),
      resetAt: `${new Date(Date.now() + 86400_000).toISOString().slice(0, 10)}T00:00:00Z`,
    },
    comments: {},
    messages: {},
    reports: [],
  };
}
function load(): DemoStore {
  if (memory) return structuredClone(memory);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as DemoStore;
      if (
        data.version === 1 &&
        data.state.user.id === "demo-you" &&
        Array.isArray(data.state.posts)
      )
        return data;
    }
  } catch {
    /* Storage may be disabled. The demo still works in memory. */
  }
  return structuredClone(memory || initial());
}
function save(data: DemoStore) {
  memory = structuredClone(data);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* Keep the current tab usable when storage is unavailable or full. */
  }
}
async function demoImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose an image smaller than 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This photo could not be read. Try another image.");
  }
  try {
    if (bitmap.width * bitmap.height > 24_000_000)
      throw new Error("Choose a smaller photo for the demo.");
    const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Photo previews are unavailable in this browser.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.72);
  } finally {
    bitmap.close();
  }
}
export async function demoApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const store = load();
  const state = store.state;
  state.day = day();
  state.resetAt = `${new Date(Date.now() + 86400_000).toISOString().slice(0, 10)}T00:00:00Z`;
  const method = options?.method || "GET";
  const data =
    typeof options?.body === "string" ? JSON.parse(options.body) : {};
  const parts = path.split("/").filter(Boolean);
  const person = (key: string) =>
    key === state.user.id ? state.user : state.people.find((u) => u.id === key);
  const allowedPerson = (key: string) => {
    const u = person(key);
    if (!u || state.blocks.includes(key)) throw new Error("Profile not found.");
    return u;
  };
  const canView = (u: User) =>
    u.id === state.user.id ||
    !u.private ||
    state.follows.some((f) => f.following === u.id && f.status === "accepted");
  const post = () => {
    const p = state.posts.find((p) => p.id === parts[1]);
    if (!p || !canView(allowedPerson(p.user_id)))
      throw new Error("Post not found.");
    return p;
  };
  const match = () => {
    const m = state.matches.find((m) => m.id === parts[1]);
    if (!m || state.blocks.includes(m.peer.id))
      throw new Error("Connection not found.");
    return m;
  };
  const text = (value: unknown, max = 1000) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max)
      throw new Error(`Please enter 1–${max} characters.`);
    return value.trim();
  };
  let result: unknown = { ok: true };
  if (path === "/demo/reset") {
    const fresh = initial();
    save(fresh);
    try {
      localStorage.removeItem("dareme-saved-demo-you");
    } catch {
      /* Optional device collection. */
    }
    return structuredClone({ user: fresh.state.user }) as T;
  } else if (path === "/demo") result = { user: state.user };
  else if (path === "/state")
    result = {
      ...state,
      people: state.people.filter((u) => !state.blocks.includes(u.id)),
      posts: state.posts.filter(
        (p) => !state.blocks.includes(p.user_id) && canView(p.user),
      ),
    };
  else if (path === "/me" && method === "PATCH") {
    if (data.name !== undefined) state.user.name = text(data.name, 50);
    if (data.bio !== undefined) state.user.bio = String(data.bio).slice(0, 240);
    if (typeof data.private === "boolean") state.user.private = data.private;
    if (typeof data.verifiedOnly === "boolean")
      state.user.verifiedOnly = data.verifiedOnly;
    if (["friends", "dating", "both"].includes(data.intention))
      state.user.intention = data.intention;
    state.posts.forEach((p) => {
      if (p.user_id === state.user.id) p.user = { ...state.user };
    });
    result = { user: state.user };
  } else if (parts[0] === "users" && parts.length === 2) {
    const u = allowedPerson(parts[1]);
    result = {
      user: u,
      canSeePosts: canView(u),
      posts: canView(u) ? state.posts.filter((p) => p.user_id === u.id) : [],
    };
  } else if (parts[0] === "users" && parts[2] === "follow") {
    const u = allowedPerson(parts[1]);
    const old = state.follows.find((f) => f.following === u.id);
    if (old) state.follows = state.follows.filter((f) => f !== old);
    else
      state.follows.push({
        following: u.id,
        status: u.private ? "pending" : "accepted",
      });
  } else if (parts[0] === "users" && parts[2] === "block") {
    const u = allowedPerson(parts[1]);
    state.blocks.push(u.id);
    state.follows = state.follows.filter((f) => f.following !== u.id);
    state.matches.forEach((m) => {
      if (m.peer.id === u.id) m.status = "left";
    });
  } else if (path === "/posts" && method === "POST") {
    const form = options?.body;
    if (!(form instanceof FormData))
      throw new Error("Add a caption to your demo post.");
    const caption = text(form.get("caption"), 1500);
    const file = form.get("image");
    const image = file instanceof File ? await demoImage(file) : null;
    const p: Post = {
      id: id(),
      user_id: state.user.id,
      caption,
      image,
      created: now(),
      user: { ...state.user },
      likes: 0,
      liked: false,
      comments: 0,
    };
    state.posts.unshift(p);
    result = { post: p };
  } else if (
    parts[0] === "posts" &&
    parts.length === 2 &&
    method === "DELETE"
  ) {
    const p = post();
    if (p.user_id !== state.user.id)
      throw new Error("Only your own demo posts can be removed.");
    state.posts = state.posts.filter((q) => q.id !== p.id);
    delete store.comments[p.id];
  } else if (parts[0] === "posts" && parts[2] === "like") {
    const p = post();
    p.liked = !p.liked;
    p.likes += p.liked ? 1 : -1;
  } else if (parts[0] === "posts" && parts[2] === "comments") {
    const p = post();
    if (method === "POST") {
      const comment: Comment = {
        id: id(),
        text: text(data.text),
        user: { ...state.user },
        created: now(),
      };
      (store.comments[p.id] ||= []).push(comment);
      p.comments = store.comments[p.id].length;
    }
    result = {
      comments: (store.comments[p.id] || []).filter(
        (c) => !state.blocks.includes(c.user.id),
      ),
    };
  } else if (parts[0] === "dares" && parts[2] === "accept") {
    const dare = state.dares.find((d) => d.id === parts[1]);
    if (!dare || data.consent !== true)
      throw new Error("Read and accept this dare’s rules first.");
    let m = state.matches.find((m) => m.day === day() && m.dare === dare.id);
    if (m && m.status !== "left")
      throw new Error("You’ve already accepted this dare today.");
    const peer = state.people.find(
      (u) =>
        !state.blocks.includes(u.id) &&
        (!state.user.verifiedOnly || u.verified) &&
        (u.intention === state.user.intention ||
          u.intention === "both" ||
          state.user.intention === "both"),
    );
    if (!peer)
      throw new Error(
        "No sample people match this filter. Reset the demo or update your preferences.",
      );
    if (m) {
      m.peer = peer;
      m.status = "pending";
      store.messages[m.id] = [];
    } else {
      m = {
        id: id(),
        user_id: state.user.id,
        peer_id: peer.id,
        dare: dare.id,
        day: day(),
        status: "pending",
        peer,
        incoming: false,
        dareInfo: dare,
      };
      state.matches.unshift(m);
    }
    result = { match: m };
  } else if (parts[0] === "matches") {
    const m = match();
    if (parts[2] === "preview-accept") {
      if (m.status !== "pending")
        throw new Error("This sample invitation isn’t waiting for acceptance.");
      m.status = "active";
      store.messages[m.id] = [
        {
          id: id(),
          user_id: m.peer.id,
          text: "Hi! This is a sample conversation. What’s one little thing that made you smile today?",
          created: now(),
        },
      ];
    } else if (parts[2] === "leave") m.status = "left";
    else if (parts[2] === "complete") {
      if (m.status !== "active") throw new Error("This dare isn’t active.");
      m.status = "completed";
    } else if (parts[2] === "messages") {
      if (!["active", "completed"].includes(m.status))
        throw new Error("Chat opens after sample acceptance.");
      if (method === "POST") {
        if (m.status !== "active")
          throw new Error("This completed sample chat is read-only.");
        (store.messages[m.id] ||= []).push({
          id: id(),
          user_id: state.user.id,
          text: text(data.text),
          created: now(),
        });
      }
      result = { messages: store.messages[m.id] || [] };
    } else throw new Error("That demo action isn’t available.");
  } else if (path === "/reports") {
    const report = {
      id: id(),
      targetId: text(data.targetId),
      reason: text(data.reason),
    };
    store.reports.push(report);
    result = report;
  } else if (parts[0] === "auth")
    throw new Error("No login is needed. This is a local interactive demo.");
  else throw new Error("That demo action isn’t available.");
  save(store);
  return structuredClone(result) as T;
}
