"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/app/context/StoreProvider";

export default function Header({ categories = [] }) {
  const { count } = useStore();
  const pathname = usePathname();
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!dialog.current) return;
    if (open) {
      dialog.current.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    dialog.current.close();
  }, [open]);
  if (pathname.startsWith("/admin")) return null;
  const close = () => setOpen(false);
  return (
    <>
      <div className="border-b border-line bg-bisque/45 px-4 py-2 text-center text-[10px] tracking-[0.12em] text-mocha">
        Thoughtfully designed. Made by us.
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="site-shell grid h-[76px] grid-cols-[1fr_auto_1fr] items-center">
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-6 text-xs text-mocha md:flex"
          >
            <Link
              href="/shop"
              aria-current={pathname === "/shop" ? "page" : undefined}
              className="flex min-h-11 items-center hover:text-ink"
            >
              Collection
            </Link>
            <Link
              href="/shop?sort=new"
              className="flex min-h-11 items-center hover:text-ink"
            >
              New arrivals
            </Link>
            <Link
              href="/about"
              aria-current={pathname === "/about" ? "page" : undefined}
              className="flex min-h-11 items-center hover:text-ink"
            >
              Our story
            </Link>
          </nav>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center md:hidden"
          >
            <Icon>
              <path d="M4 8h16M4 16h16" />
            </Icon>
          </button>
          <Link
            href="/"
            aria-label="Liziz home"
            className="brand-wordmark px-4 text-[48px]"
          >
            liziz
          </Link>
          <div className="flex items-center justify-end gap-2 sm:gap-5">
            <Link
              href="/shop#search"
              aria-label="Search the collection"
              className="flex h-11 w-11 items-center justify-center"
            >
              <Icon>
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </Icon>
            </Link>
            <Link
              href="/cart"
              aria-label={`Shopping bag, ${count} items`}
              className="relative flex min-h-11 min-w-11 items-center justify-center gap-2 text-xs"
            >
              <Icon>
                <path d="M5 7h14l1 14H4L5 7Z" />
                <path d="M9 8V5a3 3 0 0 1 6 0v3" />
              </Icon>
              <span className="hidden lg:inline">Bag ({count})</span>
              {count > 0 && (
                <span className="absolute -right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-mocha px-1 text-[10px] text-paper lg:hidden">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
      <dialog
        ref={dialog}
        id="mobile-menu"
        aria-labelledby="menu-title"
        onClose={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-[min(90vw,440px)] max-w-none border-r border-line bg-paper p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <span id="menu-title" className="brand-wordmark text-4xl">
            liziz
          </span>
          <button
            aria-label="Close menu"
            onClick={close}
            className="flex h-11 w-11 items-center justify-center"
          >
            <Icon>
              <path d="m6 6 12 12M6 18 18 6" />
            </Icon>
          </button>
        </div>
        <nav aria-label="Mobile navigation" className="px-6 py-6">
          {[
            ["/", "Home"],
            ["/shop", "The collection"],
            ["/shop?sort=new", "New arrivals"],
            ["/about", "Our story"],
            ["/cart", `Your bag (${count})`],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className="flex min-h-14 items-center border-b border-line py-3 font-display text-2xl"
            >
              {label}
            </Link>
          ))}
          <p className="eyebrow mb-3 mt-8">Explore by category</p>
          {categories.map((c) => (
            <Link
              key={c.name}
              href={`/shop?category=${encodeURIComponent(c.name)}`}
              onClick={close}
              className="flex min-h-11 items-center text-sm text-mocha"
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <p className="px-6 pb-8 text-xs leading-6 text-mocha">
          Premium modest womenswear.
          <br />
          Designed and made by Liziz.
        </p>
      </dialog>
    </>
  );
}
function Icon({ children }) {
  return (
    <svg
      aria-hidden="true"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      {children}
    </svg>
  );
}
