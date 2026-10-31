import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Flag,
  Heart,
  ImagePlus,
  LockKeyhole,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api, send } from "./api";
import {
  Avatar,
  Brand,
  DareArt,
  EmptyState,
  HeroArt,
  Modal,
  Toggle,
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
        | "people";
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
  { name: "Explore" as Page, icon: Compass },
  { name: "My dares" as Page, icon: Zap },
  { name: "Messages" as Page, icon: MessageCircle },
  { name: "Community" as Page, icon: Users },
];
const secondary = [
  { name: "My profile" as Page, icon: Users },
  { name: "Settings" as Page, icon: Settings },
  { name: "Safety center" as Page, icon: ShieldCheck },
];
let bootPromise: Promise<AppState> | undefined;
function boot() {
  return (bootPromise ||= send("/demo").then(() => api<AppState>("/state")));
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<Page>("Explore");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [feedTab, setFeedTab] = useState("For you");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
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
    setPage(next);
    setSearch("");
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            <h2>Let’s try that again.</h2>
            <p>{error}</p>
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
            <p>Making room for something good…</p>
          </>
        )}
      </div>
    );
  const actions: AppActions = {
    state,
    refresh,
    notify,
    navigate,
    open: setDialog,
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
    localStorage.setItem(`dareme-saved-${state.user.id}`, JSON.stringify(next));
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
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <button
          className="brand-button"
          aria-label="Dareme home"
          onClick={() => navigate("Explore")}
        >
          <Brand />
        </button>
        <p className="brand-tagline">Good things start with a little dare.</p>
        <nav className="main-nav" aria-label="Main navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              aria-current={page === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={20} />
              <span>{name}</span>
              {name === "My dares" && <span className="nav-count">2</span>}
              {name === "Messages" && active > 0 && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <span className="nav-section-label">YOUR SPACE</span>
        <nav className="secondary-nav" aria-label="Your account">
          {secondary.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              aria-current={page === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Safety center" && <span className="tiny-green-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="sidebar-note"
            onClick={() => navigate("Safety center")}
          >
            <span className="sidebar-note-icon">
              <ShieldCheck size={21} />
            </span>
            <strong>A safer kind of social.</strong>
            <span>
              Your comfort comes first.
              <br />
              We’re here to keep it that way.
            </span>
            <span className="text-link">
              Our safety promise <ArrowUpRight size={14} />
            </span>
          </button>
          <button
            className="account-card"
            onClick={() => navigate("My profile")}
          >
            <Avatar user={state.user} />
            <span>
              <strong>{state.user.name}</strong>
              <small>
                {state.user.private ? (
                  <>
                    <LockKeyhole size={11} />
                    Private profile
                  </>
                ) : (
                  "Public profile"
                )}
              </small>
            </span>
            <ChevronDown size={16} />
          </button>
          <div className="sidebar-footer">
            A little courage. A real connection.
            <span>© {new Date().getFullYear()} Dareme</span>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Your space <ChevronRight size={14} />
              <strong>{page}</strong>
            </span>
          </div>
          <div className="topbar-tools">
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="Search community"
                placeholder="Find a little inspiration..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (page !== "Explore" && page !== "Community")
                    setPage("Community");
                }}
              />
              {search && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={14} />
                </button>
              )}
              <span className="search-shortcut">⌕</span>
            </div>
            <button
              className="icon-button notification-button"
              aria-label={`Notifications${pending ? `, ${pending} unread` : ""}`}
              onClick={() => setDialog({ kind: "notifications" })}
            >
              <Bell size={20} />
              {pending > 0 && (
                <span className="notification-badge">{pending}</span>
              )}
            </button>
            <span className="toolbar-divider" />
            <button
              className="button primary create-button"
              onClick={() => setDialog({ kind: "new-post" })}
            >
              <Plus size={17} />
              <span>Create a post</span>
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="tiny-green-dot" />
                {page === "Explore"
                  ? "A NEW DAY, A LITTLE POSSIBILITY"
                  : page === "Community"
                    ? "LITTLE MOMENTS, SHARED"
                    : page === "My dares"
                      ? "SMALL STEPS, GOOD STORIES"
                      : page === "Safety center"
                        ? "YOUR COMFORT COMES FIRST"
                        : "MAKE YOURSELF AT HOME"}
              </div>
              <h1>
                {page === "Explore" ? (
                  <>
                    Hello, {state.user.name.split(" ")[0]}{" "}
                    <span className="greeting-spark">✺</span>
                  </>
                ) : page === "Community" ? (
                  "Life’s better when shared."
                ) : page === "My dares" ? (
                  "Your little adventures."
                ) : page === "My profile" ? (
                  "Your corner of the world."
                ) : page === "Messages" ? (
                  "A conversation starts here."
                ) : page === "Settings" ? (
                  "Just the way you like it."
                ) : (
                  "A safer space, together."
                )}
              </h1>
              <p>
                {page === "Explore"
                  ? "Meet someone new. Try something different. Be a little more you."
                  : page === "Community"
                    ? "Real moments and little wins from the Dareme community."
                    : page === "My dares"
                      ? "Two thoughtful dares each day. Always on your terms."
                      : page === "Messages"
                        ? "Good connections happen at your own pace."
                        : page === "My profile"
                          ? "Share a little about you. Keep the rest yours."
                          : page === "Settings"
                            ? "Your profile, your preferences, your boundaries."
                            : "A little trust goes a long way. Here’s how we build it."}
              </p>
            </div>
            <div className="heading-side">
              {state.user.demo ? (
                <button
                  className="preview-pill"
                  onClick={() => setDialog({ kind: "auth" })}
                >
                  <span />
                  Interactive preview <ArrowUpRight size={13} />
                </button>
              ) : (
                <span className="member-pill">
                  <Shield size={14} />
                  Your space, protected
                </span>
              )}
              <span className="today-date">
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                }).format(new Date())}
              </span>
            </div>
          </div>
          {page === "Explore" && (
            <div className="content-grid">
              <div className="primary-column">
                <section className="welcome-hero">
                  <div className="hero-content">
                    <span className="hero-eyebrow">
                      <Sparkles size={13} /> A LITTLE OUTSIDE YOUR EVERYDAY
                    </span>
                    <h2>
                      Less scrolling.
                      <br />
                      More connecting.
                    </h2>
                    <p>
                      Two little dares. A chance to meet someone
                      <br className="desktop-break" /> who makes your day a
                      little brighter.
                    </p>
                    <button
                      className="button hero-button"
                      onClick={() =>
                        document.getElementById("daily-dares")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                    >
                      Find your little adventure <ArrowUpRight size={16} />
                    </button>
                    <div className="hero-footnote">
                      <ShieldCheck size={13} />
                      Thoughtful dares. Mutual consent. Your pace.
                    </div>
                  </div>
                  <HeroArt />
                </section>
                <DailyDares {...actions} onChat={openChat} />
                <section className="community-section">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow muted">
                        GOOD PEOPLE. LITTLE MOMENTS.
                      </span>
                      <h2>
                        A little from the community <span>✳</span>
                      </h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("Community")}
                    >
                      See all <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="feed-tabs">
                    <div role="tablist" aria-label="Community feed">
                      {["For you", "Following", "Saved"].map((t) => (
                        <button
                          role="tab"
                          aria-selected={feedTab === t}
                          className={feedTab === t ? "selected" : ""}
                          key={t}
                          onClick={() => setFeedTab(t)}
                        >
                          {t}
                          {t === "For you" && (
                            <span className="tiny-green-dot" />
                          )}
                        </button>
                      ))}
                    </div>
                    <span>
                      <span className="tiny-green-dot" /> A little kindness goes
                      a long way
                    </span>
                  </div>
                  <Feed
                    posts={visiblePosts.slice(0, 2)}
                    actions={actions}
                    saved={saved}
                    toggleSave={toggleSave}
                  />
                </section>
                <div className="end-note">
                  <span>✧</span> A small step out of your comfort zone. A big
                  step toward connection.
                </div>
              </div>
              <RightRail {...actions} people={filteredPeople} />
            </div>
          )}
          {page === "Community" && (
            <div className="content-grid">
              <div className="primary-column">
                <div className="community-intro">
                  <span className="community-intro-icon">
                    <Users size={25} />
                  </span>
                  <div>
                    <h3>The best part? The people.</h3>
                    <p>
                      A space for little wins, everyday joy, and showing up as
                      yourself.
                    </p>
                  </div>
                  <button
                    className="button light"
                    onClick={() => setDialog({ kind: "new-post" })}
                  >
                    <Plus size={16} />
                    Share a moment
                  </button>
                </div>
                <div className="feed-tabs">
                  <div role="tablist" aria-label="Community feed">
                    {["For you", "Following", "Saved"].map((t) => (
                      <button
                        role="tab"
                        aria-selected={feedTab === t}
                        className={feedTab === t ? "selected" : ""}
                        key={t}
                        onClick={() => setFeedTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {search && (
                  <p className="search-results">Results for “{search}”</p>
                )}
                <Feed
                  posts={visiblePosts}
                  actions={actions}
                  saved={saved}
                  toggleSave={toggleSave}
                />
              </div>
              <RightRail {...actions} people={filteredPeople} />
            </div>
          )}
          {page === "My dares" && <DaresView {...actions} onChat={openChat} />}
          {page === "Messages" && (
            <MessagesView
              {...actions}
              selectedId={selectedChat}
              onSelect={setSelectedChat}
            />
          )}
          {page === "My profile" && (
            <ProfileView {...actions} saved={saved} toggleSave={toggleSave} />
          )}
          {page === "Settings" && (
            <SettingsView {...actions} onLogout={logout} />
          )}
          {page === "Safety center" && <SafetyView {...actions} />}
          <footer className="page-footer">
            <span>
              <Brand /> A little courage. A real connection.
            </span>
            <div>
              <button onClick={() => navigate("Safety center")}>
                Community guidelines
              </button>
              <span>·</span>
              <button onClick={() => navigate("Settings")}>
                Privacy & settings
              </button>
              <span>·</span>
              <span>Made for real connections</span>
              <Heart size={12} />
            </div>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[...nav, { name: "My profile" as Page, icon: Users }].map(
          ({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => navigate(name)}
              aria-current={page === name ? "page" : undefined}
            >
              <Icon size={21} />
              <span>{name === "My profile" ? "Profile" : name}</span>
            </button>
          ),
        )}
      </nav>
      {dialog?.kind === "new-post" && (
        <NewPostDialog {...actions} onClose={close} />
      )}
      {dialog?.kind === "auth" && <AuthDialog {...actions} onClose={close} />}
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
        <Modal
          title="Your little updates"
          eyebrow="STAY IN THE LOOP"
          onClose={close}
        >
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
  onChat,
  navigate,
}: AppActions & { onChat: (id: string) => void }) {
  const mine = state.matches.filter(
    (m) => m.day === state.day && m.status !== "left",
  );
  return (
    <section className="daily-section" id="daily-dares">
      <div className="section-heading">
        <div>
          <h2>
            Your daily dose of daring <span className="sun-symbol">☼</span>
          </h2>
          <p>
            Small dares. Real connections. All you need is a little curiosity.
          </p>
        </div>
        <span className="daily-count">
          <Zap size={13} />
          <strong>{2 - mine.length} / 2</strong> available
        </span>
      </div>
      <div className="dare-grid">
        {state.dares.map((d) => {
          const match = mine.find((m) => m.dare === d.id);
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
                  onClick={() =>
                    match
                      ? match.status === "active"
                        ? onChat(match.id)
                        : navigate("My dares")
                      : open({ kind: "dare", dare: d })
                  }
                >
                  {match
                    ? match.status === "completed"
                      ? "A little win, completed"
                      : match.status === "pending"
                        ? "Waiting for a little connection"
                        : "Continue your adventure"
                    : "I’m a little curious"}
                  {match?.status === "completed" ? (
                    <Check size={16} />
                  ) : (
                    <ArrowUpRight size={17} />
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
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
function RightRail({
  state,
  people,
  open,
  act,
  navigate,
}: AppActions & { people: User[] }) {
  return (
    <aside className="right-rail">
      <section className="matching-card">
        <div className="rail-card-heading">
          <span className="small-icon pale-green">
            <ShieldCheck size={20} />
          </span>
          <span>
            Good people.
            <br />
            <strong>Your kind of connection.</strong>
          </span>
        </div>
        <div className="verified-setting">
          <div>
            <strong>
              Verified people only <Verified small />
            </strong>
            <p>A little more peace of mind.</p>
          </div>
          <Toggle
            checked={state.user.verifiedOnly}
            label="Match with verified people only"
            onChange={() =>
              act(
                () =>
                  send(
                    "/me",
                    { verifiedOnly: !state.user.verifiedOnly },
                    "PATCH",
                  ),
                state.user.verifiedOnly
                  ? "Matching filter updated."
                  : "Verified-only matching is on.",
              )
            }
          />
        </div>
        <button
          className="rail-link"
          onClick={() => open({ kind: "verification" })}
        >
          What does verified mean? <ArrowUpRight size={13} />
        </button>
        <div className="intention-setting">
          <span>I’m here for</span>
          <div
            className="intention-options"
            role="group"
            aria-label="Connection preference"
          >
            {[
              { v: "friends", label: "Friends", icon: "✳" },
              { v: "dating", label: "Dating", icon: "♡" },
              { v: "both", label: "Both", icon: "✧" },
            ].map((o) => (
              <button
                key={o.v}
                className={state.user.intention === o.v ? "selected" : ""}
                onClick={() =>
                  act(
                    () => send("/me", { intention: o.v }, "PATCH"),
                    "Connection preference saved.",
                  )
                }
              >
                <span>{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="people-card">
        <div className="rail-section-heading">
          <h3>A few friendly faces</h3>
          <span>✦</span>
        </div>
        <p className="rail-description">A new connection could start here.</p>
        <div className="people-list">
          {people.slice(0, 3).map((u, i) => (
            <button
              className="person-row"
              key={u.id}
              onClick={() => open({ kind: "profile", user: u })}
            >
              <span className="avatar-wrap">
                <Avatar user={u} />
                <span className={`person-status status-${i}`} />
              </span>
              <span>
                <strong>
                  {u.name}
                  {u.verified && <Verified small />}
                </strong>
                <small>
                  {i === 0
                    ? "A little creative"
                    : i === 1
                      ? "Always curious"
                      : "Here for the little things"}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {!people.length && (
            <p className="small-muted">
              No profiles match your current filters.
            </p>
          )}
        </div>
        <button
          className="people-more"
          onClick={() => {
            open({ kind: "people" });
          }}
        >
          Meet the community <ArrowRight size={14} />
        </button>
        <span className="sample-note">Preview profiles are fictional.</span>
      </section>
      <section className="safety-card">
        <span className="safety-art">
          <ShieldCheck size={35} strokeWidth={1.3} />
          <span className="safety-star">✧</span>
        </span>
        <span className="eyebrow">A LITTLE REASSURANCE</span>
        <h3>
          Good connections
          <br />
          start with feeling safe.
        </h3>
        <p>
          Your boundaries matter. You decide what to share, who to meet, and
          when to take a step back.
        </p>
        <button onClick={() => navigate("Safety center")}>
          Your safety, always <ArrowUpRight size={15} />
        </button>
        <div className="safety-bottom">
          <LockKeyhole size={12} />
          Your profile is {state.user.private ? "private" : "public"}. Your
          choices are yours.
        </div>
      </section>
      <section className="little-note">
        <span>“</span>
        <p>
          Sometimes a little dare
          <br />
          is all it takes.
        </p>
        <small>HERE’S TO YOUR NEXT GOOD STORY.</small>
        <span className="note-flower">✳</span>
      </section>
    </aside>
  );
}
export function Feed({
  posts,
  actions,
  saved,
  toggleSave,
}: {
  posts: Post[];
  actions: AppActions;
  saved: string[];
  toggleSave: (p: Post) => void;
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
    <EmptyState icon={<ImagePlus size={28} />} title="A little quiet here.">
      Follow someone, save a moment, or share the first little win of your own.
      <button
        className="button light"
        onClick={() => actions.open({ kind: "new-post" })}
      >
        <Plus size={16} />
        Share a moment
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
