import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NotificationBannerPicker } from "./NotificationBannerPicker";
const mock=vi.hoisted(()=>({save:vi.fn(),setSpeed:vi.fn(),setStyle:vi.fn(),setEnabled:vi.fn()}));
vi.mock("@/lib/account/banner-actions",()=>({saveNotificationBanner:mock.save}));
vi.mock("@/components/notifications/NotificationProvider",()=>({useNotifications:()=>mock}));
beforeEach(()=>{vi.clearAllMocks();mock.save.mockResolvedValue({ok:true,message:"Notification banner saved."});});
afterEach(cleanup);
test("the speed slider follows all six choices, updates previews, and saves with style and visibility",async()=>{
 const {container}=render(<NotificationBannerPicker initialStyle="capsule" initialEnabled initialSpeed={5}/>);
 const slider=screen.getByRole('slider',{name:/Banner speed/});
 expect(slider).toHaveProperty('value','5'); expect(screen.getAllByRole('radio')).toHaveLength(6);
 expect(screen.getByRole('button',{name:'Save banner'}).hasAttribute('disabled')).toBe(true);
 fireEvent.change(slider,{target:{value:'9'}});
 expect(container.querySelector('[data-style="capsule"]')?.getAttribute('style')).toContain('--reveal-duration: 378ms');
 fireEvent.click(screen.getByRole('button',{name:'Save banner'}));
 await waitFor(()=>expect(mock.save).toHaveBeenCalledWith('capsule',true,9));
 expect(mock.setSpeed).toHaveBeenCalledWith(9); expect(await screen.findByText('Notification banner saved.')).toHaveProperty('role','status');
});
test("a saved speed is restored and failed saves remain retryable",async()=>{
 mock.save.mockResolvedValue({ok:false,message:'Please try again.'});
 render(<NotificationBannerPicker initialStyle="ticket" initialEnabled={false} initialSpeed={8}/>);
 expect(screen.getByRole('slider')).toHaveProperty('value','8');
 fireEvent.change(screen.getByRole('slider'),{target:{value:'2'}});fireEvent.click(screen.getByRole('button',{name:'Save banner'}));
 await screen.findByText('Please try again.'); expect(mock.setSpeed).not.toHaveBeenCalled(); expect(screen.getByRole('button',{name:'Save banner'}).hasAttribute('disabled')).toBe(false);
});
