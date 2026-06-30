import { Link, useRouterState } from "@tanstack/react-router";
import { Home, UtensilsCrossed, CalendarDays, ShoppingBag, User, Bell, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/specials", label: "Specials", icon: CalendarDays },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/account", label: "Account", icon: User },
] as const;

export function Header() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="gold-gradient grid h-9 w-9 place-items-center rounded-xl font-display text-xl font-bold text-background">M</div>
          <div className="font-display text-lg font-bold leading-none">
            Mogudu <span className="gold-text">Monday</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.slice(0, 3).map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {active && (
                  <motion.span
                    layoutId="nav-dot"
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden items-center gap-1 rounded-full border border-gold/30 px-3 py-1.5 text-xs text-gold hover:bg-gold/10 sm:flex"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
          {user && (
            <Link to="/account" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Link>
          )}
          <Link
            to="/cart"
            className="relative flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-background px-1.5 text-[10px] font-bold text-gold"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          {!user && (
            <Link to="/auth" className="hidden rounded-full border border-border px-4 py-2 text-sm hover:bg-muted sm:inline-flex">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {navItems.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <li key={n.to} className="contents">
              <Link
                to={n.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3 sm:px-6">
        <div>
          <div className="font-display text-lg text-foreground">
            Mogudu <span className="gold-text">Monday</span>
          </div>
          <p className="mt-2 max-w-xs">Authentic Flavour, Every Monday.</p>
        </div>
        <div>
          <div className="mb-2 text-foreground">Visit</div>
          <p>123 Vilakazi Street, Soweto</p>
          <p>Open Mon–Sun · 11:00 – 22:00</p>
        </div>
        <div>
          <div className="mb-2 text-foreground">Contact</div>
          <p>hello@mogudumonday.co.za</p>
          <p>+27 11 555 0000</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Mogudu Monday
      </div>
    </footer>
  );
}
