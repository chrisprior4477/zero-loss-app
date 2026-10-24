import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "./NotificationProvider";
import { HeaderNotifications } from "./HeaderNotifications";
import Link from "next/link";
import type { AccountNotification } from "@/lib/account/notifications";
const mock = vi.hoisted(() => ({ mark:vi.fn(), restore:vi.fn(), push:vi.fn() }));
vi.mock("@/lib/account/notification-read-actions", () => ({ markNotificationsRead:mock.mark }));
vi.mock("@/lib/account/restore-banner-action", () => ({ restoreNotificationBanner:mock.restore }));
vi.mock("next/navigation", () => ({ usePathname:()=>"/account/profile", useRouter:()=>({push:mock.push}), useSearchParams:()=>new URLSearchParams() }));
const make=(id:string,tone:AccountNotification["tone"]):AccountNotification=>({id,tone,category:"activity",title:id,itemTitle:id,body:"",meta:"",href:`/account/entries/${id}`,action:"View"});
const notifications=[make("win","reward"),make("option","completion"),make("support-case","account"),make("shared-pick","crew")];
const snapshot={notifications,readIds:[] as string[],readAvailable:true,preferences:{}};
function Restore(){const value=useNotifications()!;return <button onClick={()=>void value.restoreBanner()}>Restore</button>;}
beforeEach(()=>{
 vi.clearAllMocks();mock.mark.mockResolvedValue({ok:true});
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>snapshot}));
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function App({readIds=[]}:{readIds?:string[]}) {return <NotificationProvider initial={{...snapshot,readIds}} initialStyle="capsule" initialEnabled><HeaderNotifications><Link href="/account/wallet">Balance</Link></HeaderNotifications><Restore/></NotificationProvider>;}
test("viewing wins leaves the purchase-options banner clickable, including after stale account refresh",async()=>{
 const rendered=render(<App/>);
 fireEvent.click(screen.getByRole("button",{name:/4 unread updates/}));
 fireEvent.click(within(screen.getByRole("region",{name:"You won"})).getByRole("button",{name:/View my wins/}));
 await waitFor(()=>expect(mock.mark).toHaveBeenCalledWith(["win"]));
 await screen.findByRole("button",{name:/3 unread updates/});
 rendered.rerender(<App readIds={[]}/>);
 fireEvent.click(screen.getByRole("button",{name:/3 unread updates/}));
 const categories=screen.getByRole("navigation",{name:"Update categories"});
 expect(within(categories).getByRole("button",{name:/Purchase options/}).textContent).toContain("1");
 fireEvent.click(within(categories).getByRole("button",{name:/Purchase options/}));
 fireEvent.click(within(screen.getByRole("region",{name:"Purchase options"})).getByRole("button",{name:/View purchase options/}));
 await waitFor(()=>expect(mock.mark).toHaveBeenLastCalledWith(["option"]));
 expect(await screen.findByRole("button",{name:/2 unread updates/})).toBeTruthy();
});
test("restoring restores read alerts and reveals a hidden banner without saving style",async()=>{
 mock.restore.mockResolvedValue({ok:true,ids:["win","option"],snapshot:{...snapshot,readIds:[]},message:"Restored"});
 render(<App readIds={["win","option"]}/>);
 fireEvent.click(screen.getByRole("button",{name:/unread updates/}));
 fireEvent.click(screen.getByRole("button",{name:"Show tickets & balance"}));
 await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Restore"}));});
 expect(await screen.findByRole("button",{name:/4 unread updates/})).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:/4 unread updates/}));
 expect(screen.getByRole("button",{name:"Show tickets & balance"})).toBeTruthy();
});
