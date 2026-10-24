import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountNotification } from "@/lib/account/notifications";
const mock=vi.hoisted(()=>({markRead:vi.fn(),unread:[] as AccountNotification[]}));
vi.mock("./NotificationProvider",()=>({useNotifications:()=>mock}));
import { ActivityNotificationRead } from "./ActivityNotificationRead";
const make=(id:string,tone:AccountNotification['tone'],extra:Partial<AccountNotification>={}):AccountNotification=>({id,tone,category:'activity',title:id,body:'',meta:'',action:'View',href:'/account/entries',...extra});
beforeEach(()=>{vi.clearAllMocks();mock.markRead.mockResolvedValue(undefined);mock.unread=[make('win','reward'),make('option','completion'),make('entry','active'),make('wallet-entry','wallet',{ledgerEntryType:'ENTRY_DEBIT'}),make('wallet-deposit','wallet',{ledgerEntryType:'DEPOSIT'}),make('shared-one','crew')];});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
test('moving from wins to purchase options acknowledges only the section actually viewed',()=>{
 const {rerender}=render(<ActivityNotificationRead filter="prize" available/>);
 expect(mock.markRead).toHaveBeenLastCalledWith(['win']);
 rerender(<ActivityNotificationRead filter="completion" available/>);
 expect(mock.markRead).toHaveBeenLastCalledWith(['option']);
 expect(mock.markRead).toHaveBeenCalledTimes(2);
});
test('Open Entries clears its ticket notices and related entry receipts only',()=>{
 render(<ActivityNotificationRead filter="active" available/>);
 expect(mock.markRead).toHaveBeenCalledWith(['entry','wallet-entry']);
});
test('server rendering and prefetching never acknowledge notifications',()=>{
 renderToStaticMarkup(<ActivityNotificationRead filter="completion" available/>);
 expect(mock.markRead).not.toHaveBeenCalled();
});
test('an unavailable view and a background tab do not acknowledge unseen content',()=>{
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');
 const {rerender}=render(<ActivityNotificationRead filter="completion" available={false}/>);
 rerender(<ActivityNotificationRead filter="completion" available/>);
 expect(mock.markRead).not.toHaveBeenCalled();
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
 fireEvent(document,new Event('visibilitychange'));
 expect(mock.markRead).toHaveBeenCalledWith(['option']);
});
test('failed acknowledgement can be retried without a request loop',async()=>{
 mock.markRead.mockRejectedValueOnce(new Error('offline'));
 render(<ActivityNotificationRead filter="completion" available/>);
 await screen.findByRole('alert');
 expect(mock.markRead).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 await waitFor(()=>expect(mock.markRead).toHaveBeenCalledTimes(2));
 expect(screen.queryByRole('alert')).toBeNull();
});
