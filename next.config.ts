import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The dev server is initialized with `localhost`, and Next blocks
   * cross-origin requests to dev-only assets and endpoints by default. A
   * phone on the LAN reaches this machine at its network address, which is a
   * different origin — so the HTML rendered fine but the client bundle was
   * blocked, and nothing on the page ever hydrated. Links still worked
   * (plain anchors need no JS), which made it look like a UI bug rather than
   * a transport one.
   *
   * These entries are development-only and have no effect on a production
   * build. Add whatever address the device actually uses to reach the server.
   */
  allowedDevOrigins: ["10.25.165.252", "172.22.192.1"],
};

export default nextConfig;
