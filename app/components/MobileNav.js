"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/app/context/StoreProvider";

// Full-width bottom navigation for mobile users.
export default function MobileNav() {
  const pathname = usePathname();
  const { count } = useStore();
  if (pathname.startsWith("/admin")) return null;

  const items = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/shop", label: "Shop", icon: GridIcon },
    { href: "/about", label: "Our story", icon: InfoIcon },
    { href: "/cart", label: "Bag", icon: BagIcon, badge: count },
  ];

  return (
    <nav
      aria-label="Quick navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 sm:hidden"
    >
      <div className="pointer-events-auto border-t border-line bg-paper text-ink pb-[env(safe-area-inset-bottom)]">
        <div className="grid h-[64px] grid-cols-4 ">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 transition-colors duration-200 ${
                  active
                    ? "bg-bisque/40 text-ink after:absolute after:inset-x-4 after:top-0 after:h-0.5 after:bg-mocha after:content-['']"
                    : "text-mocha hover:bg-bisque/30 hover:text-ink"
                }`}
              >
                <Icon />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                  {label}
                </span>
                {badge > 0 && (
                  <span className="absolute right-[calc(50%-18px)] top-2 flex h-4 min-w-[16px] items-center justify-center bg-mocha px-1 text-[9px] font-bold leading-none text-paper">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
};
const HomeIcon = () => (
  <svg {...base}>
    <path d="M3 10 12 3l9 7" />
    <path d="M5 9v11h14V9" />
  </svg>
);
const GridIcon = () => (
  <svg {...base}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const InfoIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6M12 7h.01" />
  </svg>
);
const BagIcon = () => (
  <svg {...base}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
