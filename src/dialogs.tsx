import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  ImagePlus,
  LockKeyhole,
  MessageCircle,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api, send } from "./api";
import { DEMO_ONLY } from "./config";
import {
  Avatar,
  DareArt,
  EmptyState,
  Modal,
  Rule,
  Verified,
} from "./components";
import type { AppActions } from "./App";
import type { Comment, Dare, Match, Post, User } from "./types";
import type { FormEvent } from "react";

function FormError({ error }: { error: string }) {
  return error ? (
    <div className="form-error" role="alert">
      {error}
    </div>
  ) : null;
}
export function NewPostDialog({
  state,
  refresh,
  notify,
  onClose,
}: AppActions & { onClose: () => void }) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = new FormData();
      data.append("caption", caption);
      if (file) data.append("image", file);
      await api("/posts", { method: "POST", body: data });
      await refresh();
      notify("Your post has been shared.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Share a moment"
      eyebrow="A PHOTO. A THOUGHT. A SMALL WIN."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="compose-author">
          <Avatar user={state.user} />
          <div>
            <strong>{state.user.name}</strong>
            <small>
              {DEMO_ONLY ? (
                <>Demo post · on this device only</>
              ) : state.user.private ? (
                <>
                  <LockKeyhole size={12} />
                  Private · approved followers only
                </>
              ) : (
                <>
                  <Users size={12} />
                  Public · visible to signed-in members
                </>
              )}
            </small>
          </div>
        </div>
        <label className="sr-only" htmlFor="caption">
          Your post
        </label>
        <textarea
          id="caption"
          className="compose-input"
          placeholder="What would you like to share?"
          rows={4}
          maxLength={1500}
          required
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <div className="character-count">{caption.length} / 1500</div>
        {preview ? (
          <div className="upload-preview">
            <img src={preview} alt="Your selected photo preview" />
            <button
              type="button"
              className="icon-button"
              aria-label="Remove photo"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X size={17} />
            </button>
          </div>
        ) : (
          <label className="upload-zone">
            <ImagePlus size={28} />
            <strong>Add a photo (optional)</strong>
            <span>JPEG, PNG or WebP · Up to 5 MB</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) {
                  setError("Choose an image smaller than 5 MB.");
                  return;
                }
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(f.type)
                ) {
                  setError("Choose a JPEG, PNG, or WebP image.");
                  return;
                }
                setError("");
                setFile(f);
              }}
            />
          </label>
        )}
        <div className="subtle-note">
          <ShieldCheck size={17} />
          <p>
            {DEMO_ONLY
              ? "Photos stay in this browser. Use sample content; nothing is uploaded or shared."
              : "Keep faces, addresses, and personal details out of photos. Image location metadata is removed on upload."}
          </p>
        </div>
        <FormError error={error} />
        <button
          className="button primary full"
          disabled={busy || !caption.trim()}
        >
          {busy ? (
            "Sharing your moment…"
          ) : (
            <>
              Share post <ArrowUpRight size={17} />
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
export function AuthDialog({
  refresh,
  notify,
  onClose,
}: AppActions & { onClose: () => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await send(`/auth/${mode}`, { name, email, password, adult, rules });
      await refresh();
      notify(
        mode === "register"
          ? "Welcome to your little corner of Dareme."
          : "Welcome back. Your next little adventure awaits.",
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={
        mode === "register"
          ? "Good things start here."
          : "A little hello, again."
      }
      eyebrow="A LITTLE COURAGE. A REAL CONNECTION."
      onClose={onClose}
    >
      <p className="dialog-intro">
        {mode === "register"
          ? "Make room for new friends, thoughtful dares, and a little everyday magic."
          : "Sign in to your private space."}
      </p>
      <div className="dialog-tabs">
        {(["register", "login"] as const).map((v) => (
          <button
            key={v}
            className={mode === v ? "selected" : ""}
            onClick={() => {
              setMode(v);
              setError("");
            }}
          >
            {v === "register" ? "Create an account" : "Sign in"}
          </button>
        ))}
      </div>
      <form className="form-stack" onSubmit={submit}>
        {mode === "register" && (
          <label>
            Your name
            <input
              autoComplete="name"
              value={name}
              required
              minLength={2}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            value={email}
            maxLength={254}
            required
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            value={password}
            required
            minLength={mode === "register" ? 12 : 1}
            maxLength={128}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "register" ? "At least 12 characters" : "Your password"
            }
          />
        </label>
        {mode === "register" && (
          <>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                required
              />
              <span>I confirm I’m 18 or older.</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rules}
                onChange={(e) => setRules(e.target.checked)}
                required
              />
              <span>
                I’ll respect boundaries, keep dares safe, and never pressure
                someone to share or continue.
              </span>
            </label>
            <div className="subtle-note">
              <LockKeyhole size={16} />
              <p>
                Your account starts private. Age is self-declared in this
                prototype; identity and age verification aren’t connected yet.
                Preview posts stay in preview.
              </p>
            </div>
          </>
        )}
        <FormError error={error} />
        <button className="button primary full" disabled={busy}>
          {busy ? (
            "One little moment…"
          ) : mode === "register" ? (
            <>
              Find your people <ArrowRight size={16} />
            </>
          ) : (
            "Welcome back"
          )}
        </button>
      </form>
    </Modal>
  );
}
export function DareDialog({
  state,
  dare,
  refresh,
  onClose,
  navigate,
  onChat,
}: AppActions & {
  dare: Dare;
  onClose: () => void;
  onChat: (id: string) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await send<{ match: Match }>(`/dares/${dare.id}/accept`, {
        consent,
      });
      setMatch(result.match);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const sample = async () => {
    if (!match) return;
    setBusy(true);
    try {
      await send(`/matches/${match.id}/preview-accept`);
      await refresh();
      onClose();
      onChat(match.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (match)
    return (
      <Modal
        title="You’ve said yes"
        eyebrow="YOUR PARTNER GETS TO CHOOSE TOO"
        onClose={onClose}
      >
        <div className="match-success">
          <span className="match-avatars">
            <Avatar user={state.user} size="large" />
            <span>
              <Zap size={18} />
            </span>
            <Avatar user={match.peer} size="large" />
          </span>
          <h3>You + {match.peer.name.split(" ")[0]}</h3>
          <span className="tag">
            <Clock3 size={13} />
            Waiting for mutual acceptance
          </span>
          <p>
            You’ve accepted <strong>{dare.title}</strong>. Chat will open only
            when your partner accepts too.
          </p>
        </div>
        {state.user.demo ? (
          <div className="preview-notice">
            <Sparkles size={17} />
            <p>
              <strong>This is a sample connection.</strong> No real person is
              being contacted. Try the next step to explore how mutual
              acceptance works.
            </p>
          </div>
        ) : (
          <div className="subtle-note">
            <ShieldCheck size={17} />
            <p>No pressure. Either person can leave at any time.</p>
          </div>
        )}
        <FormError error={error} />
        {state.user.demo && (
          <button
            className="button primary full"
            onClick={sample}
            disabled={busy}
          >
            {busy ? (
              "Opening sample chat…"
            ) : (
              <>
                Open sample chat <ArrowRight size={16} />
              </>
            )}
          </button>
        )}
        <button
          className="button light full"
          onClick={() => {
            onClose();
            navigate("My dares");
          }}
        >
          Go to my dares
        </button>
      </Modal>
    );
  return (
    <Modal
      title={dare.title}
      eyebrow="YOUR NEXT LITTLE ADVENTURE"
      onClose={onClose}
    >
      <DareArt dare={dare} />
      <p className="dialog-intro">{dare.description}</p>
      <div className="dare-dialog-meta">
        <span>
          <Clock3 size={15} />
          {dare.duration}
        </span>
        <span>
          <Users size={15} />
          You + one new person
        </span>
        <span>
          <ShieldCheck size={15} />
          Online only
        </span>
      </div>
      <h3 className="dialog-section-title">Before you start</h3>
      <ul className="rules">
        {dare.rules.map((r) => (
          <Rule key={r}>{r}</Rule>
        ))}
      </ul>
      <div className="consent-note">
        <LockKeyhole size={18} />
        <div>
          <strong>A yes from you. A yes from them.</strong>
          <p>
            Both people must accept before chat opens. Your private posts stay
            private. You can leave without a penalty.
          </p>
        </div>
      </div>
      <label className="checkbox-label consent-check">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>I’ve read the rules and I’m comfortable trying this dare.</span>
      </label>
      {state.user.verifiedOnly && (
        <p className="matching-summary">
          <BadgeCheck size={15} />
          Verified-only matching is on.
        </p>
      )}
      <FormError error={error} />
      <button
        className="button primary full"
        onClick={accept}
        disabled={!consent || busy}
      >
        {busy ? (
          "Finding a partner…"
        ) : (
          <>
            Accept dare <ArrowUpRight size={17} />
          </>
        )}
      </button>
      <p className="dialog-footnote">Not today? That’s always okay.</p>
    </Modal>
  );
}
export function EditProfileDialog({
  state,
  refresh,
  notify,
  onClose,
}: AppActions & { onClose: () => void }) {
  const [name, setName] = useState(state.user.name);
  const [bio, setBio] = useState(state.user.bio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await send("/me", { name, bio }, "PATCH");
      await refresh();
      notify("A little more you. Profile updated.");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="A little about you."
      eyebrow="YOUR STORY, YOUR WORDS"
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <div className="edit-avatar">
          <Avatar user={{ ...state.user, name }} size="large" />
          <p>
            A simple avatar. A little privacy.
            <br />
            <span>Your initials update with your name.</span>
          </p>
        </div>
        <label>
          Your name
          <input
            value={name}
            required
            minLength={2}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          A little introduction
          <textarea
            rows={4}
            maxLength={240}
            placeholder="The little things that make you, you…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <span className="character-count">{bio.length} / 240</span>
        <div className="subtle-note">
          <ShieldCheck size={17} />
          <p>
            Your name and introduction help people find you. Keep contact
            details and your location private.
          </p>
        </div>
        <FormError error={error} />
        <button className="button primary full" disabled={busy}>
          {busy ? (
            "Saving…"
          ) : (
            <>
              Save changes <Check size={16} />
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
export function ProfileDialog({
  state,
  user,
  open,
  act,
  onClose,
}: AppActions & { user: User; onClose: () => void }) {
  const [profile, setProfile] = useState<{
    user: User;
    posts: Post[];
    canSeePosts: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<{ user: User; posts: Post[]; canSeePosts: boolean }>(
      `/users/${user.id}`,
    )
      .then((p) => {
        if (live) setProfile(p);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [user.id]);
  const follow = state.follows.find((f) => f.following === user.id);
  return (
    <Modal
      title="A friendly face."
      eyebrow="A LITTLE HELLO COULD GO A LONG WAY"
      onClose={onClose}
    >
      <div className="profile-preview">
        <Avatar user={user} size="xl" />
        <h3>
          {user.name}
          {user.verified && <Verified />}
        </h3>
        <span className="tag">
          {user.private ? <LockKeyhole size={12} /> : <Users size={12} />}{" "}
          {user.private ? "Private profile" : "Public profile"}
        </span>
        <p>{user.bio || "A little story, still being written."}</p>
        {user.sample && (
          <span className="sample-profile-label">
            <Sparkles size={13} />
            Fictional preview profile
          </span>
        )}
        {state.user.id !== user.id && (
          <button
            className={`button ${follow ? "light" : "primary"}`}
            onClick={() =>
              act(
                () => send(`/users/${user.id}/follow`),
                follow
                  ? "Follow removed."
                  : user.private
                    ? "Follow request sent. Their posts stay private until they accept."
                    : "You’re following " + user.name.split(" ")[0] + ".",
              )
            }
          >
            {follow
              ? follow.status === "pending"
                ? "Request sent · Cancel"
                : "Following · Unfollow"
              : user.private
                ? "Request to follow"
                : "Say hello · Follow"}
            {!follow && <PlusIcon />}
          </button>
        )}
      </div>
      <FormError error={error} />
      {profile?.canSeePosts ? (
        <>
          <h3 className="dialog-section-title">A few little moments</h3>
          {profile.posts.length ? (
            <div className="profile-photo-grid">
              {profile.posts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => open({ kind: "comments", post: p })}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={`A moment shared by ${user.name}`}
                    />
                  ) : (
                    <span>{p.caption}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="quiet-note">No moments shared just yet.</div>
          )}
        </>
      ) : profile ? (
        <div className="private-profile-note">
          <LockKeyhole size={24} />
          <h4>A little space, kept private.</h4>
          <p>
            Follow {user.name.split(" ")[0]} to request access to their posts.
            Accepting a dare never unlocks a private profile.
          </p>
        </div>
      ) : (
        !error && (
          <p className="small-muted">Getting to know this little corner…</p>
        )
      )}
      {state.user.id !== user.id && (
        <div className="profile-safety-actions">
          <button onClick={() => open({ kind: "report", user })}>
            <Flag size={14} />
            Report profile
          </button>
          <button
            onClick={async () => {
              if (
                await act(
                  () => send(`/users/${user.id}/block`),
                  "Blocked. This person can no longer contact or match with you.",
                )
              )
                onClose();
            }}
          >
            <Shield size={14} />
            Block person
          </button>
        </div>
      )}
    </Modal>
  );
}
function PlusIcon() {
  return <span aria-hidden="true">＋</span>;
}
export function VerificationDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="A little more reassurance."
      eyebrow="UNDERSTANDING VERIFICATION"
      onClose={onClose}
    >
      <span className="verification-emblem">
        <BadgeCheck size={48} strokeWidth={1.5} />
      </span>
      <p className="dialog-intro">
        A verification badge should mean an identity check was completed. It
        never guarantees someone’s intentions or behavior.
      </p>
      <ul className="rules">
        <Rule>
          {DEMO_ONLY
            ? "Try the verified-only filter on our fictional sample profiles."
            : "Verified-only matching is enforced by the server."}
        </Rule>
        <Rule>Only fictional sample accounts have badges in this preview.</Rule>
        <Rule>
          New accounts are unverified. You can’t buy or give yourself a badge.
        </Rule>
      </ul>
      <div className="preview-notice">
        <ShieldCheck size={18} />
        <p>
          Real identity and age verification need a trusted provider before a
          public launch. Never upload identity documents through chat or a post.
        </p>
      </div>
      <button className="button primary full" onClick={onClose}>
        A little clearer. Got it. <Check size={16} />
      </button>
    </Modal>
  );
}
export function ReportDialog({
  user,
  post,
  notify,
  refresh,
  onClose,
}: AppActions & { user: User; post?: Post; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await send<{ id: string }>("/reports", {
        targetId: post?.id || user.id,
        reason,
        detail,
      });
      setReportId(r.id);
      if (block) {
        try {
          await send(`/users/${user.id}/block`);
          await refresh();
          notify("Person blocked.");
        } catch (e) {
          notify("Report saved, but blocking failed: " + (e as Error).message);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (reportId)
    return (
      <Modal
        title="You’ve taken a good step."
        eyebrow="THANK YOU FOR SPEAKING UP"
        onClose={onClose}
      >
        <div className="report-success">
          <CheckCircle2 size={45} />
          <p>
            {DEMO_ONLY
              ? "Sample report saved on this device."
              : "Your report has been saved."}
            <br />
            <strong>Reference: {reportId.slice(0, 8)}</strong>
          </p>
        </div>
        <div className="preview-notice">
          <Flag size={18} />
          <p>
            {DEMO_ONLY
              ? "This is a demo only. No report is sent to a moderation team. You can reset all sample data from Demo options."
              : "This prototype does not have a staffed moderation team. Reports are stored, but aren’t actively monitored. If you’re in immediate danger, contact your local emergency services."}
          </p>
        </div>
        <button className="button primary full" onClick={onClose}>
          Back to my space <ArrowRight size={16} />
        </button>
      </Modal>
    );
  return (
    <Modal
      title="Something doesn’t feel right?"
      eyebrow="YOUR VOICE MATTERS"
      onClose={onClose}
    >
      <p className="dialog-intro">
        Report {post ? "this post" : `${user.name}’s profile`}. The person won’t
        receive your report or your identity from this form.
      </p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          What’s going on?
          <select
            value={reason}
            required
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="" disabled>
              Choose a reason
            </option>
            {[
              "Harassment or bullying",
              "Unsafe or harmful content",
              "Unwanted sexual content",
              "Fake profile or underage user",
              "Something else",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          A little more detail <span className="optional">(optional)</span>
          <textarea
            maxLength={1000}
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Tell us what happened. Don’t include personal contact details."
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={block}
            onChange={(e) => setBlock(e.target.checked)}
          />
          <span>
            Also block {user.name.split(" ")[0]}. End contact and prevent future
            matching.
          </span>
        </label>
        <FormError error={error} />
        <button className="button primary full" disabled={busy || !reason}>
          {busy ? (
            "Saving your report…"
          ) : (
            <>
              Save report <Flag size={16} />
            </>
          )}
        </button>
        <p className="dialog-footnote">
          Prototype reports aren’t actively monitored.
        </p>
      </form>
    </Modal>
  );
}
export function CommentsDialog({
  post,
  state,
  refresh,
  onClose,
}: AppActions & { post: Post; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<{ comments: Comment[] }>(`/posts/${post.id}/comments`)
      .then((r) => {
        if (live) setComments(r.comments);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [post.id]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await send(`/posts/${post.id}/comments`, { text });
      setText("");
      setComments(
        (await api<{ comments: Comment[] }>(`/posts/${post.id}/comments`))
          .comments,
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="A little shared moment."
      eyebrow="LEAVE A LITTLE KINDNESS"
      onClose={onClose}
      wide
    >
      <div className="comments-layout">
        {post.image && (
          <img
            className="comments-photo"
            src={post.image}
            alt={`A moment shared by ${post.user.name}`}
          />
        )}
        <div>
          <div className="compose-author">
            <Avatar user={post.user} />
            <div>
              <strong>{post.user.name}</strong>
              <small>
                {post.user.sample
                  ? "Fictional preview profile"
                  : "Community member"}
              </small>
            </div>
          </div>
          <p className="comment-caption">{post.caption}</p>
          <div className="comment-list">
            {comments.map((c) => (
              <div className="comment-row" key={c.id}>
                <Avatar user={c.user} size="small" />
                <div>
                  <strong>{c.user.name}</strong>
                  <p>{c.text}</p>
                </div>
              </div>
            ))}
            {!comments.length && (
              <EmptyState
                icon={<MessageCircle size={22} />}
                title="A conversation waiting to happen."
              >
                A kind word is a lovely place to start.
              </EmptyState>
            )}
          </div>
          <FormError error={error} />
          <form className="comment-form" onSubmit={submit}>
            <Avatar user={state.user} size="small" />
            <input
              aria-label="Your comment"
              placeholder="A little kindness…"
              value={text}
              maxLength={1000}
              required
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="icon-button"
              type="submit"
              disabled={busy || !text.trim()}
              aria-label="Send comment"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
