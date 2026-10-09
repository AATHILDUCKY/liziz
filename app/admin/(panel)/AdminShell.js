"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminShell({ user, logo = "", children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "admin";

  const nav = [
    { href: "/admin", label: "Dashboard", icon: GridIcon, show: true },
    { href: "/admin/analytics", label: "Analytics", icon: ChartIcon, show: true },
    { href: "/admin/products", label: "Products", icon: TagIcon, show: true },
    { href: "/admin/content", label: "Content", icon: LayoutIcon, show: isAdmin },
    { href: "/admin/seo", label: "SEO", icon: SearchIcon, show: isAdmin },
    { href: "/admin/users", label: "Staff Users", icon: UsersIcon, show: isAdmin },
    { href: "/admin/settings", label: "Settings", icon: CogIcon, show: isAdmin },
    { href: "/admin/account", label: "My Account", icon: UserIcon, show: true },
  ].filter((n) => n.show);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const roleLabel = user.role === "admin" ? "Administrator" : "Stock Updater";
  const current = nav.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href))) || nav[0];
  const primaryNav = [
    nav.find((n) => n.href === "/admin"),
    nav.find((n) => n.href === "/admin/products"),
    nav.find((n) => n.href === "/admin/analytics"),
  ].filter(Boolean);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-smoke text-ink">
      {/* Top bar (mobile) */}
      <div className="sticky top-0 z-40 border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            aria-expanded={open}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-smoke text-ink"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-ash">Admin panel</p>
            <p className="truncate text-base font-semibold leading-tight">{current.label}</p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink"
            aria-label="View store"
          >
            <ExternalIcon />
          </a>
        </div>
      </div>

      <div className="flex w-full">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-[70] w-[86vw] max-w-[320px] transform border-r border-line bg-white shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <div className="mb-5 flex items-center justify-between gap-3 px-1 pt-1">
              <div className="min-w-0">
                {logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logo} alt="Store logo" className="h-10 w-auto max-w-[170px] object-contain" />
                ) : (
                  <>
                    <p className="font-display text-base font-bold tracking-brand">LIZIZ</p>
                    <p className="text-[10px] tracking-[0.4em] text-ash">STORE ADMIN</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-smoke lg:hidden"
                aria-label="Close admin menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-line bg-smoke p-3 lg:hidden">
              <p className="truncate text-sm font-semibold">{user.name || user.username}</p>
              <p className="text-xs text-ash">{roleLabel}</p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto pb-3">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      active ? "bg-ink text-paper shadow-sm" : "text-ink hover:bg-smoke"
                    }`}
                  >
                    <Icon /> {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 rounded-xl border border-line p-3">
              <p className="truncate text-sm font-medium">{user.name || user.username}</p>
              <p className="text-[11px] text-ash">{roleLabel}</p>
              <div className="mt-3 flex gap-2">
                <a href="/" target="_blank" className="btn-ghost flex-1 px-2 py-1.5 text-xs">View store</a>
                <button type="button" onClick={logout} className="btn-outline flex-1 px-2 py-1.5 text-xs">Logout</button>
              </div>
            </div>
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-[60] bg-black/45 lg:hidden" onClick={() => setOpen(false)} />}

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:py-6 xl:px-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.12)] backdrop-blur lg:hidden">
        <div className="grid h-16 grid-cols-4">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-ink" : "text-ash"
                }`}
              >
                <span className={`flex h-7 w-10 items-center justify-center rounded-full ${active ? "bg-ink text-paper" : ""}`}>
                  <Icon />
                </span>
                <span>{label === "Dashboard" ? "Home" : label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-ash"
            aria-label="More admin pages"
          >
            <span className="flex h-7 w-10 items-center justify-center rounded-full">
              <MoreIcon />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

const svg = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7 };
const GridIcon = () => <svg {...svg}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
const TagIcon = () => <svg {...svg}><path d="M20 12 12 20l-8-8V4h8Z" /><circle cx="8" cy="8" r="1.5" /></svg>;
const LayoutIcon = () => <svg {...svg}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>;
const ChartIcon = () => <svg {...svg}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="5" /><rect x="12" y="8" width="3" height="9" /><rect x="17" y="5" width="3" height="12" /></svg>;
const UsersIcon = () => <svg {...svg}><circle cx="9" cy="8" r="3" /><path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" /><path d="M16 4a3 3 0 0 1 0 6" /></svg>;
const CogIcon = () => <svg {...svg}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>;
const SearchIcon = () => <svg {...svg}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
const UserIcon = () => <svg {...svg}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 12 0v1" /></svg>;
const MoreIcon = () => <svg {...svg}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>;
const ExternalIcon = () => <svg {...svg}><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>;
