import { useEffect, useId, useRef } from "react";
import {
  BadgeCheck,
  X,
  Zap,
  Check,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import type { User, Dare } from "./types";

export function Avatar({
  user,
  size = "normal",
}: {
  user: User;
  size?: "small" | "normal" | "large" | "xl";
}) {
  return (
    <span
      className={`avatar avatar-${size} tone-${user.name.charCodeAt(0) % 4}`}
    >
      {user.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>
          {user.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </span>
  );
}
export function Verified({ small = false }: { small?: boolean }) {
  return (
    <BadgeCheck
      className={`verified-icon ${small ? "small" : ""}`}
      aria-label="Verified sample profile"
    />
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`toggle ${checked ? "on" : ""}`}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    const controls = () =>
      Array.from(
        el?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select, textarea, a[href], [tabindex="0"]',
        ) || [],
      );
    controls()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const elements = controls();
        const first = elements[0];
        const last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Zap size={23} fill="currentColor" strokeWidth={1.5} />
      </span>
      dareme<span className="brand-dot">.</span>
    </span>
  );
}
export function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 350 270"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="189"
        cy="147"
        rx="130"
        ry="94"
        stroke="#91A68A"
        strokeDasharray="4 7"
        transform="rotate(-24 189 147)"
        opacity=".6"
      />
      <path d="m50 63 4-14 6 12 14 4-13 6-5 14-5-14-13-5z" fill="#D5DFAD" />
      <path d="m299 185 3-12 5 10 12 3-10 6-4 11-4-11-11-3z" fill="#F3AA80" />
      <g transform="rotate(-13 126 139)">
        <rect
          x="64"
          y="66"
          width="128"
          height="155"
          rx="7"
          fill="#102C23"
          opacity=".3"
        />
        <rect x="58" y="59" width="128" height="155" rx="7" fill="#F3F0DF" />
        <rect x="69" y="70" width="106" height="111" rx="3" fill="#EEAC83" />
        <path
          d="M91 144c-7-29 11-52 34-51 25 1 40 29 30 53-7 20-49 25-64-2"
          fill="#F5C4A4"
        />
        <path
          d="M111 121v8m24-8v8"
          stroke="#56413B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M109 141q14 15 28-2"
          stroke="#56413B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="m83 87 7 4m60 69 9 4"
          stroke="#FAE7D4"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M95 198h54"
          stroke="#A6A78C"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(12 232 135)">
        <rect
          x="175"
          y="91"
          width="126"
          height="151"
          rx="7"
          fill="#102C23"
          opacity=".25"
        />
        <rect x="170" y="84" width="126" height="151" rx="7" fill="#FAF5E9" />
        <rect x="181" y="95" width="104" height="108" rx="3" fill="#BFC2DD" />
        <path
          d="M205 155c-8-7-9-22 0-27 9-6 19 5 23 9 7-9 19-12 25-4 11 16-12 37-22 45-6-5-18-15-26-23"
          fill="#E1E3F3"
        />
        <path
          d="m220 143 1 5m17-8 1 5m-17 11q8 6 13-2"
          stroke="#4E536F"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M206 219h52"
          stroke="#ACAFBD"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(12 239 61)">
        <path d="m205 55 58-16-16 50-12-22z" fill="#DCE6B8" />
        <path d="m235 67 28-28" stroke="#6E8963" strokeWidth="2" />
        <path d="m235 67 1 14 11 8" fill="#B6C69D" />
      </g>
      <circle cx="79" cy="220" r="21" fill="#D9E3B6" />
      <path
        d="m70 220 6 6 12-13"
        stroke="#38553D"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m312 95-5 4m-11-19 1 7m27 27-8-1"
        stroke="#DCE6B8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function DareArt({ dare }: { dare: Dare }) {
  return (
    <div className={`dare-art ${dare.color}`}>
      {dare.icon === "camera" ? (
        <svg viewBox="0 0 240 140" fill="none" aria-hidden="true">
          <circle cx="172" cy="41" r="29" fill="#EFBB93" opacity=".45" />
          <path
            d="M47 99q16-10 27 3m87-46q13 9 25-4"
            stroke="#D39772"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <g transform="rotate(-10 118 72)">
            <rect
              x="74"
              y="36"
              width="95"
              height="72"
              rx="12"
              fill="#F5E7D6"
              stroke="#805C47"
              strokeWidth="2"
            />
            <path
              d="m92 36 7-12h37l8 12"
              fill="#F5E7D6"
              stroke="#805C47"
              strokeWidth="2"
            />
            <circle
              cx="123"
              cy="72"
              r="23"
              fill="#D6A981"
              stroke="#805C47"
              strokeWidth="2"
            />
            <circle
              cx="123"
              cy="72"
              r="15"
              fill="#F9F2E6"
              stroke="#805C47"
              strokeWidth="1.5"
            />
            <path d="m116 75 7-12 5 10-5 9z" fill="#B37551" />
            <rect x="84" y="44" width="12" height="6" rx="2" fill="#D6A981" />
          </g>
          <path d="m52 39 2-9 4 7 8 3-8 3-3 8-3-8-8-2z" fill="#A76E4D" />
          <path d="m190 103 2-7 3 6 7 2-6 3-3 7-2-7-7-2z" fill="#A76E4D" />
        </svg>
      ) : (
        <svg viewBox="0 0 240 140" fill="none" aria-hidden="true">
          <circle cx="78" cy="54" r="28" fill="#C5C2E1" opacity=".5" />
          <g transform="rotate(8 119 77)">
            <rect
              x="80"
              y="25"
              width="81"
              height="91"
              rx="5"
              fill="#F6F4ED"
              stroke="#77718F"
              strokeWidth="1.5"
            />
            <path
              d="M93 47h37M93 55h23"
              stroke="#D4D1DF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M106 83c-19-15-4-32 9-18 15-17 31 1 9 21l-8 8z"
              stroke="#9B7FA8"
              strokeWidth="2.5"
              fill="#E7D6E3"
            />
            <path
              d="m139 101 38-54 7 5-38 54-10 7z"
              fill="#F2D39D"
              stroke="#77718F"
              strokeWidth="1.5"
            />
            <path d="m136 113 3-12 7 5z" fill="#77718F" />
          </g>
          <path d="m181 26 2-8 4 6 7 3-7 3-3 8-2-8-8-2z" fill="#8982AE" />
          <path
            d="M53 96q6 2 9-4m116-12 9-2"
            stroke="#8982AE"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span className="online-pill">
        <span />
        Online · No meetup needed
      </span>
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function SafetyStrip({ onClick }: { onClick: () => void }) {
  return (
    <button className="safety-strip" onClick={onClick}>
      <ShieldCheck size={18} />
      <span>Your pace. Your boundaries. Always.</span>
      <ArrowUpRight size={16} />
    </button>
  );
}
export function Rule({ children }: { children: ReactNode }) {
  return (
    <li className="rule">
      <span>
        <Check size={14} />
      </span>
      {children}
    </li>
  );
}
