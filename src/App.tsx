import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  Flag,
  Heart,
  ImagePlus,
  LockKeyhole,
  UserRound,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api, send } from "./api";
import { DEMO_ONLY } from "./config";
import { InstallDialog, useAppInstall } from "./install";
import {
  Avatar,
  Brand,
  DareArt,
  EmptyState,
  Modal,
  Verified,
} from "./components";
import {
  AuthDialog,
  CommentsDialog,
  DareDialog,
  EditProfileDialog,
  NewPostDialog,
  ProfileDialog,
  ReportDialog,
  VerificationDialog,
} from "./dialogs";
import {
  DaresView,
  MessagesView,
  ProfileView,
  SafetyView,
  SettingsView,
} from "./views";
import type { AppState, Dare, Page, Post, User } from "./types";

export type Dialog =
  | {
      kind:
        | "new-post"
        | "auth"
        | "edit-profile"
        | "verification"
        | "notifications"
        | "people"
        | "install"
        | "demo-info";
    }
  | { kind: "dare"; dare: Dare }
  | { kind: "profile"; user: User }
  | { kind: "report"; user: User; post?: Post }
  | { kind: "comments"; post: Post };
export type AppActions = {
  state: AppState;
  refresh: () => Promise<void>;
  notify: (text: string) => void;
  navigate: (page: Page) => void;
  open: (dialog: Dialog) => void;
  act: (
    operation: () => Promise<unknown>,
    success?: string,
  ) => Promise<boolean>;
};
const nav = [
  { name: "Explore" as Page, label: "Dares", icon: Zap },
  { name: "Community" as Page, label: "Feed", icon: Compass },
  { name: "Messages" as Page, label: "Chats", icon: MessageCircle },
  { name: "My profile" as Page, label: "Profile", icon: UserRound },
];
const pagePaths: Record<Page, string> = {
  Explore: "dares",
  "My dares": "dares",
  Community: "feed",
  Messages: "chats",
  "My profile": "profile",
  Settings: "settings",
  "Safety center": "safety",
};
function pageFromHash(): Page {
  return (
    (Object.entries(pagePaths).find(
      ([, path]) => path === window.location.hash.slice(1),
    )?.[0] as Page) || "Explore"
  );
}
let bootPromise: Promise<AppState> | undefined;
function boot() {
  return (bootPromise ||= send("/demo").then(() => api<AppState>("/state")));
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [feedTab, setFeedTab] = useState("For you");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const install = useAppInstall();
  useEffect(() => {
    const restorePage = () => {
      setPage(pageFromHash());
      setDialog(null);
      setSearch("");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", restorePage);
    return () => window.removeEventListener("hashchange", restorePage);
  }, []);
  useEffect(() => {
    let mounted = true;
    boot()
      .then((s) => {
        if (mounted) setState(s);
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    setState(await api<AppState>("/state"));
  }, []);
  const notify = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4800);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (!state) return;
    const timer = setInterval(() => refresh().catch(() => {}), 20000);
    return () => clearInterval(timer);
  }, [state?.user.id, refresh]);
  useEffect(() => {
    if (!state) return;
    try {
      setSaved(
        JSON.parse(
          localStorage.getItem(`dareme-saved-${state.user.id}`) || "[]",
        ),
      );
    } catch {
      setSaved([]);
    }
  }, [state?.user.id]);
  const close = useCallback(() => setDialog(null), []);
  const navigate = (next: Page) => {
    const hash = `#${pagePaths[next]}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setPage(next);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const act = async (operation: () => Promise<unknown>, success?: string) => {
    try {
      await operation();
      await refresh();
      if (success) notify(success);
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    }
  };
  if (!state)
    return (
      <div className="boot-screen">
        <Brand />
        {error ? (
          <>
            <h2>
              {navigator.onLine ? "Let’s try that again." : "You’re offline"}
            </h2>
            <p>
              {navigator.onLine
                ? error
                : "Reconnect to load your account and chats, then try again."}
            </p>
            <button
              className="button primary"
              onClick={() => {
                bootPromise = undefined;
                window.location.reload();
              }}
            >
              Retry connection
            </button>
          </>
        ) : (
          <>
            <span className="loader" />
            <p>Opening Dareme…</p>
          </>
        )}
      </div>
    );
  const actions: AppActions = {
    state,
    refresh,
    notify,
    navigate,
    open: (next) =>
      setDialog(
        DEMO_ONLY && next.kind === "auth" ? { kind: "demo-info" } : next,
      ),
    act,
  };
  const pending =
    state.matches.filter((m) => m.incoming && m.status === "pending").length +
    state.requests.length;
  const active = state.matches.filter((m) => m.status === "active").length;
  const toggleSave = (post: Post) => {
    const next = saved.includes(post.id)
      ? saved.filter((id) => id !== post.id)
      : [...saved, post.id];
    setSaved(next);
    try {
      localStorage.setItem(
        `dareme-saved-${state.user.id}`,
        JSON.stringify(next),
      );
    } catch {
      notify(
        "Browser storage is unavailable. Saved posts will stay in this tab.",
      );
      return;
    }
    notify(
      next.includes(post.id)
        ? "Saved to your collection on this device."
        : "Removed from saved posts.",
    );
  };
  let visiblePosts = state.posts.filter(
    (p) =>
      !search ||
      `${p.caption} ${p.user.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (feedTab === "Following")
    visiblePosts = visiblePosts.filter((p) =>
      state.follows.some(
        (f) => f.following === p.user_id && f.status === "accepted",
      ),
    );
  if (feedTab === "Saved")
    visiblePosts = visiblePosts.filter((p) => saved.includes(p.id));
  const filteredPeople = state.people.filter(
    (u) =>
      (!state.user.verifiedOnly || u.verified) &&
      (!search || u.name.toLowerCase().includes(search.toLowerCase())),
  );
  const openChat = (id: string) => {
    setSelectedChat(id);
    navigate("Messages");
  };
  const logout = async () => {
    try {
      await send("/auth/logout");
      await send("/demo");
      await refresh();
      navigate("Explore");
      notify("Signed out. You’re now in the interactive preview.");
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <button
            className="brand-button"
            aria-label="Dareme home"
            onClick={() => navigate("Explore")}
          >
            <Brand />
          </button>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => setDialog({ kind: "notifications" })}
            >
              <Bell size={23} />
              {pending > 0 && (
                <span className="notification-badge">{pending}</span>
              )}
            </button>
            {page === "My profile" && (
              <button
                className="icon-button"
                aria-label="Settings"
                onClick={() => navigate("Settings")}
              >
                <Settings size={23} />
              </button>
            )}
          </div>
        </header>
        <main id="main-content">
          {state.user.demo && (
            <button
              className="demo-label"
              onClick={() =>
                setDialog({ kind: DEMO_ONLY ? "demo-info" : "auth" })
              }
            >
              Sample account ·{" "}
              {DEMO_ONLY ? "About this demo" : "Create your account"}
              <ChevronRight size={13} />
            </button>
          )}
          <div className="screen-heading">
            <div>
              <p className="screen-kicker">
                {page === "Explore" || page === "My dares"
                  ? "Two dares. Your choice."
                  : page === "Community"
                    ? "Small moments, shared."
                    : page === "Messages"
                      ? "Connections start with two yeses."
                      : page === "Settings"
                        ? "Your privacy and preferences."
                        : "Your space, at your pace."}
              </p>
              <h1>
                {page === "Explore" || page === "My dares"
                  ? "Today’s dares"
                  : page === "Community"
                    ? "Feed"
                    : page === "Messages"
                      ? "Chats"
                      : page === "My profile"
                        ? "Profile"
                        : page === "Settings"
                          ? "Settings"
                          : "Safety & help"}
              </h1>
            </div>
            {(page === "Settings" || page === "Safety center") && (
              <button
                className="button light compact"
                onClick={() => navigate("My profile")}
              >
                Done
              </button>
            )}
            {page === "Community" && (
              <button
                className="icon-button new-post-button"
                aria-label="Create a post"
                onClick={() => setDialog({ kind: "new-post" })}
              >
                <Plus size={24} />
              </button>
            )}
          </div>
          {(page === "Explore" || page === "My dares") && (
            <>
              <section className="simple-intro">
                <span className="intro-icon">
                  <Zap size={23} />
                </span>
                <div>
                  <strong>Try a dare. Meet someone.</strong>
                  <p>Pick one below. Chat when you both say yes.</p>
                </div>
              </section>
              <DaresView {...actions} onChat={openChat} />
              <button
                className="quiet-link"
                onClick={() => navigate("Safety center")}
              >
                <ShieldCheck size={16} />
                You can leave any time. Learn how it works
                <ChevronRight size={14} />
              </button>
            </>
          )}
          {page === "Community" && (
            <>
              <div className="people-strip">
                <button
                  className="people-shortcut"
                  onClick={() => setDialog({ kind: "people" })}
                >
                  <span className="people-discover">
                    <Search size={23} />
                  </span>
                  <span>Find people</span>
                </button>
                {filteredPeople.slice(0, 5).map((user) => (
                  <button
                    className="people-shortcut"
                    key={user.id}
                    onClick={() => setDialog({ kind: "profile", user })}
                  >
                    <Avatar user={user} size="large" />
                    <span>{user.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
              <div className="feed-tabs">
                <div role="tablist" aria-label="Community feed">
                  {["For you", "Following", "Saved"].map((t) => (
                    <button
                      key={t}
                      role="tab"
                      aria-selected={feedTab === t}
                      className={feedTab === t ? "selected" : ""}
                      onClick={() => setFeedTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Feed
                posts={visiblePosts}
                actions={actions}
                saved={saved}
                toggleSave={toggleSave}
                empty={
                  feedTab === "Following"
                    ? {
                        title: "Your feed starts with a follow",
                        description:
                          "Follow someone to see their moments here.",
                        label: "Find people",
                        action: () => setDialog({ kind: "people" }),
                      }
                    : feedTab === "Saved"
                      ? {
                          title: "Nothing saved yet",
                          description:
                            "Tap the bookmark on a post to keep it here.",
                          label: "Browse the feed",
                          action: () => setFeedTab("For you"),
                        }
                      : undefined
                }
              />
            </>
          )}
          {page === "Messages" && (
            <MessagesView
              {...actions}
              selectedId={selectedChat}
              onSelect={setSelectedChat}
            />
          )}
          {page === "My profile" && (
            <>
              <ProfileView
                {...actions}
                saved={saved}
                toggleSave={toggleSave}
                installed={install.installed}
              />
            </>
          )}
          {page === "Settings" && (
            <SettingsView {...actions} onLogout={logout} />
          )}
          {page === "Safety center" && <SafetyView {...actions} />}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Main navigation">
        {nav.map(({ name, label, icon: Icon }) => (
          <button
            key={name}
            aria-label={label}
            aria-current={
              page === name ||
              (name === "Explore" && page === "My dares") ||
              (name === "My profile" &&
                ["Settings", "Safety center"].includes(page))
                ? "page"
                : undefined
            }
            className={
              page === name ||
              (name === "Explore" && page === "My dares") ||
              (name === "My profile" &&
                ["Settings", "Safety center"].includes(page))
                ? "active"
                : ""
            }
            onClick={() => {
              if (name === "Messages") setSelectedChat(null);
              navigate(name);
            }}
          >
            <span className="tab-icon">
              <Icon size={24} strokeWidth={page === name ? 2.3 : 1.7} />
              {name === "Messages" && active > 0 && (
                <span className="nav-dot" />
              )}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {dialog?.kind === "new-post" && (
        <NewPostDialog {...actions} onClose={close} />
      )}
      {dialog?.kind === "install" && (
        <InstallDialog {...install} onClose={close} />
      )}
      {!DEMO_ONLY && dialog?.kind === "auth" && (
        <AuthDialog {...actions} onClose={close} />
      )}
      {dialog?.kind === "demo-info" && (
        <Modal
          title="About this demo"
          eyebrow="NO LOGIN. JUST A LITTLE CURIOSITY."
          onClose={close}
        >
          <p className="dialog-intro">
            Explore the feed, try both dares, open a sample chat, and make the
            profile your own. All people and conversations are fictional.
          </p>
          <div className="subtle-note">
            <ShieldCheck size={19} />
            <p>
              Changes, photos, and sample reports stay in this browser. Nothing
              is sent to a server or another person. Please use sample content,
              not sensitive information.
            </p>
          </div>
          <button className="button primary full" onClick={close}>
            Let me explore <ArrowRight size={16} />
          </button>
          <button
            className="button light full"
            onClick={async () => {
              try {
                await send("/demo/reset");
                setSaved([]);
                try {
                  localStorage.removeItem(`dareme-saved-${state.user.id}`);
                } catch {
                  /* Storage may be unavailable. */
                }
                await refresh();
                navigate("Explore");
                close();
                notify("A fresh little start. The demo has been reset.");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            Reset the demo
          </button>
        </Modal>
      )}
      {dialog?.kind === "dare" && (
        <DareDialog
          {...actions}
          dare={dialog.dare}
          onClose={close}
          onChat={openChat}
        />
      )}
      {dialog?.kind === "profile" && (
        <ProfileDialog
          key={dialog.user.id}
          {...actions}
          user={dialog.user}
          onClose={close}
        />
      )}
      {dialog?.kind === "report" && (
        <ReportDialog
          {...actions}
          user={dialog.user}
          post={dialog.post}
          onClose={close}
        />
      )}
      {dialog?.kind === "comments" && (
        <CommentsDialog {...actions} post={dialog.post} onClose={close} />
      )}
      {dialog?.kind === "edit-profile" && (
        <EditProfileDialog {...actions} onClose={close} />
      )}
      {dialog?.kind === "verification" && (
        <VerificationDialog onClose={close} />
      )}
      {dialog?.kind === "people" && (
        <Modal
          title="Good people, little possibilities."
          eyebrow="MEET THE COMMUNITY"
          onClose={close}
        >
          <p className="dialog-intro">
            Get to know someone at your own pace. Following a private account
            sends a request.
          </p>
          <div className="people-list">
            {filteredPeople.map((u) => (
              <button
                className="person-row"
                key={u.id}
                onClick={() => setDialog({ kind: "profile", user: u })}
              >
                <Avatar user={u} />
                <span>
                  <strong>
                    {u.name}
                    {u.verified && <Verified small />}
                  </strong>
                  <small>
                    {u.private ? "Private profile" : "Public profile"}
                    {u.sample ? " · Fictional preview" : ""}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
          {!filteredPeople.length && (
            <EmptyState
              icon={<Users size={25} />}
              title="A little quiet right now."
            >
              No profiles match your current filters.
            </EmptyState>
          )}
        </Modal>
      )}
      {dialog?.kind === "notifications" && (
        <Modal title="Notifications" eyebrow="STAY IN THE LOOP" onClose={close}>
          <div className="notification-list">
            {state.requests.map((u) => (
              <div key={u.id} className="person-row">
                <Avatar user={u} />
                <span>
                  <strong>{u.name}</strong>
                  <small>Wants to follow your private profile</small>
                </span>
                <button
                  className="button primary compact"
                  onClick={() =>
                    act(
                      () => send(`/requests/${u.id}/accept`),
                      "Follow request accepted.",
                    )
                  }
                >
                  Accept
                </button>
              </div>
            ))}
            {state.matches
              .filter((m) => m.incoming && m.status === "pending")
              .map((m) => (
                <button
                  className="notification-row"
                  key={m.id}
                  onClick={() => {
                    close();
                    navigate("My dares");
                  }}
                >
                  <Zap size={20} />
                  <span>
                    <strong>
                      A little adventure with {m.peer.name.split(" ")[0]}
                    </strong>
                    <small>Read the rules and choose whether to accept.</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              ))}
            {!pending && (
              <EmptyState
                icon={<Bell size={28} />}
                title="You’re all caught up."
              >
                Follow requests and dare invitations will appear here.
              </EmptyState>
            )}
            <div className="subtle-note">
              <ShieldCheck size={17} />
              <p>
                You’re in control. A request never gives someone access until
                you accept.
              </p>
            </div>
          </div>
        </Modal>
      )}
      <div
        className={`toast ${toast ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Check size={17} />
        <span>{toast}</span>
        <button aria-label="Dismiss notification" onClick={() => setToast("")}>
          <X size={15} />
        </button>
      </div>
    </>
  );
}

export function DailyDares({
  state,
  open,
}: AppActions & { onChat: (id: string) => void }) {
  const mine = state.matches.filter(
    (m) => m.day === state.day && m.status !== "left",
  );
  const available = state.dares.filter(
    (d) => !mine.some((m) => m.dare === d.id),
  );
  return (
    <section className="daily-section" id="daily-dares">
      <div className="section-heading">
        <div>
          <h2>
            {available.length === 0
              ? "You’ve tried both dares"
              : mine.length
                ? "More to try"
                : "Choose a dare"}
          </h2>
          <p>Two simple ways to connect today.</p>
        </div>
        <span className="daily-count">
          <Zap size={13} />
          <strong>
            {available.length} / {state.dares.length}
          </strong>{" "}
          available
        </span>
      </div>
      <div className="dare-grid">
        {available.map((d) => {
          return (
            <article className={`dare-card ${d.color}`} key={d.id}>
              <DareArt dare={d} />
              <div className="dare-body">
                <span className="dare-category">{d.category}</span>
                <h3>{d.title}</h3>
                <p>{d.description}</p>
                <div className="dare-meta">
                  <span>
                    <span className="clock-mini" />
                    {d.duration}
                  </span>
                  <span>
                    <Users size={13} />2 people
                  </span>
                  <span className="safe-chip">
                    <ShieldCheck size={12} />
                    Reviewed
                  </span>
                </div>
                <button
                  className="dare-button"
                  onClick={() => open({ kind: "dare", dare: d })}
                >
                  Try this dare <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!available.length && (
        <p className="daily-finished">
          Keep your conversations going in Chats. New dares arrive at{" "}
          {new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(state.resetAt))}
          .
        </p>
      )}
      <div className="daily-footnote">
        <span>
          <span className="tiny-green-dot" />
          Two reviewed dares every day. No pressure to do both.
        </span>
        <span>
          Refreshes at 00:00 UTC <ArrowDown size={12} />
        </span>
      </div>
    </section>
  );
}
export function Feed({
  posts,
  actions,
  saved,
  toggleSave,
  empty,
}: {
  posts: Post[];
  actions: AppActions;
  saved: string[];
  toggleSave: (p: Post) => void;
  empty?: {
    title: string;
    description: string;
    label: string;
    action: () => void;
  };
}) {
  return posts.length ? (
    <div className="feed-grid">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          actions={actions}
          saved={saved.includes(p.id)}
          onSave={() => toggleSave(p)}
        />
      ))}
    </div>
  ) : (
    <EmptyState
      icon={<ImagePlus size={28} />}
      title={empty?.title || "Your first moment starts here"}
    >
      {empty?.description ||
        "Share a photo or a thought. It doesn’t have to be anything big."}
      <button
        className="button light"
        onClick={empty?.action || (() => actions.open({ kind: "new-post" }))}
      >
        <Plus size={16} />
        {empty?.label || "Share a moment"}
      </button>
    </EmptyState>
  );
}
function PostCard({
  post: p,
  actions: { state, open, act, notify },
  saved,
  onSave,
}: {
  post: Post;
  actions: AppActions;
  saved: boolean;
  onSave: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [liking, setLiking] = useState(false);
  const like = async () => {
    if (liking) return;
    setLiking(true);
    await act(() => send(`/posts/${p.id}/like`));
    setLiking(false);
  };
  return (
    <article className="post-card">
      <div className="post-header">
        <button
          className="post-author"
          onClick={() => open({ kind: "profile", user: p.user })}
        >
          <Avatar user={p.user} size="small" />
          <span>
            <strong>
              {p.user.name}
              {p.user.verified && <Verified small />}
            </strong>
            <small>
              {p.user.sample
                ? "Community preview"
                : new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(p.created))}
              <span>·</span>
              {p.user.private ? <LockKeyhole size={10} /> : <Users size={10} />}
            </small>
          </span>
        </button>
        <div className="post-menu-wrap">
          <button
            className="icon-button more-button"
            aria-label={`Options for ${p.user.name}’s post`}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            ···
          </button>
          {menu && (
            <>
              <button
                className="menu-dismiss"
                aria-label="Close post options"
                onClick={() => setMenu(false)}
              />
              <div className="post-menu">
                <button
                  onClick={() => {
                    setMenu(false);
                    open({ kind: "profile", user: p.user });
                  }}
                >
                  <Users size={15} />
                  View profile
                </button>
                {p.user_id === state.user.id ? (
                  <button
                    onClick={async () => {
                      setMenu(false);
                      await act(
                        () => api(`/posts/${p.id}`, { method: "DELETE" }),
                        "Post deleted.",
                      );
                    }}
                  >
                    <X size={15} />
                    Delete post
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMenu(false);
                        open({ kind: "report", user: p.user, post: p });
                      }}
                    >
                      <Flag size={15} />
                      Report this post
                    </button>
                    <button
                      onClick={async () => {
                        setMenu(false);
                        await act(
                          () => send(`/users/${p.user_id}/block`),
                          "Blocked. You won’t see or match with this person.",
                        );
                      }}
                    >
                      <Shield size={15} />
                      Block {p.user.name.split(" ")[0]}
                    </button>
                  </>
                )}
                <button
                  onClick={async () => {
                    setMenu(false);
                    try {
                      await navigator.clipboard.writeText(
                        `${p.user.name}: ${p.caption}`,
                      );
                      notify("Post text copied.");
                    } catch {
                      notify("Copy is unavailable in this browser.");
                    }
                  }}
                >
                  <Bookmark size={15} />
                  Copy post text
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {p.image && (
        <button
          className="post-image-button"
          onClick={() => open({ kind: "comments", post: p })}
          aria-label={`Open post by ${p.user.name}`}
        >
          <img
            className="post-image"
            src={p.image}
            alt={
              p.user.sample
                ? p.id === "sample-post-1"
                  ? "Sunlit clouds drifting over a peaceful mountain forest"
                  : p.id === "sample-post-2"
                    ? "Mountains fading into the mist"
                    : "A small desk with creative objects"
                : "Photo shared by " + p.user.name
            }
            loading="lazy"
          />
          {p.user.sample && (
            <span className="post-dare-label">
              <Zap size={11} />
              {p.id === "sample-post-1"
                ? "The little things"
                : "A little adventure"}
            </span>
          )}
        </button>
      )}
      <div className="post-content">
        <div className="post-actions">
          <button
            aria-label={p.liked ? "Unlike post" : "Like post"}
            aria-pressed={p.liked}
            onClick={like}
            disabled={liking}
            className={p.liked ? "liked" : ""}
          >
            <Heart size={19} fill={p.liked ? "currentColor" : "none"} />
            <span>{p.likes}</span>
          </button>
          <button
            aria-label="View comments"
            onClick={() => open({ kind: "comments", post: p })}
          >
            <MessageCircle size={19} />
            <span>{p.comments || "Say hello"}</span>
          </button>
          <button
            className={`bookmark-button ${saved ? "saved" : ""}`}
            aria-label={saved ? "Unsave post" : "Save post"}
            aria-pressed={saved}
            onClick={onSave}
          >
            <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <p>
          <strong>{p.user.name.split(" ")[0]}</strong> {p.caption}
        </p>
        <button
          className="post-comment-link"
          onClick={() => open({ kind: "comments", post: p })}
        >
          {p.comments
            ? `View ${p.comments} comment${p.comments === 1 ? "" : "s"}`
            : "Leave a little kindness…"}
        </button>
      </div>
    </article>
  );
}
