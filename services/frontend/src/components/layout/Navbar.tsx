"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ShoppingCart, LogOut, User as UserIcon } from "lucide-react";

import { BRAND_CONFIG, NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

interface NavUser {
  name: string;
  is_admin?: boolean;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<NavUser | null>(null);
  const [cartCount, setCartCount] = React.useState(0);
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Sync state with localStorage — identical to the original implementation.
  React.useEffect(() => {
    const checkAuthAndCart = () => {
      const storedUser = localStorage.getItem("med_user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      const storedCart = localStorage.getItem("med_cart");
      if (storedCart) {
        try {
          const items = JSON.parse(storedCart);
          setCartCount(
            Array.isArray(items) ? items.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0) : 0
          );
        } catch {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    checkAuthAndCart();

    window.addEventListener("storage", checkAuthAndCart);
    window.addEventListener("cart-updated", checkAuthAndCart);
    window.addEventListener("auth-updated", checkAuthAndCart);

    return () => {
      window.removeEventListener("storage", checkAuthAndCart);
      window.removeEventListener("cart-updated", checkAuthAndCart);
      window.removeEventListener("auth-updated", checkAuthAndCart);
    };
  }, []);

  // Scroll shadow toggle — same threshold/behavior as the original, via state.
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on route change.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    localStorage.removeItem("med_user");
    localStorage.removeItem("med_session");
    window.dispatchEvent(new Event("auth-updated"));
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  const visibleLinks = NAV_LINKS.filter((link) => {
    if (link.path === "/dashboard" && !user) return false;
    if (link.path === "/returns" && !user) return false;
    if (link.path === "/admin" && !user?.is_admin) return false;
    return true;
  });

  const isLinkActive = (path: string) => pathname === path;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled ? "border-b border-ink-100 bg-white/85 shadow-soft-sm backdrop-blur-lg" : "border-b border-transparent bg-white/0"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
        <Link href="/" className="shrink-0" aria-label={`${BRAND_CONFIG.name} home`}>
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
          <ul className="flex items-center gap-1">
            {visibleLinks.map((link) => {
              const active = isLinkActive(link.path);
              return (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                      active ? "text-brand-700" : "text-ink-600 hover:text-ink-900"
                    )}
                  >
                    {link.label}
                    {link.path === "/cart" && (
                      <AnimatePresence mode="wait">
                        {cartCount > 0 && (
                          <motion.span
                            key={cartCount}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white"
                          >
                            {cartCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    )}
                    {active && (
                      <motion.span
                        layoutId="navActiveUnderline"
                        className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-brand-600"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop auth */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="hidden shrink-0 items-center gap-3 lg:flex"
        >
          {user ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-600">
                <UserIcon className="h-3.5 w-3.5 text-ink-400" />
                {user.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" />
                Log Out
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login" className="px-2 text-[13.5px] font-medium text-ink-600 hover:text-ink-900">
                Sign In
              </Link>
              <Button asChild size="sm" variant="brand">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </motion.div>

        {/* Mobile: cart shortcut + menu trigger */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <Link
            href="/cart"
            aria-label="RFQ cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-md text-ink-700 transition-colors hover:bg-ink-50"
              >
                <Menu className="h-5.5 w-5.5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw]">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
                {visibleLinks.map((link) => {
                  const active = isLinkActive(link.path);
                  return (
                    <SheetClose asChild key={link.path}>
                      <Link
                        href={link.path}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-4 py-3.5 text-[15px] font-medium transition-colors",
                          active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50"
                        )}
                      >
                        {link.label}
                        {link.path === "/cart" && cartCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                            {cartCount}
                          </span>
                        )}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-ink-100 p-4">
                {user ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                      <UserIcon className="h-4 w-4 text-ink-400" />
                      {user.name}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="h-3.5 w-3.5" />
                      Log Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <SheetClose asChild>
                      <Button asChild variant="brand">
                        <Link href="/register">Register</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild variant="outline">
                        <Link href="/login">Sign In</Link>
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
