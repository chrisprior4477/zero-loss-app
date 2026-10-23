import { spawn } from "node:child_process";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const output = process.argv[2];
if (!output) throw new Error("Provide an output PNG path");
const viewportWidth = Number(process.argv[3] ?? 486);
const viewportHeight = Number(process.argv[4] ?? 1100);

const port = 9300 + Math.floor(Math.random() * 500);
const profile = await mkdtemp(join(tmpdir(), "zero-loss-drawer-cdp-"));
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--disable-gpu", "--disable-gpu-sandbox", "--no-sandbox", "--no-first-run",
  "--remote-allow-origins=*", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--window-size=500,1100", "about:blank",
], { windowsHide: true, stdio: "ignore" });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;

try {
  let tab;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      tab = tabs.find((item) => item.type === "page");
      if (tab) break;
    } catch { /* Chrome is starting. */ }
    await pause(100);
  }
  if (!tab) throw new Error("Chrome DevTools did not become available");

  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1.5, mobile: true });
  await send("Page.navigate", { url: "http://localhost:3111/drawer-integrated-check" });

  let details;
  for (let attempt = 0; attempt < 50; attempt++) {
    await pause(150);
    const result = await send("Runtime.evaluate", { expression: `(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const drawer = dialogs.find((node) => node.textContent.includes('Playable Wallet'));
      if (!drawer) return null;
      const box = drawer.getBoundingClientRect();
      return { dialogCount: dialogs.length, drawerWidth: box.width, viewportWidth: innerWidth, walletValue: drawer.querySelector('[data-testid="drawer-balance"]')?.textContent, imageCount: drawer.querySelectorAll('nav[aria-label="Account navigation"] img').length, drawerScrollWidth: drawer.scrollWidth, drawerClientWidth: drawer.clientWidth };
    })()` , returnByValue: true });
    details = result.result.value;
    if (details) break;
  }
  if (!details) throw new Error("The signed-in drawer did not open");
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(output, Buffer.from(screenshot.data, "base64"));
  process.stdout.write(`${JSON.stringify(details)}\n${output}\n`);
} finally {
  socket?.close();
  chrome.kill();
}
