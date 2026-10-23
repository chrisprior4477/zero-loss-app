import { notFound } from "next/navigation";
import { IntegratedDrawerFixture } from "./IntegratedDrawerFixture";

/** Development-only rendering of the real drawer with known visual-check values. */
export default function DrawerIntegratedCheckPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <main style={{ minHeight: "100dvh", background: "#08182c", padding: 16 }}><style>{"nextjs-portal { display: none !important; }"}</style><IntegratedDrawerFixture /></main>;
}
