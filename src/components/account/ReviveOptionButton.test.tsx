import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Component, type ReactNode } from "react";

const mocks = vi.hoisted(() => ({ revive: vi.fn() }));
vi.mock("@/lib/account/lifecycle-actions", () => ({ revivePurchaseOption: mocks.revive }));
import { ReviveOptionButton } from "./ReviveOptionButton";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

test("a declined demo option can be revived before its original deadline", async () => {
  mocks.revive.mockResolvedValue({ status: "succeeded", message: "Revived" });
  render(<ReviveOptionButton optionId="11111111-1111-4111-8111-111111111111" expiresAt="2099-01-01T00:00:00Z" />);
  const button = await screen.findByRole("button", { name: "Revive" });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  await waitFor(() => expect(mocks.revive).toHaveBeenCalledOnce());
  expect(mocks.revive.mock.calls[0][1].get("completionOptionId")).toBe("11111111-1111-4111-8111-111111111111");
});

test("an expired declined option cannot be revived from the page", async () => {
  render(<ReviveOptionButton optionId="11111111-1111-4111-8111-111111111111" expiresAt="2020-01-01T00:00:00Z" />);
  const button = await screen.findByRole("button", { name: "Expired" });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.revive).not.toHaveBeenCalled();
});

test('a dropped revive reply stays inline and checks the exact offer before another attempt',async()=>{
 mocks.revive.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce({status:'succeeded',message:'Revived'});
 const props={optionId:'11111111-1111-4111-8111-111111111111',expiresAt:'2099-01-01T00:00:00Z',statusHref:'/account/purchase-options/nintendo-switch?option=ent_saved'};
 const view=render(<ReviveOptionButton {...props}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Revive'})).toHaveProperty('disabled',false));
 fireEvent.click(screen.getByRole('button',{name:'Revive'}));
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('Check its saved status'));
 expect(screen.getByRole('link',{name:'Check this offer →'})).toHaveProperty('href',expect.stringContaining(props.statusHref));
 expect(screen.getByRole('button',{name:'Revive'})).toHaveProperty('disabled',true);
 expect(mocks.revive).toHaveBeenCalledOnce();
 view.unmount();render(<ReviveOptionButton {...props}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Revive'})).toHaveProperty('disabled',false));
 fireEvent.click(screen.getByRole('button',{name:'Revive'}));await screen.findByText('Revived');
 expect(mocks.revive.mock.calls[1][1].get('completionOptionId')).toBe(props.optionId);
});

class RedirectBoundary extends Component<{children:ReactNode},{error:Error|null}> {
 state:{error:Error|null}={error:null};
 static getDerivedStateFromError(error:Error){return {error};}
 render(){return this.state.error ? <p role="alert">Framework handled redirect</p>:this.props.children;}
}
test('the successful revival redirect still reaches the framework instead of becoming a connection error',async()=>{
 const redirect=Object.assign(new Error('NEXT_REDIRECT'),{digest:'NEXT_REDIRECT;replace;/account/purchase-options/nintendo-switch;307;'});
 mocks.revive.mockRejectedValueOnce(redirect);
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 try {
  render(<RedirectBoundary><ReviveOptionButton optionId="11111111-1111-4111-8111-111111111111" expiresAt="2099-01-01T00:00:00Z"/></RedirectBoundary>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Revive'})).toHaveProperty('disabled',false));
  fireEvent.click(screen.getByRole('button',{name:'Revive'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Framework handled redirect');
  expect(screen.queryByText(/couldn’t confirm/)).toBeNull();
 } finally {log.mockRestore();}
});
