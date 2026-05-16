import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Manager",
  description: "Personal daily-driver: notes, memos, bookmarks, diary, schedule",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Content",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight"
            >
              Content Manager
            </Link>
            <form action="/" method="get" className="hidden flex-1 sm:block">
              <input
                type="search"
                name="q"
                placeholder="Search notes, transcripts, links…"
                className="w-full max-w-md rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
              />
            </form>
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/items/new?kind=note"
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                + Note
              </Link>
              <Link
                href="/items/new?kind=memo"
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                + Memo
              </Link>
              <Link
                href="/items/new?kind=bookmark"
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                + Bookmark
              </Link>
              <Link
                href="/items/new?kind=voice_memo"
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                + Voice
              </Link>
              <Link
                href="/items/new"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                + New
              </Link>
              <Link
                href="/devices"
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Devices
              </Link>
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                  title="Sign out"
                >
                  Logout
                </button>
              </form>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
