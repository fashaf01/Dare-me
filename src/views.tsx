import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Flag,
  Heart,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Pencil,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api, send } from "./api";
import { DEMO_ONLY } from "./config";
import {
  Avatar,
  EmptyState,
  Modal,
  Rule,
  SafetyStrip,
  Toggle,
  Verified,
} from "./components";
import { DailyDares, Feed } from "./App";
import type { AppActions } from "./App";
import type { Match, Message, Post } from "./types";
import type { FormEvent } from "react";

export function DaresView(
  props: AppActions & { onChat: (id: string) => void },
) {
  const { state, act, onChat, open } = props;
  const mine = state.matches.filter(
    (m) =>
      m.status !== "left" && (m.day === state.day || m.status !== "completed"),
  );
  return (
    <div className="content-grid">
      <div className="primary-column">
        {mine.length > 0 && (
          <section className="connections-section">
            <div className="section-heading">
              <div>
                <h2>Your connections</h2>
                <p>Every adventure starts with two comfortable yeses.</p>
              </div>
              <span className="tag">
                {mine.length} {mine.length === 1 ? "dare" : "dares"}
              </span>
            </div>
            <div className="match-list">
              {mine.map((m) => (
                <div className="match-card" key={m.id}>
                  <div className="match-card-top">
                    <Avatar user={m.peer} size="large" />
                    <div>
                      <span className="eyebrow">
                        {m.day === state.day
                          ? "TODAY’S LITTLE ADVENTURE"
                          : m.day}
                      </span>
                      <h3>{m.dareInfo.title}</h3>
                      <span className="match-partner">
                        with {m.peer.name}
                        {m.peer.verified && <Verified small />}
                      </span>
                    </div>
                    <span className={`tag match-status ${m.status}`}>
                      <span />
                      {m.status === "pending"
                        ? m.incoming
                          ? "Your turn to accept"
                          : "Waiting for partner"
                        : m.status === "active"
                          ? "In progress"
                          : "Completed"}
                    </span>
                  </div>
                  {m.status === "pending" && m.incoming ? (
                    <IncomingInvite match={m} act={act} />
                  ) : (
                    <>
                      <p>
                        {m.status === "pending"
                          ? "You’ve said yes. Your partner gets to choose too. Chat stays closed until both of you accept."
                          : m.status === "completed"
                            ? "You showed up, tried something new, and made a little connection. That’s worth celebrating."
                            : "Your chat is open. Remember: sharing is a choice, and you can leave whenever you need."}
                      </p>
                      <div className="match-card-actions">
                        {m.status === "active" && (
                          <button
                            className="button primary compact"
                            onClick={() => onChat(m.id)}
                          >
                            Open chat <MessageCircle size={15} />
                          </button>
                        )}
                        {m.status === "completed" && (
                          <button
                            className="button light compact"
                            onClick={() => onChat(m.id)}
                          >
                            View conversation <ArrowRight size={15} />
                          </button>
                        )}
                        {m.status === "pending" && state.user.demo && (
                          <button
                            className="button primary compact"
                            onClick={async () => {
                              if (
                                await act(() =>
                                  send(`/matches/${m.id}/preview-accept`),
                                )
                              )
                                onChat(m.id);
                            }}
                          >
                            Open sample chat <Sparkles size={15} />
                          </button>
                        )}
                        {m.status !== "completed" && (
                          <button
                            className="text-button"
                            onClick={() =>
                              act(
                                () => send(`/matches/${m.id}/leave`),
                                "You’ve left the dare. Taking a step back is always okay.",
                              )
                            }
                          >
                            Leave this dare <X size={14} />
                          </button>
                        )}
                      </div>
                      {m.peer.sample && (
                        <div className="inline-preview">
                          <Sparkles size={12} />
                          Sample partner · no real person is contacted
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        <DailyDares {...props} />
        <SafetyStrip onClick={() => props.navigate("Safety center")} />
      </div>
      <aside className="right-rail">
        <div className="info-card cream">
          <span className="small-icon">
            <Zap size={25} />
          </span>
          <h3>
            Two dares.
            <br />
            Zero pressure.
          </h3>
          <p>
            Your two reviewed dares refresh every day at 00:00 UTC. There’s no
            race, no streak to lose, and no penalty for leaving.
          </p>
          <ul className="rules">
            <Rule>Both people choose to take part.</Rule>
            <Rule>Every dare stays online.</Rule>
            <Rule>Your private profile stays private.</Rule>
          </ul>
        </div>
        <div className="info-card">
          <ShieldCheck size={26} />
          <h3>A badge is a starting point.</h3>
          <p>
            Verification adds a layer of reassurance, but it can’t promise good
            behavior. Keep personal details private and trust your boundaries.
          </p>
          <button
            className="text-button"
            onClick={() => open({ kind: "verification" })}
          >
            A little more about verification <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
    </div>
  );
}
function IncomingInvite({
  match,
  act,
}: {
  match: Match;
  act: AppActions["act"];
}) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="incoming-invite">
      <p>
        {match.peer.name.split(" ")[0]} has said yes. Take a look at the dare
        and choose what feels right for you.
      </p>
      <p>
        <strong>{match.dareInfo.description}</strong>
      </p>
      <ul className="rules">
        {match.dareInfo.rules.map((r) => (
          <Rule key={r}>{r}</Rule>
        ))}
      </ul>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>I’ve read the rules and I’m comfortable trying this dare.</span>
      </label>
      <div className="match-card-actions">
        <button
          className="button primary compact"
          disabled={!consent || busy}
          onClick={async () => {
            setBusy(true);
            await act(
              () => send(`/matches/${match.id}/accept`, { consent }),
              "Two yeses. Your little adventure can begin.",
            );
            setBusy(false);
          }}
        >
          Accept this little dare <Check size={15} />
        </button>
        <button
          className="text-button"
          onClick={() =>
            act(
              () => send(`/matches/${match.id}/leave`),
              "Dare declined. That’s always okay.",
            )
          }
        >
          Not this time
        </button>
      </div>
    </div>
  );
}
export function MessagesView({
  state,
  refresh,
  notify,
  act,
  open,
  navigate,
  selectedId,
  onSelect,
}: AppActions & {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const matches = state.matches.filter((m) =>
    ["active", "completed"].includes(m.status),
  );
  const selected = matches.find((m) => m.id === selectedId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    setMessages([]);
    setError("");
    setText("");
    if (!selected) return;
    let live = true;
    const load = () =>
      api<{ messages: Message[] }>(`/matches/${selected.id}/messages`)
        .then((r) => {
          if (live) {
            setMessages(r.messages);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    load();
    const t = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [selected?.id]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await send(`/matches/${selected.id}/messages`, { text });
      setText("");
      setMessages(
        (await api<{ messages: Message[] }>(`/matches/${selected.id}/messages`))
          .messages,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!matches.length)
    return (
      <div className="messages-empty-layout">
        <EmptyState icon={<MessageCircle size={36} />} title="No chats yet">
          Pick a dare and meet a partner. When you both accept, your chat
          appears here.
          <button
            className="button primary"
            onClick={() => navigate("My dares")}
          >
            Choose a dare <ArrowRight size={16} />
          </button>
        </EmptyState>
        <div className="subtle-note">
          <LockKeyhole size={18} />
          <p>
            No unsolicited messages. No pressure to reply. Just a little
            connection, on your terms.
          </p>
        </div>
      </div>
    );
  return (
    <>
      <div className={`chat-layout ${selected ? "has-selection" : ""}`}>
        <aside className="chat-sidebar">
          <div className="chat-sidebar-title">
            <h3>Your connections</h3>
            <span>{matches.length}</span>
          </div>
          {matches.map((m) => (
            <button
              className={`chat-person ${selected?.id === m.id ? "selected" : ""}`}
              onClick={() => onSelect(m.id)}
              key={m.id}
            >
              <Avatar user={m.peer} />
              <span>
                <strong>
                  {m.peer.name}
                  {m.peer.verified && <Verified small />}
                </strong>
                <small>{m.dareInfo.title}</small>
                <small>
                  {m.status === "completed"
                    ? "Completed · read-only"
                    : "Ready to chat"}
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
          <div className="chat-sidebar-note">
            <ShieldCheck size={22} />
            <strong>A little consent goes a long way.</strong>
            <p>Only mutually accepted connections can message you.</p>
          </div>
        </aside>
        {selected && (
          <section className="chat-conversation">
            {selected && (
              <>
                <header className="chat-header">
                  <button
                    className="icon-button"
                    aria-label="Back to chats"
                    onClick={() => onSelect(null)}
                  >
                    <ArrowLeft size={21} />
                  </button>
                  <button
                    className="post-author"
                    onClick={() =>
                      open({ kind: "profile", user: selected.peer })
                    }
                  >
                    <Avatar user={selected.peer} />
                    <span>
                      <strong>
                        {selected.peer.name}
                        {selected.peer.verified && <Verified small />}
                      </strong>
                      <small>
                        {selected.peer.sample
                          ? "Sample conversation"
                          : selected.dareInfo.title}
                      </small>
                    </span>
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Report this connection"
                    onClick={() =>
                      open({ kind: "report", user: selected.peer })
                    }
                  >
                    <Flag size={18} />
                  </button>
                  <button
                    className="text-button leave-button"
                    onClick={() => setConfirmLeave(true)}
                  >
                    Leave <X size={14} />
                  </button>
                </header>
                <div className="chat-safety-banner">
                  <LockKeyhole size={13} />
                  Two yeses. One little adventure. Keep personal details
                  private.
                </div>
                <div className="chat-messages">
                  <div className="chat-start">
                    <span>
                      <Zap size={23} />
                    </span>
                    <h3>{selected.dareInfo.title}</h3>
                    <p>{selected.dareInfo.description}</p>
                    <span className="tag">
                      <CheckCircle2 size={12} />
                      Both accepted
                    </span>
                  </div>
                  {selected.peer.sample && (
                    <p className="chat-preview-note">
                      You’re trying a sample chat. Messages are saved to your
                      preview; no real person will reply.
                    </p>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`message-row ${m.user_id === state.user.id ? "mine" : ""}`}
                    >
                      {m.user_id !== state.user.id && (
                        <Avatar user={selected.peer} size="small" />
                      )}
                      <div className="message-bubble">
                        <p>{m.text}</p>
                        <time>
                          {new Intl.DateTimeFormat("en", {
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(m.created))}
                        </time>
                      </div>
                    </div>
                  ))}
                  {selected.status === "completed" && (
                    <div className="completed-chat">
                      <CheckCircle2 size={21} />
                      <span>
                        A little win, completed. This conversation is now
                        read-only.
                      </span>
                    </div>
                  )}
                </div>
                {error && (
                  <div className="form-error" role="alert">
                    {error}
                  </div>
                )}
                {selected.status === "active" ? (
                  <>
                    <div className="quick-messages">
                      {[
                        "A little hello! 👋",
                        "What made you smile today?",
                        "Ready to give it a try?",
                      ].map((t) => (
                        <button key={t} onClick={() => setText(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <form className="chat-input" onSubmit={submit}>
                      <input
                        aria-label="Message"
                        placeholder="Message…"
                        maxLength={1000}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        required
                      />
                      <button
                        className="send-button"
                        disabled={busy || !text.trim()}
                        aria-label="Send message"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                    <div className="chat-complete">
                      <button
                        onClick={async () => {
                          if (
                            await act(
                              () => send(`/matches/${selected.id}/complete`),
                              "A little win! Your dare is complete.",
                            )
                          )
                            await refresh();
                        }}
                      >
                        <CheckCircle2 size={14} />
                        We did it! Mark my dare complete
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="button light chat-back"
                    onClick={() => {
                      navigate("My dares");
                      notify("A little win is worth celebrating.");
                    }}
                  >
                    Back to my little adventures <ArrowRight size={15} />
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </div>
      {confirmLeave && selected && (
        <Modal
          title="Taking a little step back?"
          eyebrow="YOUR COMFORT COMES FIRST"
          onClose={() => setConfirmLeave(false)}
        >
          <p className="dialog-intro">
            Leaving ends this chat for both people. There’s no penalty and you
            don’t owe anyone an explanation.
          </p>
          <div className="dialog-actions">
            <button
              className="button light"
              onClick={() => setConfirmLeave(false)}
            >
              Stay a little longer
            </button>
            <button
              className="button primary"
              onClick={async () => {
                await act(
                  () => send(`/matches/${selected.id}/leave`),
                  "You’ve left the dare. Your boundaries come first.",
                );
                setConfirmLeave(false);
              }}
            >
              Leave this dare <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function ProfileView(
  props: AppActions & {
    saved: string[];
    toggleSave: (p: Post) => void;
    installed?: boolean;
  },
) {
  const { state, open, navigate, saved, toggleSave } = props;
  const [tab, setTab] = useState("My moments");
  const mine = state.posts.filter((p) => p.user_id === state.user.id);
  const completed = state.matches.filter(
    (m) => m.status === "completed",
  ).length;
  const connections = state.matches.filter((m) =>
    ["active", "completed"].includes(m.status),
  ).length;
  return (
    <div className="profile-page">
      <section className="profile-cover">
        <div className="cover-orbit orbit-one" />
        <div className="cover-orbit orbit-two" />
        <span className="cover-spark one">✳</span>
        <span className="cover-spark two">✧</span>
        <p>Perfectly, a little you.</p>
        <span className="cover-tag">
          <ShieldCheck size={14} />
          Your little corner of the world
        </span>
      </section>
      <section className="profile-information">
        <div className="profile-main-details">
          <Avatar user={state.user} size="xl" />
          <div>
            <h2>
              {state.user.name}
              {state.user.verified && <Verified />}
            </h2>
            <span className="profile-handle">
              {state.user.demo ? "Sample account" : "Dareme member"}
            </span>
            <p>
              {state.user.bio ||
                "Your story is still being written. Add a little introduction."}
            </p>
            <span className="tag">
              <LockKeyhole size={12} />
              {state.user.private ? "Private profile" : "Public profile"}
            </span>
          </div>
          <button
            className="button light"
            onClick={() => open({ kind: "edit-profile" })}
          >
            <Pencil size={15} />
            Edit profile
          </button>
        </div>
        <div className="profile-stats">
          <span>
            <strong>{mine.length}</strong>
            {mine.length === 1 ? "post" : "posts"}
          </span>
          <span>
            <strong>{completed}</strong>
            {completed === 1 ? "dare completed" : "dares completed"}
          </span>
          <span>
            <strong>{connections}</strong>
            {connections === 1 ? "connection" : "connections"}
          </span>
          <button onClick={() => navigate("Settings")}>
            <Settings size={16} />
            Privacy & preferences <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
      <div className="profile-utilities">
        <button className="button light" onClick={() => navigate("Settings")}>
          <Settings size={16} />
          Preferences
        </button>
        <button
          className="button light"
          onClick={() => navigate("Safety center")}
        >
          <ShieldCheck size={16} />
          Safety & help
        </button>
        {!props.installed && (
          <button
            className="button light"
            onClick={() => open({ kind: "install" })}
          >
            <Download size={16} />
            Get the app
          </button>
        )}
      </div>
      <div className="profile-content">
        <div className="primary-column">
          <div className="feed-tabs">
            <div role="tablist" aria-label="Profile posts">
              {["My moments", "Saved moments"].map((t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  key={t}
                  className={tab === t ? "selected" : ""}
                  onClick={() => setTab(t)}
                >
                  {t === "My moments" ? (
                    <Camera size={15} />
                  ) : (
                    <Heart size={15} />
                  )}{" "}
                  {t}
                </button>
              ))}
            </div>
            <button
              className="text-button"
              onClick={() => open({ kind: "new-post" })}
            >
              Share a moment <ArrowUpRight size={14} />
            </button>
          </div>
          <Feed
            posts={
              tab === "My moments"
                ? mine
                : state.posts.filter((p) => saved.includes(p.id))
            }
            saved={saved}
            toggleSave={toggleSave}
            actions={props}
            empty={
              tab === "Saved moments"
                ? {
                    title: "Nothing saved yet",
                    description: "Tap the bookmark on a post to keep it here.",
                    label: "Browse the feed",
                    action: () => navigate("Community"),
                  }
                : undefined
            }
          />
        </div>
        <aside className="profile-side-note">
          <LockKeyhole size={23} />
          <h3>A little privacy is a good thing.</h3>
          <p>
            {state.user.private
              ? "Only you and approved followers can see your posts. A dare connection doesn’t unlock your private profile."
              : "Your posts can be seen by signed-in members. Switch to a private account whenever you need a little more space."}
          </p>
          <button className="text-button" onClick={() => navigate("Settings")}>
            My privacy settings <ArrowUpRight size={14} />
          </button>
        </aside>
      </div>
    </div>
  );
}
export function SettingsView({
  state,
  act,
  open,
  onLogout,
}: AppActions & { onLogout: () => void }) {
  const [publicConfirm, setPublicConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const setting = async (value: unknown, message: string) => {
    setSaving(true);
    await act(() => send("/me", value, "PATCH"), message);
    setSaving(false);
  };
  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">
        {[
          { id: "privacy", label: "Privacy & boundaries", icon: LockKeyhole },
          { id: "matching", label: "Connection preferences", icon: Users },
          { id: "account", label: "My account", icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <a href={`#${id}`} key={id}>
            <Icon size={18} />
            {label}
            <ChevronRight size={15} />
          </a>
        ))}
        <div className="settings-note">
          <ShieldCheck size={24} />
          <p>You don’t have to share everything to make a real connection.</p>
        </div>
      </nav>
      <div className="settings-sections">
        <section className="settings-card" id="privacy">
          <div className="settings-card-title">
            <span className="small-icon pale-green">
              <LockKeyhole size={21} />
            </span>
            <div>
              <h2>A little privacy.</h2>
              <p>Your space should feel like yours.</p>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <h3>Private account</h3>
              <p>
                Only approved followers can see your posts. Your name, avatar,
                and introduction stay visible to members.
              </p>
            </div>
            <Toggle
              checked={state.user.private}
              label="Private account"
              disabled={saving}
              onChange={() =>
                state.user.private
                  ? setPublicConfirm(true)
                  : setting({ private: true }, "Your account is now private.")
              }
            />
          </div>
          <div className="privacy-preview">
            <LockKeyhole size={15} />
            <span>
              {state.user.private
                ? "Your posts are private. You choose who gets a closer look."
                : "Your posts are public to signed-in members."}
            </span>
            <span className="tag">
              {state.user.private ? "Private" : "Public"}
            </span>
          </div>
          <div className="setting-row">
            <div>
              <h3>Blocked accounts</h3>
              <p>
                {state.blocks.length
                  ? `${state.blocks.length} ${state.blocks.length === 1 ? "person is" : "people are"} blocked. They can’t see your profile, contact you, or match with you.`
                  : "No blocked accounts. You can block a person from their profile, post, or report form."}
              </p>
            </div>
            <span className="settings-count">{state.blocks.length}</span>
          </div>
          <div className="setting-row">
            <div>
              <h3>Private photo storage</h3>
              <p>
                Uploads follow your account visibility. Photos are re-encoded to
                remove location metadata.
              </p>
            </div>
            <ShieldCheck size={20} className="green-icon" />
          </div>
        </section>
        <section className="settings-card" id="matching">
          <div className="settings-card-title">
            <span className="small-icon pale-purple">
              <Users size={21} />
            </span>
            <div>
              <h2>Your kind of connection.</h2>
              <p>A little more of what you’re looking for.</p>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <h3>
                Verified people only <Verified small />
              </h3>
              <p>
                Only match with profiles that have a verification badge. A badge
                doesn’t guarantee safe behavior.
              </p>
              <button
                className="text-button"
                onClick={() => open({ kind: "verification" })}
              >
                What verification means <ArrowUpRight size={12} />
              </button>
            </div>
            <Toggle
              checked={state.user.verifiedOnly}
              label="Verified people only"
              disabled={saving}
              onChange={() =>
                setting(
                  { verifiedOnly: !state.user.verifiedOnly },
                  "Matching preference saved.",
                )
              }
            />
          </div>
          <div className="setting-row">
            <div>
              <h3>I’m here for</h3>
              <p>We’ll use this preference when finding your dare partner.</p>
            </div>
            <select
              aria-label="Connection intention"
              value={state.user.intention}
              disabled={saving}
              onChange={(e) =>
                setting(
                  { intention: e.target.value },
                  "A little closer to your kind of connection.",
                )
              }
            >
              <option value="friends">New friends</option>
              <option value="dating">Dating</option>
              <option value="both">Open to both</option>
            </select>
          </div>
          {!state.user.verified && state.user.verifiedOnly && (
            <div className="subtle-note">
              <BadgeCheck size={18} />
              <p>
                New accounts are unverified. Real verification isn’t connected
                yet, so verified-only matches may be unavailable. You can keep
                this filter on and wait.
              </p>
            </div>
          )}
        </section>
        <section className="settings-card" id="account">
          <div className="settings-card-title">
            <span className="small-icon pale-peach">
              <Settings size={21} />
            </span>
            <div>
              <h2>Your little account.</h2>
              <p>The basics, all in one place.</p>
            </div>
          </div>
          <div className="setting-row">
            <div className="account-setting-user">
              <Avatar user={state.user} />
              <div>
                <h3>{state.user.name}</h3>
                <p>
                  {state.user.demo
                    ? "Interactive preview account"
                    : "Dareme member · Adult community"}
                </p>
              </div>
            </div>
            <button
              className="button light compact"
              onClick={() => open({ kind: "edit-profile" })}
            >
              Edit profile <Pencil size={14} />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <h3>
                {DEMO_ONLY
                  ? "A fresh little start?"
                  : state.user.demo
                    ? "Ready for your own little space?"
                    : "Need a little break?"}
              </h3>
              <p>
                {DEMO_ONLY
                  ? "Reset sample posts, chats, and preferences on this device."
                  : state.user.demo
                    ? "Create a private account. Your preview content stays separate."
                    : "Sign out on this browser. Your posts and preferences will be here when you return."}
              </p>
            </div>
            <button
              className="button light compact"
              onClick={() =>
                state.user.demo ? open({ kind: "auth" }) : onLogout()
              }
            >
              {DEMO_ONLY
                ? "Demo options"
                : state.user.demo
                  ? "Create an account"
                  : "Sign out"}
              {state.user.demo ? (
                <ArrowRight size={14} />
              ) : (
                <LogOut size={14} />
              )}
            </button>
          </div>
        </section>
        <p className="settings-footnote">
          <ShieldCheck size={14} />
          {DEMO_ONLY
            ? "This demo saves preferences in your browser. No login or server needed."
            : "Your preferences are saved securely on this app’s server."}
        </p>
      </div>
      {publicConfirm && (
        <Modal
          title="A little more open?"
          eyebrow="MAKE THE CHOICE THAT FEELS RIGHT"
          onClose={() => setPublicConfirm(false)}
        >
          <p className="dialog-intro">
            Switching to a public account makes all your current and future
            posts visible to signed-in members. Your email stays private.
          </p>
          <div className="dialog-actions">
            <button
              className="button light"
              onClick={() => setPublicConfirm(false)}
            >
              Keep it private
            </button>
            <button
              className="button primary"
              onClick={async () => {
                await setting(
                  { private: false },
                  "Your profile is now public to signed-in members.",
                );
                setPublicConfirm(false);
              }}
            >
              Make my profile public <ArrowUpRight size={15} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function SafetyView({ state, open, navigate }: AppActions) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const questions = [
    {
      q: "What happens when I accept a dare?",
      a: "Your partner is invited to the same reviewed dare. Chat opens only after both of you accept. Accepting a dare does not unlock either person’s private posts or share contact information.",
    },
    {
      q: "Can I change my mind?",
      a: "Always. Leave a dare or end a chat whenever you need. There are no penalties, no lost points, and no obligation to explain. Block someone to end contact and prevent future matches.",
    },
    {
      q: "Does verified mean someone is safe?",
      a: "No. Verification can confirm an identity check, but it cannot guarantee intentions or behavior. Badges in the interactive preview belong to fictional profiles. Real identity and age verification still need to be connected.",
    },
    {
      q: "Who can see my photos?",
      a: DEMO_ONLY
        ? "Demo photos stay on this device and aren’t uploaded or shared. The public/private switch is a sample of how profile privacy works in the full app."
        : "For a private account, only you and approved followers can access your posts and uploaded photos. For a public account, signed-in members can see them. Other people may still capture or save anything you choose to share, so keep sensitive details out of posts.",
    },
    {
      q: "What happens to a report?",
      a: DEMO_ONLY
        ? "Sample reports are recorded only in this browser. They aren’t sent to a moderation team. Use the reset option to clear all demo content."
        : "Reports are stored on the server with a reference number. This first prototype does not have an actively staffed moderation team or emergency response service. A public launch needs human moderation, escalation procedures, and real age and identity checks.",
    },
  ];
  return (
    <div className="safety-page">
      <section className="safety-hero">
        <div>
          <span className="eyebrow">A LITTLE TRUST. A LOT OF CARE.</span>
          <h2>
            Your boundaries.
            <br />
            Always the priority.
          </h2>
          <p>
            A good connection should feel comfortable, respectful, and
            completely your choice.
          </p>
          <button
            className="button primary"
            onClick={() => navigate("Settings")}
          >
            Make my space feel right <ArrowUpRight size={16} />
          </button>
        </div>
        <span className="big-safety-shield">
          <ShieldCheck size={112} strokeWidth={1} />
          <span>✧</span>
        </span>
      </section>
      <div className="safety-principles">
        {[
          {
            icon: UserCheck,
            title: "Two comfortable yeses.",
            text: "No one can start a chat with you until you both accept a dare.",
          },
          {
            icon: LockKeyhole,
            title: "A little privacy, by default.",
            text: "New accounts start private. You approve who sees your moments.",
          },
          {
            icon: Shield,
            title: "A way out. Always.",
            text: "Leave, block, or report from your connection or a person’s profile.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div className="info-card" key={title}>
            <span className="small-icon pale-green">
              <Icon size={24} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="safety-details-grid">
        <section className="safety-guidelines">
          <span className="eyebrow">THE LITTLE THINGS THAT MATTER</span>
          <h2>Kind people. Clear boundaries.</h2>
          <ul className="rules">
            <Rule>
              Keep every dare online. No meetups, dangerous stunts, or
              private-location challenges.
            </Rule>
            <Rule>
              Be kind. No sexual pressure, harassment, humiliation, or unwanted
              contact.
            </Rule>
            <Rule>
              Keep addresses, phone numbers, identity documents, and financial
              information private.
            </Rule>
            <Rule>
              Never send money, gift cards, or payment details to a connection.
            </Rule>
            <Rule>
              Share only images you have permission to share. Never post another
              person’s private content.
            </Rule>
            <Rule>
              This community is for adults 18 and older. Report suspected
              underage accounts.
            </Rule>
          </ul>
          <div className="subtle-note">
            <Flag size={20} />
            <p>
              If something feels wrong, leave and block the person. Use the
              report option on their profile or post to record what happened.
            </p>
          </div>
        </section>
        <section className="safety-faq">
          <span className="eyebrow">A LITTLE CLARITY</span>
          <h2>You might be wondering.</h2>
          {questions.map((f, i) => (
            <div className="faq-item" key={f.q}>
              <button
                aria-expanded={expanded === i}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                {f.q}
                <span>{expanded === i ? "−" : "+"}</span>
              </button>
              {expanded === i && <p>{f.a}</p>}
            </div>
          ))}
        </section>
      </div>
      <div className="safety-launch-note">
        <ShieldCheck size={25} />
        <div>
          <h3>A transparent little note.</h3>
          <p>
            This is a first working prototype. Sample profiles are fictional.
            Live identity checks, robust age assurance, and a staffed moderation
            team must be in place before inviting the public.
          </p>
        </div>
        <button
          className="text-button"
          onClick={() =>
            open({ kind: state.user.demo ? "auth" : "verification" })
          }
        >
          {DEMO_ONLY
            ? "About this demo"
            : state.user.demo
              ? "Explore with an account"
              : "About verification"}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );
}
