"use client";

import { BellRing, Check, Share, SquarePlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { StateMark } from "@/components/day/marks";

type Step = "install" | "alarms" | "test" | "done";
type AlarmState = "idle" | "working" | "on" | "denied" | "unsupported" | "needs-install" | "error";
type SaveSubscription = (sub: unknown) => Promise<{ ok: boolean }>;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Device facts read once on the client (server render assumes a plain browser).
const subscribe = () => () => {};
function useDevice() {
  const isIOS = useSyncExternalStore(subscribe, () => /iPhone|iPad|iPod/.test(navigator.userAgent), () => false);
  const standalone = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
  return { isIOS, standalone };
}

function Progress({ step }: { step: Step }) {
  const order: Step[] = ["install", "alarms", "test"];
  const at = order.indexOf(step);
  return (
    <ol aria-label="Setup progress" className="flex items-center gap-2">
      {order.map((s, i) => (
        <li key={s} aria-current={i === at ? "step" : undefined}>
          <span className="sr-only">{["Install", "Alarms", "Test"][i]}: {i < at || step === "done" ? "done" : i === at ? "current" : "to do"}</span>
          <StateMark state={i < at || step === "done" ? "done" : i === at ? "due" : "upcoming"} />
        </li>
      ))}
    </ol>
  );
}

function Primary({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[10px] bg-ribbon-fill px-6 text-[1.1875rem] font-semibold text-ribbon-fill-ink transition-[background-color,transform] duration-150 active:scale-[0.985] active:bg-ribbon-press disabled:opacity-70"
    >
      {children}
    </button>
  );
}

function Quiet({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-12 w-full rounded-[8px] border border-rule px-5 text-base font-medium text-ink">
      {children}
    </button>
  );
}

export function OnboardingFlow({ name, vapidKey, save, todayHref = "/", calendarUrl = null }: { name: string; vapidKey: string | null; save: SaveSubscription | null; todayHref?: string; calendarUrl?: string | null }) {
  const { isIOS, standalone } = useDevice();
  const [step, setStep] = useState<Step>("install");
  const [alarm, setAlarm] = useState<AlarmState>("idle");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const turnOnAlarms = async () => {
    if (isIOS && !standalone) return setAlarm("needs-install");
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return setAlarm("unsupported");
    setAlarm("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setAlarm("denied");
      if (vapidKey && save && "PushManager" in window) {
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }));
        const r = await save(sub.toJSON());
        if (!r.ok) return setAlarm("error");
      }
      setAlarm("on");
    } catch {
      setAlarm("error");
    }
  };

  const sendTest = async () => {
    try {
      const reg = (await navigator.serviceWorker?.getRegistration()) ?? null;
      await reg?.showNotification("Time for Caltrate", {
        body: "This is how Bloom will remind you. Tap to open your page.",
        icon: "/icons/icon-192.png",
        requireInteraction: true,
        tag: "bloom-test",
      });
    } finally {
      setTested(true);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10">
      <Progress step={step} />

      {step === "install" ? (
        <section aria-labelledby="install" className="flex flex-1 flex-col gap-6">
          <div>
            <h1 id="install" className="font-serif text-[2.125rem] leading-[1.1] text-balance">
              {standalone ? `Bloom is on your Home Screen, ${name}` : "Keep Bloom on your Home Screen"}
            </h1>
            <p className="mt-2 text-[1.0625rem] text-pretty text-ink-soft">
              {standalone
                ? "It opens like an app and stays signed in."
                : isIOS
                  ? "On iPhone, alarms only work when Bloom is opened from the Home Screen. It takes a few seconds."
                  : "It opens like an app, stays signed in, and can ring alarms."}
            </p>
          </div>

          {!standalone && isIOS ? (
            <ol className="flex flex-col divide-y divide-rule/70 border-y border-rule/70">
              <li className="flex items-center gap-4 py-4">
                <Share aria-hidden className="size-7 shrink-0 text-ink" />
                <span>
                  Tap <strong className="font-semibold">Share</strong> in Safari&apos;s toolbar.
                </span>
              </li>
              <li className="flex items-center gap-4 py-4">
                <SquarePlus aria-hidden className="size-7 shrink-0 text-ink" />
                <span>
                  Choose <strong className="font-semibold">Add to Home Screen</strong>, then Add.
                </span>
              </li>
              <li className="flex items-center gap-4 py-4">
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/icon-192.png" alt="" className="size-7 rounded-[6px]" />
                </span>
                <span>
                  Open <strong className="font-semibold">Bloom</strong> from your Home Screen and sign in once there.
                </span>
              </li>
            </ol>
          ) : null}

          {!standalone && !isIOS ? (
            installEvent ? null : (
              <p className="text-[1.0625rem] text-ink-soft">In your browser&apos;s menu, choose Install app or Add to Home screen.</p>
            )
          ) : null}

          <div className="mt-auto flex flex-col gap-3">
            {!standalone && installEvent ? (
              <Primary
                onClick={async () => {
                  await installEvent.prompt();
                  await installEvent.userChoice;
                  setInstallEvent(null);
                }}
              >
                Install Bloom
              </Primary>
            ) : (
              <Primary onClick={() => setStep("alarms")}>{standalone ? "Next: alarms" : "I've added it"}</Primary>
            )}
            {!standalone ? <Quiet onClick={() => setStep("alarms")}>Do this later</Quiet> : null}
          </div>
        </section>
      ) : null}

      {step === "alarms" ? (
        <section aria-labelledby="alarms" className="flex flex-1 flex-col gap-6">
          <div>
            <h1 id="alarms" className="font-serif text-[2.125rem] leading-[1.1] text-balance">
              Turn on dose alarms
            </h1>
            <p className="mt-2 text-[1.0625rem] text-pretty text-ink-soft">Bloom rings when a dose is due, nudges again after 15 minutes, and lets you tap Taken right from the alarm.</p>
          </div>
          <div role="status" className="text-[1.0625rem]">
            {alarm === "on" ? (
              <p className="flex items-center gap-2 text-ink">
                <Check aria-hidden className="size-5" /> Alarms are on for this phone.
              </p>
            ) : alarm === "denied" ? (
              <p className="text-pretty text-ink">
                Alarms are blocked. {isIOS ? "Open the iPhone Settings app → Notifications → Bloom, and allow notifications." : "Allow notifications for Bloom in your browser's site settings."} Then come back here.
              </p>
            ) : alarm === "needs-install" ? (
              <p className="text-pretty text-ink">Open Bloom from your Home Screen first. iPhone only allows alarms there.</p>
            ) : alarm === "unsupported" ? (
              <p className="text-pretty text-ink">This browser can&apos;t show alarms. Emails will still reach you.</p>
            ) : alarm === "error" ? (
              <p className="text-pretty text-ribbon">Something went wrong turning alarms on. Try again in a moment.</p>
            ) : null}
            {alarm === "on" && !vapidKey ? <p className="mt-1 text-[0.9375rem] text-ink-soft">Bloom will start sending alarms here as soon as reminders are switched on for your household.</p> : null}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            {alarm === "on" ? (
              <Primary onClick={() => setStep("test")}>Next: try it</Primary>
            ) : (
              <Primary onClick={turnOnAlarms} disabled={alarm === "working"}>
                <BellRing aria-hidden className="size-6" />
                Turn on alarms
              </Primary>
            )}
            {calendarUrl ? (
              <a href={calendarUrl} className="flex min-h-12 w-full items-center justify-center rounded-[8px] border border-rule px-5 text-base font-medium text-ink">
                {alarm === "on" ? "Also add Calendar alarms (backup)" : "Use Calendar alarms instead"}
              </a>
            ) : null}
            {alarm !== "on" ? <Quiet onClick={() => setStep("done")}>Skip for now</Quiet> : null}
          </div>
        </section>
      ) : null}

      {step === "test" ? (
        <section aria-labelledby="test" className="flex flex-1 flex-col gap-6">
          <div>
            <h1 id="test" className="font-serif text-[2.125rem] leading-[1.1] text-balance">
              Try a test alarm
            </h1>
            <p className="mt-2 text-[1.0625rem] text-pretty text-ink-soft">So you know what Bloom sounds and looks like. On iPhone, lock the screen to see it arrive.</p>
          </div>
          {tested ? <p role="status">Sent. If nothing appeared, check that Focus or Do Not Disturb isn&apos;t on.</p> : null}
          <div className="mt-auto flex flex-col gap-3">
            {tested ? <Primary onClick={() => setStep("done")}>It worked</Primary> : <Primary onClick={sendTest}>Send a test alarm</Primary>}
            {tested ? <Quiet onClick={sendTest}>Send another</Quiet> : <Quiet onClick={() => setStep("done")}>Skip</Quiet>}
          </div>
        </section>
      ) : null}

      {step === "done" ? (
        <section aria-labelledby="done" className="flex flex-1 flex-col gap-6">
          <div>
            <h1 id="done" className="font-serif text-[2.125rem] leading-[1.1] text-balance">
              You&apos;re all set, {name}
            </h1>
            <p className="mt-2 text-[1.0625rem] text-pretty text-ink-soft">Your page for today is ready. You can change alarms any time in Settings.</p>
          </div>
          <div className="mt-auto">
            <Link
              href={todayHref}
              className="flex min-h-16 w-full items-center justify-center rounded-[10px] bg-ribbon-fill px-6 text-[1.1875rem] font-semibold text-ribbon-fill-ink"
            >
              Open today&apos;s page
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
