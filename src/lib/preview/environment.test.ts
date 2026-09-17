import { afterEach, expect, test, vi } from "vitest";
import { isPreviewDataEnvironment, PREVIEW_SUPABASE_URL } from "./environment";

afterEach(() => vi.unstubAllEnvs());

function previewEnvironment() {
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PREVIEW_SUPABASE_URL);
  vi.stubEnv("VERCEL_ENV", "preview");
}

test("permits the confirmed development/test project in a preview deployment", () => {
  previewEnvironment();
  expect(isPreviewDataEnvironment()).toBe(true);
});

test.each([
  ["APP_DATA_ENVIRONMENT", "production"],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://another-project.supabase.co"],
  ["VERCEL_ENV", "production"],
])("fails closed when %s is %s", (key, value) => {
  previewEnvironment();
  vi.stubEnv(key, value);
  expect(isPreviewDataEnvironment()).toBe(false);
});
