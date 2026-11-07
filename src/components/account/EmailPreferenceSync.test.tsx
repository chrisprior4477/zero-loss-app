import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const save=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/account/entry-outcome-email-actions',()=>({saveEntryOutcomeEmailPreference:save}));
vi.mock('@/lib/account/lifecycle-actions',()=>({setPurchaseOptionEmailPreference:save}));
vi.mock('@/lib/favorites/alert-actions',()=>({setFavoriteAlertEmailPreference:save}));
vi.mock('@/lib/crew/actions',()=>({setCrewWinEmailPreference:save}));
import {EntryOutcomeEmailPreference} from './EntryOutcomeEmailPreference';
import {PurchaseOptionEmailPreference} from './PurchaseOptionEmailPreference';
import {FavoriteAlertEmailPreference} from './FavoriteAlertEmailPreference';
import {CrewWinEmailPreference} from './CrewWinEmailPreference';
import {PreferenceSnapshotProvider} from './useServerPreference';
const controls=[['outcome',EntryOutcomeEmailPreference],['purchase',PurchaseOptionEmailPreference],['Favorites',FavoriteAlertEmailPreference],['Crew',CrewWinEmailPreference]] as const;
beforeEach(()=>{vi.resetAllMocks();save.mockResolvedValue({status:'succeeded',ok:true,message:'Saved on'});});
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
