import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const { save, read } = vi.hoisted(() => ({ save: vi.fn(), read: vi.fn() }));
vi.mock('@/lib/account/entry-outcome-email-actions',()=>({saveEntryOutcomeEmailPreference:save}));
vi.mock('@/lib/account/lifecycle-actions',()=>({setPurchaseOptionEmailPreference:save}));
vi.mock('@/lib/favorites/alert-actions',()=>({setFavoriteAlertEmailPreference:save}));
vi.mock('@/lib/crew/actions',()=>({setCrewWinEmailPreference:save}));
vi.mock('@/lib/account/read-saved-email-preference', () => ({ readSavedEmailPreference: read }));
import {EntryOutcomeEmailPreference} from './EntryOutcomeEmailPreference';
import {PurchaseOptionEmailPreference} from './PurchaseOptionEmailPreference';
import {FavoriteAlertEmailPreference} from './FavoriteAlertEmailPreference';
import {CrewWinEmailPreference} from './CrewWinEmailPreference';
import {PreferenceSnapshotProvider} from './useServerPreference';
const controls=[['outcome',EntryOutcomeEmailPreference],['purchase',PurchaseOptionEmailPreference],['Favorites',FavoriteAlertEmailPreference],['Crew',CrewWinEmailPreference]] as const;
beforeEach(() => {
  vi.resetAllMocks();
  save.mockResolvedValue({ status: "succeeded", ok: true, message: "Saved on" });
  read.mockImplementation(async () => save.mock.lastCall?.[1]?.get("enabled") === "true");
});
afterEach(cleanup);
test.each(controls)('%s follows confirmed changes in both directions',(_name,Control)=>{
 const view=render(<Control initialEnabled={false}/>);
 view.rerender(<Control initialEnabled={true}/>);expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);
 view.rerender(<Control initialEnabled={false}/>);expect(screen.getByRole('checkbox')).toHaveProperty('checked',false);
});
test.each(controls)('%s preserves an unsaved choice through refresh and unavailable reads',(_name,Control)=>{
 const show=(value:boolean|null,revision:string)=><PreferenceSnapshotProvider revision={revision}><Control initialEnabled={value}/></PreferenceSnapshotProvider>;
 const view=render(show(false,'first'));fireEvent.click(screen.getByRole('checkbox'));
 view.rerender(show(false,'refresh'));expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);
 view.rerender(show(null,'unavailable'));expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);expect(screen.getByRole('checkbox')).toHaveProperty('disabled',true);
 view.rerender(show(false,'recovered'));expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);expect(screen.getByRole('checkbox')).toHaveProperty('disabled',false);
});
test.each(controls)('%s accepts a fresh off snapshot after a local on save, even before an on snapshot arrived',async(_name,Control)=>{
 const show=(revision:string)=><PreferenceSnapshotProvider revision={revision}><Control initialEnabled={false}/></PreferenceSnapshotProvider>;
 const view=render(show('before'));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Save preference'}));
 await screen.findByText('Saved on');expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);
 view.rerender(show('after-another-tab-saved-off'));expect(screen.getByRole('checkbox')).toHaveProperty('checked',false);
});
test.each(controls)('%s keeps the submitted choice while a response is pending',async(_name,Control)=>{
 let finish!:(value:unknown)=>void;save.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const show=(revision:string)=><PreferenceSnapshotProvider revision={revision}><Control initialEnabled={false}/></PreferenceSnapshotProvider>;
 const view=render(show('first'));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Save preference'}));
 await waitFor(()=>expect(screen.getByRole('checkbox')).toHaveProperty('disabled',true));
 view.rerender(show('read-while-request-pending'));expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);
 await act(async()=>finish({status:'succeeded',ok:true,message:'Saved on'}));
 expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);
});

test.each(controls.filter(([name])=>name!=='purchase'))('%s replaces an old save receipt with an unsaved notice on edit',async(_name,Control)=>{
 render(<Control initialEnabled={false}/>);
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Save preference'}));
 await screen.findByText('Saved on');
 fireEvent.click(screen.getByRole('checkbox'));
 expect(screen.queryByText('Saved on')).toBeNull();
 expect(screen.getByRole('status').textContent).toBe('Unsaved changes. Save preference to keep your choice.');
 expect(screen.getByRole('checkbox')).toHaveProperty('checked',false);
 expect(save).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Save preference'}));
 await screen.findByText('Saved on');
 expect(screen.queryByText('Unsaved changes. Save preference to keep your choice.')).toBeNull();
 expect(save).toHaveBeenCalledTimes(2);
});

const verifiedControls = controls.slice(0, 2);

test.each(verifiedControls)("%s ignores a late save receipt after another tab saves the original value", async (kind, Control) => {
  let finish!: (value: unknown) => void;
  save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  read.mockResolvedValue(false);
  const show = (revision: string) => <PreferenceSnapshotProvider revision={revision}>
    <Control initialEnabled={false} />
  </PreferenceSnapshotProvider>;

  const view = render(show("before"));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));
  await screen.findByRole("button", { name: "Saving…" });
  expect(read).not.toHaveBeenCalled();
  view.rerender(show("after-tab-b-saved-off"));
  await act(async () => finish({ status: "succeeded", message: "Saved on" }));

  expect(screen.getByRole("checkbox")).toHaveProperty("checked", false);
  expect(screen.getByRole("status").textContent).toBe("Your preference was updated in another tab.");
  expect(screen.queryByText("Saved on")).toBeNull();
  expect(save).toHaveBeenCalledOnce();
  expect(read).toHaveBeenCalledExactlyOnceWith(kind);
});

test.each(verifiedControls)("%s checks again if a conflicting snapshot arrives during verification", async (_kind, Control) => {
  let finish!: (value: boolean) => void;
  read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(true);
  const show = (value: boolean, revision: string) => <PreferenceSnapshotProvider revision={revision}>
    <Control initialEnabled={value} />
  </PreferenceSnapshotProvider>;

  const view = render(show(true, "before"));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));
  await waitFor(() => expect(read).toHaveBeenCalledOnce());
  view.rerender(show(true, "tab-b-turned-it-back-on"));
  await act(async () => finish(false));

  expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
  expect(screen.getByRole("status").textContent).toBe("Your preference was updated in another tab.");
  expect(save).toHaveBeenCalledOnce();
  expect(read).toHaveBeenCalledTimes(2);
});

test.each(verifiedControls)("%s follows the next refresh without claiming success if verification is unavailable", async (_kind, Control) => {
  read.mockResolvedValue(null);
  const view = render(<Control initialEnabled={false} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));

  expect(await screen.findByText(/couldn’t check your saved preference/)).toBeTruthy();
  expect(screen.queryByText("Saved on")).toBeNull();
  expect(save).toHaveBeenCalledOnce();
  view.rerender(<Control initialEnabled />);
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
  view.rerender(<Control initialEnabled={false} />);
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", false);
});
