import { useId } from "react";
import type { AccountIconName } from "./AccountIcon";
import styles from "./drawer.module.css";

/** Temporary drawer artwork until the approved, project-owned illustrations are supplied. */
export function DrawerIllustration({ name }: { name: AccountIconName }) {
  const id = useId().replace(/:/g, "");
  const blue = `url(#${id}-blue)`;
  const dark = `url(#${id}-dark)`;
  const white = `url(#${id}-white)`;
  const warm = name === "bell" || name === "orders";
  return <svg className={styles.illustration} data-temporary-asset={name} viewBox="0 0 120 76" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-bg`} x2="1" y2="1"><stop stopColor={warm ? "#fff0d4" : "#e5f5ff"} /><stop offset="1" stopColor={warm ? "#ffd4ae" : "#bedfff"} /></linearGradient>
      <linearGradient id={`${id}-blue`} x2=".9" y2="1"><stop stopColor="#23a6ff" /><stop offset=".5" stopColor="#0063df" /><stop offset="1" stopColor="#05327a" /></linearGradient>
      <linearGradient id={`${id}-dark`} x2="1" y2="1"><stop stopColor="#456580" /><stop offset=".5" stopColor="#12283e" /><stop offset="1" stopColor="#071729" /></linearGradient>
      <linearGradient id={`${id}-white`} x2="1" y2="1"><stop stopColor="#fff" /><stop offset=".55" stopColor="#fafbff" /><stop offset="1" stopColor="#b8c4d3" /></linearGradient>
    </defs>
    <rect width="120" height="76" rx="8" fill={`url(#${id}-bg)`} />
    <ellipse cx="61" cy="65" rx="39" ry="5" fill="#062856" opacity=".12" />
    {name === "layers" && <>
      <path d="M48 53h25v6H48z" fill="#294562" /><rect x="35" y="9" width="64" height="46" rx="4" fill={dark} transform="rotate(-5 67 32)" />
      <path d="m40 16 53-5 3 33-53 5z" fill={blue} /><path d="m41 44 21-28 31-3-19 30z" fill="#7ed9ff" opacity=".8" /><path d="m62 48 14-35 17-1 3 32z" fill="#ff9819" /><path d="m75 47 18-35 3 32z" fill="#f65549" />
      <g transform="rotate(-15 31 43)"><path d="M14 28h33v7a5 5 0 0 0 0 10v17H14V45a5 5 0 0 0 0-10z" fill={blue} /><path d="M37 31v27" stroke="#b8eaff" strokeWidth="2" strokeDasharray="2 3" /><path d="m23 43 4 4 6-8" stroke="white" strokeWidth="3" strokeLinecap="round" /></g>
      <path d="M78 47c-8-5-12 0-15 10l-2 8c0 6 6 6 12-1l3-2h13l4 4c5 4 10 1 8-5l-4-10c-2-6-8-8-13-4z" fill={white} stroke="#b1becd" /><path d="M71 53v9m-4-5h8" stroke="#163450" strokeWidth="3" strokeLinecap="round" /><circle cx="91" cy="53" r="2" fill="#0856c7" /><circle cx="95" cy="58" r="2" fill="#eb6533" />
    </>}
    {name === "gift" && <>
      <rect x="22" y="19" width="72" height="43" rx="5" fill="#f9b72d" transform="rotate(-15 58 40)" /><rect x="17" y="13" width="74" height="44" rx="5" fill="#70bdff" transform="rotate(-6 54 35)" />
      <g transform="rotate(-9 66 43)"><rect x="31" y="23" width="72" height="43" rx="5" fill={blue} /><rect x="58" y="40" width="23" height="18" rx="1" stroke="white" strokeWidth="2.5" /><path d="M55 36h29v6H55zM69 35v24M69 36c-17 0-12-18-5-9l5 9Zm0 0c17 0 12-18 5-9l-5 9Z" stroke="white" strokeWidth="2.5" /></g>
    </>}
    {name === "wallet" && <g transform="rotate(-10 61 40)">
      <rect x="23" y="15" width="77" height="49" rx="7" fill={dark} /><path d="M27 23h68M29 19l61-5" stroke="#8399aa" strokeWidth="2" /><rect x="28" y="25" width="65" height="33" rx="3" stroke="#8c9bab" strokeDasharray="2 2" /><path d="M83 34h19v17H83a8 8 0 0 1 0-17Z" fill="#243c54" stroke="#698195" /><circle cx="89" cy="42" r="3" fill="#aabdc8" />
    </g>}
    {name === "orders" && <>
      <path d="m22 24 39-15 38 14-39 17z" fill="#efd0a0" /><path d="m22 24 38 16v29L22 52z" fill="#d4a66e" /><path d="m60 40 39-17v29L60 69z" fill="#b77b41" /><path d="m41 17 39 15 0 16-12 5V37L30 22z" fill={blue} /><path d="m61 40 0 26M26 29v21" stroke="#f4d6ac" opacity=".65" /><path d="m30 37 19 8v11l-19-8z" fill="#ffedce" />
    </>}
    {name === "crew" && <>
      <circle cx="27" cy="31" r="10" fill={blue} /><circle cx="94" cy="31" r="10" fill={blue} /><path d="M11 62v-8a16 16 0 0 1 32 0v8zM78 62v-8a16 16 0 0 1 32 0v8z" fill={blue} /><circle cx="60" cy="22" r="13" fill={blue} /><path d="M37 65V51a23 23 0 0 1 46 0v14z" fill={blue} stroke="#83caff" strokeWidth="1.5" />
    </>}
    {name === "bell" && <>
      <circle cx="60" cy="58" r="8" fill="#a9b6c3" /><circle cx="60" cy="16" r="5" fill="white" /><path d="M42 34a18 18 0 0 1 36 0v9c0 8 9 9 9 15H33c0-6 9-7 9-15z" fill={white} stroke="#d8dfe4" /><path d="M37 56h46" stroke="white" strokeWidth="3" strokeLinecap="round" /><circle cx="81" cy="22" r="10" fill="#e45413" /><circle cx="78" cy="19" r="3" fill="#ffb97b" opacity=".7" />
    </>}
    {name === "security" && <>
      <path d="m60 7 32 11v23c0 16-19 25-32 30C47 66 28 57 28 41V18z" fill={blue} stroke="#459ce9" /><path d="M60 8v61c16-7 30-16 30-29V20z" fill="#002f89" opacity=".45" /><path d="m45 37 11 11 21-24" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>}
  </svg>;
}
