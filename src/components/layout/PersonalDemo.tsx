"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAccountRefreshHeld } from "@/lib/account/account-state-events";
import styles from "./personal-demo.module.css";

type Notice = { kind: "ended" | "connected" | "declined"; code?: string; balance?: number };
type Demo = {
  code: string;
  guest: boolean;
  guests: number;
  paired: boolean;
  sharing: boolean;
  pending: string | null;
  waiting: boolean;
  balance: number;
  revision: string | null;
  notice: Notice | null;
  token?: string;
  sharedCode?: string;
};
type Panel = "" | "menu" | "device" | "entry" | "wait" | "approve" | "join" | "end" | "ended" | "tip";
type CopyResult = { personal: boolean; manual: string | null };
const site = "https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app/";
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
const tipKey = "zl-personal-demo-intro";
function seenTip() {
  try {
    return localStorage.getItem(tipKey) === "seen";
  } catch {
    return false;
  }
}
function dismissTip() {
  try {
    localStorage.setItem(tipKey, "seen");
  } catch {
    /* Browsing still works. */
  }
}

async function command(
  action: string,
  value = "",
): Promise<Demo & { missing?: boolean; registered?: boolean }> {
  const response = await fetch("/api/personal-demo", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, value }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Couldn’t load your demo. Try again.");
  return result;
}
function linkInAddress() {
  return new URLSearchParams(location.hash.slice(1)).get("demo-invite") ?? "";
}
function finishLink() {
  if (linkInAddress()) history.replaceState(history.state, "", location.pathname + location.search);
}
let starting: ReturnType<typeof command> | undefined;
function startDemo() {
  if (!starting) {
    const ensure = async () => {
      let result = await command("state");
      if (result.missing) result = await command("start");
      if (result.missing) result = await command("start");
      return result;
    };
    const serialized = async () =>
      navigator.locks ? await navigator.locks.request("zero-loss-demo-start", ensure) : await ensure();
    starting = serialized().finally(() => {
      starting = undefined;
    });
  }
  return starting;
}
function onShoppingForm() {
  return (
    /\/wallet|\/purchase-options|\/checkout|\/identity/.test(location.pathname) ||
    Boolean(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) ||
    isAccountRefreshHeld()
  );
}
export function PersonalDemo({ hasDemoAccount }: { hasDemoAccount: boolean }) {
  const pathname = usePathname(),
    router = useRouter();
  const [demo, setDemo] = useState<Demo | null>(null),
    [panel, setPanel] = useState<Panel>("");
  const [code, setCode] = useState(""),
    [offer, setOffer] = useState(""),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [copied, setCopied] = useState<CopyResult | null>(null);
  const [desktop, setDesktop] = useState(false),
    [attempt, setAttempt] = useState(0);
  const current = useRef<Demo | null>(null),
    inFlight = useRef(false),
    version = useRef(0),
    tipSeen = useRef(false);
  const chip = useRef<HTMLButtonElement>(null),
    digits = useRef<HTMLElement>(null),
    tip = useRef<HTMLElement>(null);
  const invite = useRef(""),
    pendingRefresh = useRef(false);
  const authPage = /^\/(login|signup|auth|reset-password|forgot-password)(\/|$)/.test(pathname);
  const close = useCallback(() => {
    if (panel === "tip") {
      tipSeen.current = true;
      dismissTip();
    }
    if (panel === "join") {
      finishLink();
      invite.current = "";
    }
    if (current.current?.notice) void command("ack").catch(() => {});
    setPanel("");
    setError("");
    setCopied(null);
    setMessage("");
    chip.current?.focus({ preventScroll: true });
  }, [panel]);
  const update = useCallback(
    (data: Demo, action = "state") => {
      const previous = current.current;
      current.current = data;
      setDemo(data);
      if (
        data.notice?.kind === "ended" &&
        (previous?.notice?.kind !== "ended" || previous.notice.code !== data.notice.code)
      )
        setPanel("ended");
      else if (data.pending && previous?.pending !== data.pending) setPanel("approve");
      else if (data.notice?.kind === "connected" && previous?.notice?.kind !== "connected") {
        setPanel("menu");
        setMessage("Connected. Both devices now use demo " + data.code + ".");
      } else if (data.notice?.kind === "declined" && previous?.notice?.kind !== "declined") {
        setPanel("entry");
        setError("The connection was declined. You can try again.");
      } else if (action === "state" && previous?.waiting && !data.waiting && !data.notice) {
        setPanel("entry");
        setError("The request expired. Enter the code again.");
      }
      if (previous?.pending && !data.pending) setPanel((old) => (old === "approve" ? "menu" : old));
      if (previous && previous.code !== data.code) {
        setCopied(null);
        router.refresh();
      } else if (previous && (previous.revision !== data.revision || previous.balance !== data.balance))
        pendingRefresh.current = true;
      if (pendingRefresh.current && !isAccountRefreshHeld()) {
        pendingRefresh.current = false;
        router.refresh();
      }
    },
    [router],
  );

  useEffect(() => {
    const media = matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (authPage) return;
    let live = true,
      timer: ReturnType<typeof setTimeout>,
      checking = false;
    async function read(initial = false) {
      if (checking || inFlight.current || document.hidden || !live) return;
      checking = true;
      const epoch = version.current;
      try {
        let data = await (initial ? startDemo() : command("state"));
        if (data.missing) data = await startDemo();
        if (!live || epoch !== version.current || data.registered || !data.code) return;
        const first = !current.current;
        update(data);
        if (first && !hasDemoAccount) router.refresh();
        const token = linkInAddress();
        if (token && invite.current !== token) {
          invite.current = token;
          const offered = await command("inspect", token);
          if (live && epoch === version.current) {
            if (offered.sharedCode === data.code) {
              finishLink();
            } else {
              setOffer(offered.sharedCode ?? "");
              setPanel("join");
            }
          }
        }
      } catch (e) {
        if (live && (initial || linkInAddress())) {
          setError(e instanceof Error ? e.message : "Couldn’t reach your demo.");
          setPanel("menu");
          if (linkInAddress()) finishLink();
        }
      } finally {
        checking = false;
      }
    }
    async function poll() {
      await read(!current.current);
      if (live)
        timer = setTimeout(
          poll,
          current.current?.guests ||
            current.current?.guest ||
            current.current?.waiting ||
            current.current?.paired
            ? 4500
            : 12000,
        );
    }
    void poll();
    const onFocus = () => {
      if (!document.hidden) void read(!current.current);
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    window.addEventListener("hashchange", onFocus);
    return () => {
      live = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("hashchange", onFocus);
    };
  }, [authPage, hasDemoAccount, router, update, attempt]);
  useEffect(() => {
    if (authPage || !hasDemoAccount || !demo || panel || tipSeen.current || seenTip() || demo.guest) return;
    let seconds = 0;
    try {
      seconds = Number(sessionStorage.getItem(tipKey)) || 0;
    } catch {}
    const interval = setInterval(() => {
      if (document.hidden || onShoppingForm() || seenTip()) return;
      seconds += 2;
      if (seconds % 10 === 0)
        try {
          sessionStorage.setItem(tipKey, String(seconds));
        } catch {}
      if (seconds >= 120) {
        tipSeen.current = true;
        dismissTip();
        setPanel("tip");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [authPage, hasDemoAccount, Boolean(demo), demo?.guest, panel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (panel !== "tip" || !tip.current || !digits.current) return;
    const box = tip.current,
      number = digits.current;
    function align() {
      const card = box.getBoundingClientRect(),
        target = number.getBoundingClientRect();
      box.style.setProperty("--pointer-x", String(target.left + target.width / 2 - card.left) + "px");
    }
    align();
    const observer = new ResizeObserver(align);
    observer.observe(box);
    observer.observe(number);
    if (chip.current) observer.observe(chip.current);
    window.addEventListener("resize", align);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
    };
  }, [panel, demo?.code]);
  useEffect(() => {
    if (!panel) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [panel, close]);
  const act = async (action: string, value = "", next: Panel = "menu") => {
    if (inFlight.current) return;
    inFlight.current = true;
    version.current++;
    setBusy(true);
    setError("");
    setMessage("");
    setCopied(null);
    try {
      const data = await command(action, value);
      if (!data.code) throw Error("Reopen your demo and try again.");
      if (action === "join" || action === "leave") {
        finishLink();
        invite.current = "";
      }
      setPanel(next);
      update(data, action);
      if (action === "revoke") setMessage("Guest sharing ended.");
      if (action === "leave")
        setMessage(
          demo?.guest ? "You left the shared wallet. Your own demo is ready." : "Your own demo is ready.",
        );
      if (action === "allow") setMessage("Your desktop is connected.");
      if (action === "ack") chip.current?.focus({ preventScroll: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  async function copy(personal: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    version.current++;
    setBusy(true);
    setCopied(null);
    setMessage("");
    setError("");
    const payload = personal
      ? command("share").then((data) => {
          if (!data.token) throw Error("Couldn’t create your sharing link.");
          update(data);
          return site + "#demo-invite=" + data.token;
        })
      : Promise.resolve(site);
    try {
      let didCopy = false;
      // WebKit needs clipboard access within the initiating tap even while
      // the server is preparing a new guest link.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": payload.then((url) => new Blob([url], { type: "text/plain" })),
            }),
          ]);
          didCopy = true;
        } catch {}
      }
      const url = await payload;
      if (!didCopy)
        try {
          await navigator.clipboard.writeText(url);
          didCopy = true;
        } catch {}
      if (!didCopy) {
        const field = document.createElement("textarea");
        field.value = url;
        field.style.cssText = "position:fixed;opacity:0";
        document.body.append(field);
        field.select();
        try {
          didCopy = document.execCommand("copy");
        } catch {
        } finally {
          field.remove();
        }
      }
      setCopied({ personal, manual: didCopy ? null : url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t copy your link.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (authPage || (!demo && !error)) return null;
  const open = (next: Panel) => {
    setError("");
    setMessage("");
    setCopied(null);
    setPanel(next);
  };
  const openMenu = () => {
    dismissTip();
    tipSeen.current = true;
    if (panel) close();
    else
      open(
        demo?.notice?.kind === "ended"
          ? "ended"
          : demo?.pending
            ? "approve"
            : demo?.waiting
              ? "wait"
              : "menu",
      );
  };
  const title = {
    menu: "Demo tools",
    device: "Continue on your desktop",
    entry: "Enter code from my phone",
    wait: "Waiting for your phone",
    approve: "Connect your desktop?",
    join: "Join demo " + offer + "?",
    end: "End guest sharing?",
    ended: "Your friend ended sharing",
    tip: "Your demo code is " + demo?.code,
  }[panel || "menu"];
  return (
    <div className={styles.dock}>
      <div className={styles.anchor}>
        <button
          ref={chip}
          className={styles.chip}
          type="button"
          onClick={openMenu}
          aria-expanded={Boolean(panel)}
          aria-controls="personal-demo-panel"
        >
          <svg
            aria-hidden="true"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m10 13 4-4m-6 2-2 2a4 4 0 0 0 6 6l3-3m1-3 2-2a4 4 0 0 0-6-6l-3 3" />
          </svg>{" "}
          {demo?.guest ? "Shared demo" : "Demo"} · <b ref={digits}>{demo?.code ?? "…"}</b>
        </button>
        {panel && (
          <section
            ref={tip}
            id="personal-demo-panel"
            className={panel === "tip" ? styles.tip : styles.panel}
            aria-label={title}
          >
            <div className={styles.heading}>
              <h2>{title}</h2>
              {panel !== "tip" && (
                <button type="button" aria-label="Close demo tools" onClick={close}>
                  ×
                </button>
              )}
            </div>
            {panel === "tip" && (
              <>
                <p>
                  <strong>
                    We give you a demo number so you can try Zero Loss without sharing your name, email
                    address, or phone number.
                  </strong>
                </p>
                <p>
                  Your demo funds, prizes, and purchase options are saved automatically. Tap the white{" "}
                  <b>Demo</b> box to switch devices or share with a friend.
                </p>
                <button onClick={close}>Got it</button>
              </>
            )}
            {panel === "menu" &&
              demo &&
              (demo.guest ? (
                <>
                  <p className={styles.status}>
                    You’re using a shared version of Zero Loss. You and your friend use the same demo wallet.
                  </p>
                  <button disabled={busy} onClick={() => void act("leave")}>
                    Start my own demo
                  </button>
                </>
              ) : (
                <>
                  {demo.guests > 0 && <p>A guest can see and use your demo wallet.</p>}
                  <div className={styles.choices}>
                    <button disabled={busy} onClick={() => void copy(false)}>
                      Copy website link
                    </button>
                    <button
                      onClick={() => {
                        setCode("");
                        open(desktop ? "entry" : "device");
                      }}
                    >
                      {desktop ? "Enter code from my phone" : "Use on my desktop"}
                    </button>
                    <button disabled={busy} onClick={() => void copy(true)}>
                      Share my demo with a friend<small>So we can use it together.</small>
                    </button>
                  </div>
                  {demo.sharing && (
                    <div className={styles.manage}>
                      <span>{demo.guests ? "Guest connected" : "Sharing link active"}</span>
                      <button onClick={() => open("end")}>End guest sharing</button>
                    </div>
                  )}
                </>
              ))}
            {panel === "device" && (
              <>
                <p>
                  Your demo code <strong className={styles.number}>{demo?.code}</strong>
                </p>
                <p>
                  On your desktop, open <b>Demo</b> and choose <b>Enter code from my phone</b>. Then approve
                  the connection on this phone.
                </p>
              </>
            )}
            {panel === "entry" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act("request", code, "wait");
                }}
              >
                <label htmlFor="personal-demo-code">
                  Use the four digits in the white Demo box on your phone.
                </label>
                <div className={styles.row}>
                  <input
                    id="personal-demo-code"
                    value={code}
                    placeholder="4 digits"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                  <button disabled={busy || code.length !== 4}>Continue</button>
                </div>
              </form>
            )}
            {panel === "wait" && (
              <>
                <p>Approve this connection on the phone showing that code.</p>
                <button disabled={busy} onClick={() => void act("cancel", "", "entry")}>
                  Cancel
                </button>
              </>
            )}
            {panel === "approve" && (
              <>
                <p>
                  A desktop entered your code. Approve only if you just entered it on your own desktop. It
                  will use the same demo wallet and prizes.
                </p>
                <div className={styles.row}>
                  <button disabled={busy} onClick={() => void act("allow", demo?.pending ?? "")}>
                    Connect device
                  </button>
                  <button disabled={busy} onClick={() => void act("deny", demo?.pending ?? "")}>
                    Decline
                  </button>
                </div>
              </>
            )}
            {panel === "join" && (
              <>
                <p>If you join, you and your friend will share a demo wallet and see the same prizes.</p>
                <div className={styles.row}>
                  <button disabled={busy} onClick={() => void act("join", invite.current)}>
                    Join your friend’s demo
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (demo?.guest) {
                        void act("leave");
                        return;
                      }
                      finishLink();
                      invite.current = "";
                      open("menu");
                      setMessage("Your own demo is ready.");
                    }}
                  >
                    Start my own demo
                  </button>
                </div>
              </>
            )}
            {panel === "end" && (
              <>
                <p>Your own devices stay connected. Your guest can continue in their own demo.</p>
                <div className={styles.row}>
                  <button disabled={busy} onClick={() => void act("revoke")}>
                    End sharing
                  </button>
                  <button onClick={() => open("menu")}>Keep sharing</button>
                </div>
              </>
            )}
            {panel === "ended" && demo?.notice && (
              <>
                <p>
                  You’re disconnected from demo <b>{demo.notice.code}</b> and its shared wallet. Its{" "}
                  <b>{money(demo.notice.balance ?? 0)}</b> balance stayed in that wallet.
                </p>
                <p className={styles.status}>
                  Your own demo <b>{demo.code}</b> · <b>{money(demo.balance)}</b>
                </p>
                <button disabled={busy} onClick={() => void act("ack", "", "")}>
                  {demo.balance || demo.revision ? "Continue with my demo" : "Start my own demo"}
                </button>
              </>
            )}
            {copied && (
              <div className={styles.confirmation} role="status">
                <strong>
                  {copied.manual
                    ? "Copy the " + (copied.personal ? "personal demo" : "public website") + " link below."
                    : (copied.personal ? "Personal demo" : "Public website") + " link copied."}
                </strong>
                <strong>
                  Paste it into {desktop ? "an email" : "a text"} to{" "}
                  {copied.personal ? "share your demo with a friend." : "share it with anyone."}
                </strong>
                {copied.manual && (
                  <input
                    aria-label="Link to copy"
                    readOnly
                    value={copied.manual}
                    onFocus={(e) => e.target.select()}
                  />
                )}
              </div>
            )}
            {message && (
              <p className={styles.status} role="status">
                {message}
              </p>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}{" "}
                {!demo && (
                  <button
                    onClick={() => {
                      current.current = null;
                      setError("");
                      setAttempt((n) => n + 1);
                    }}
                  >
                    Try again
                  </button>
                )}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
