"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRightIcon,
  ClipboardCheck,
  BellRing,
  Briefcase,
  CalendarDays,
  BarChart3,
  Users,
  MenuIcon,
  MoonIcon,
  SunIcon,
  XIcon,
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import TextType from "@/components/TextType";
import PlaceTrixLogo from "@/assets/placetrix.svg";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Portal, PortalBackdrop } from "@/components/ui/landing/portal";
import { cirka } from "@/app/fonts";
import type { UserProfile } from "@/lib/supabase/profile";
import { getUserProfileAction } from "@/lib/supabase/profile";
import { buildStorageUrl } from "@/lib/storage";

const CONTENT = "mx-auto w-full max-w-6xl px-4 md:px-6";
const SECTION_Y = "py-16 md:py-24";

const NAV_SHELL =
  "border border-black/10 bg-white/30 backdrop-blur-xl dark:border-white/10 dark:bg-black/30";

const NAV_BUTTON =
  "border-black/10 bg-white/70 text-slate-900 hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

const AVATAR_SHELL =
  "size-8 shrink-0 border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5";

function useMounted() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

function useScrollThreshold(threshold = 10) {
  const [scrolled, setScrolled] = React.useState(false);
  const frame = React.useRef<number | null>(null);
  const last = React.useRef(false);

  React.useEffect(() => {
    const update = () => {
      frame.current = null;
      const next = window.scrollY > threshold;

      if (last.current !== next) {
        last.current = next;
        setScrolled(next);
      }
    };

    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
      }
    };
  }, [threshold]);

  return scrolled;
}

const Logo = React.memo(function Logo() {
  return (
    <div className="flex shrink-0 items-center justify-center">
      <Image
        src={PlaceTrixLogo}
        alt="PlaceTrix"
        width={24}
        height={24}
        className="size-6 dark:invert"
        priority
      />
    </div>
  );
});

const ThemeToggle = React.memo(function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();

  const handleToggle = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const toggleClassName = cn(
    "size-8 text-foreground [&_svg]:size-4.5",
    NAV_BUTTON
  );

  if (!mounted) {
    return (
      <Button
        aria-label="Toggle theme"
        size="icon"
        variant="outline"
        className={toggleClassName}
      >
        <SunIcon className="opacity-0" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      aria-label="Toggle theme"
      onClick={handleToggle}
      size="icon"
      variant="outline"
      className={toggleClassName}
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
});

const UserAvatar = React.memo(function UserAvatar({
  user,
  className,
}: {
  user: UserProfile;
  className?: string;
}) {
  const initials = React.useMemo(() => {
    return user.display_name
      ? user.display_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : user.email[0].toUpperCase();
  }, [user.display_name, user.email]);

  const avatarUrl = React.useMemo(() => {
    return buildStorageUrl("avatars", user.avatar_path);
  }, [user.avatar_path]);

  return (
    <Avatar className={cn(AVATAR_SHELL, className)}>
      <AvatarImage
        src={avatarUrl ?? undefined}
        alt={user.display_name || user.email}
        className="object-cover"
      />
      <AvatarFallback className="text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
});

const AuthButtons = React.memo(function AuthButtons({
  size,
}: {
  size: "sm" | "default";
}) {
  return (
    <>
      <Button size={size} variant="outline" className={NAV_BUTTON} asChild>
        <Link href="/auth/login">Sign In</Link>
      </Button>
      <Button size={size} asChild>
        <Link href="/auth/sign-up">Get Started</Link>
      </Button>
    </>
  );
});

const MobileNav = React.memo(function MobileNav({
  user,
}: {
  user: UserProfile | null;
}) {
  const [open, setOpen] = React.useState(false);

  const toggleMenu = React.useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const closeMenu = React.useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <div className="md:hidden">
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className={cn("md:hidden", NAV_BUTTON)}
        onClick={toggleMenu}
        size="icon"
        variant="outline"
      >
        {open ? <XIcon className="size-4.5" /> : <MenuIcon className="size-4.5" />}
      </Button>

      {open && (
        <Portal className="top-20" id="mobile-menu">
          <PortalBackdrop />
          <div
            className={cn(
              "data-[slot=open]:zoom-in-97 data-[slot=open]:animate-in size-full p-4 ease-out transform-gpu"
            )}
            data-slot={open ? "open" : "closed"}
          >
            <div className={cn("mx-auto mt-12 max-w-sm rounded-2xl p-3", NAV_SHELL)}>
              <div className="mb-2 flex justify-end">
                <ThemeToggle />
              </div>

              {user ? (
                <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <UserAvatar user={user} className="size-9" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {user.display_name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button className={cn("w-full", NAV_BUTTON)} variant="outline" asChild>
                    <Link href="/auth/login" onClick={closeMenu}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/auth/sign-up" onClick={closeMenu}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
});

interface HeaderVisualProps {
  user: UserProfile | null;
}

const HeaderVisual = React.memo(function HeaderVisual({
  user,
}: HeaderVisualProps) {
  const scrolled = useScrollThreshold(10);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 mx-auto w-full transition-all duration-300 ease-out",
        "px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4 md:pt-3",
        scrolled ? "max-w-4xl" : "max-w-6xl"
      )}
    >
      <div
        className={cn(
          "w-full transition-all duration-300 ease-out",
          scrolled
            ? cn("rounded-full", NAV_SHELL, "md:rounded-full")
            : "rounded-full border-none bg-transparent shadow-none backdrop-blur-none md:rounded-none md:border-none md:bg-transparent md:shadow-none md:backdrop-blur-none"
        )}
      >
        <nav
          className={cn(
            "flex w-full items-center justify-between px-4 transition-[height,padding] duration-300 ease-out",
            scrolled ? "h-14 md:h-12 md:px-4" : "h-14 md:h-14 md:px-6"
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2 px-2 font-bold tracking-[0.05em]"
          >
            <Logo />
            <span className="pl-1 text-lg font-bold tracking-wider">PlaceTrix</span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? <UserAvatar user={user} /> : <AuthButtons size="sm" />}
          </div>

          <MobileNav user={user} />
        </nav>
      </div>
    </header>
  );
});

interface HeaderShellProps {
  initialUser?: UserProfile | null;
}

const HeaderShell = React.memo(function HeaderShell({
  initialUser = null,
}: HeaderShellProps) {
  const [user, setUser] = React.useState<UserProfile | null>(initialUser);

  React.useEffect(() => {
    let cancelled = false;

    if (initialUser) {
      setUser(initialUser);
      return;
    }

    const hasAuthCookie =
      typeof document !== "undefined" && document.cookie.includes("auth-token");

    if (!hasAuthCookie) return;

    getUserProfileAction()
      .then((data) => {
        if (!cancelled && data) setUser(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  return <HeaderVisual user={user} />;
});

const HeroBackground = React.memo(function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden transform-gpu"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(6,95,70,0.18),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(16,185,129,0.16),transparent_24%),radial-gradient(circle_at_92%_12%,rgba(52,211,153,0.10),transparent_18%),radial-gradient(circle_at_50%_72%,rgba(16,185,129,0.12),transparent_30%)] dark:bg-[radial-gradient(circle_at_20%_18%,rgba(16,185,129,0.24),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(16,185,129,0.20),transparent_24%),radial-gradient(circle_at_92%_12%,rgba(74,222,128,0.14),transparent_18%),radial-gradient(circle_at_50%_72%,rgba(16,185,129,0.16),transparent_30%)]" />
      <div className="hero-grid absolute inset-x-0 bottom-[-12%] h-[72%] transform-gpu will-change-transform" />
      <div className="hero-beam hero-beam-1 absolute left-[-10%] top-[4%] h-[30rem] w-[30rem] rounded-full transform-gpu will-change-transform" />
      <div className="hero-beam hero-beam-2 absolute right-[-8%] top-[10%] h-[25rem] w-[25rem] rounded-full transform-gpu will-change-transform" />
      <div className="hero-ring absolute left-1/2 top-[46%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full transform-gpu will-change-transform" />
      <div className="hero-noise absolute inset-0 opacity-[0.06] mix-blend-overlay transform-gpu dark:opacity-[0.08]" />
      <div className="hero-top-fade absolute inset-x-0 top-0 h-36" />
      <div className="hero-bottom-fade absolute inset-x-0 bottom-0 h-40 md:h-52" />
    </div>
  );
});

const HeroSection = React.memo(function HeroSection() {
  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden bg-white pb-0 pt-16 text-slate-950 dark:bg-black dark:text-white md:-mt-14 md:min-h-[calc(100dvh+3.5rem)] md:pt-28 lg:pt-32">
      <HeroBackground />

      <div className="relative z-10">
        <div className={CONTENT}>
          <div className="flex min-h-[calc(100svh-3.5rem)] max-w-3xl flex-col justify-center gap-6 pb-24 pt-6 md:min-h-[calc(100dvh-3.5rem)] md:pb-32 md:pt-12">
            <a
              className={cn(
                "flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/50 px-3 py-1.5 text-slate-900 shadow-sm backdrop-blur-sm transition-all transform-gpu dark:border-white/15 dark:bg-white/5 dark:text-white",
                "fade-in animate-in fill-mode-backwards delay-500 duration-500 ease-out"
              )}
              href="#features"
            >
              <span
                className="size-1.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-slate-900 dark:text-white/80">
                <TextType
                  text={["1,000+ mock tests attempted", "500+ active users"]}
                  typingSpeed={15}
                  pauseDuration={1500}
                  showCursor
                  cursorCharacter="|"
                  deletingSpeed={45}
                  cursorBlinkDuration={0.7}
                />
              </span>
            </a>

            <h1
              className={cn(
                cirka.className,
                "text-balance text-5xl font-extrabold leading-[1.08] md:text-7xl lg:text-8xl"
              )}
            >
              <span className="text-slate-950 dark:text-white">
                The Gap Between You and Your Goal?
              </span>{" "}
              <span className="glitch-wrap">
                <span
                  className="glitch-text tracking-wider italic text-emerald-700 dark:text-emerald-300"
                  data-text="Let&apos;s Close It."
                >
                  Let&apos;s Close It.
                </span>
              </span>
            </h1>

            <p className="max-w-lg text-sm leading-relaxed text-slate-900 dark:text-slate-100 md:text-base">
              Placetrix gives students the tools to practise smarter, track
              progress, and stay ahead of every campus drive all in one place.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button size="lg" className="rounded-full font-medium" asChild>
                <Link href="/auth/sign-up">
                  Get Started
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="rounded-full bg-white/70 backdrop-blur-sm transform-gpu dark:bg-white/5"
                asChild
              >
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

type Feature = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const features: Feature[] = [
  {
    title: "Precision Practice",
    icon: ClipboardCheck,
    description:
      "Access thousands of industry-standard mock tests designed to mimic real-world aptitude and technical rounds.",
  },
  {
    title: "Real-time Drive Updates",
    icon: BellRing,
    description:
      "Stay ahead with instant notifications on campus drives, eligibility criteria, and deadlines.",
  },
  {
    title: "Career Gateway",
    icon: Briefcase,
    description:
      "Discover off-campus opportunities and job openings curated specifically for freshers and graduating students.",
  },
  {
    title: "Expert-Led Events",
    icon: CalendarDays,
    description:
      "Join live webinars, resume workshops, and mock interview sessions hosted by industry veterans.",
  },
  {
    title: "Progress Insights",
    icon: BarChart3,
    description:
      "Detailed analytics across subjects help you identify and close skill gaps before interview day.",
  },
  {
    title: "Individual & Bulk Plans",
    icon: Users,
    description:
      "Scalable solutions for solo learners or entire institutions via seamless license management.",
  },
];

const FeaturesSection = React.memo(function FeaturesSection() {
  return (
    <section
      id="features"
      className={cn(
        "scroll-mt-24 md:scroll-mt-20 relative z-10 w-full bg-white/92 text-slate-950 backdrop-blur-sm transform-gpu dark:bg-black/88 dark:text-white",
        SECTION_Y
      )}
    >
      <div className={CONTENT}>
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            What you get
          </p>
          <h2
            className={cn(
              cirka.className,
              "text-balance text-4xl font-semibold tracking-tight md:text-7xl"
            )}
          >
            Train. Track. Triumph.
          </h2>
          <p className="mt-3 text-balance text-sm text-muted-foreground md:text-base">
            Everything you need to practise, prepare, and get placed.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-16 border-t border-border md:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const isLastRow =
              features.length % 2 === 0
                ? i >= features.length - 2
                : i === features.length - 1;

            return (
              <div
                key={feature.title}
                className={cn(
                  "group flex items-start gap-5 py-8",
                  !isLastRow && "border-b border-border"
                )}
              >
                <div className="mt-0.5 shrink-0 transition-transform duration-200 group-hover:scale-110 transform-gpu [&_svg]:size-5 [&_svg]:text-foreground/50">
                  <Icon />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium md:text-base">
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

type Testimonial = {
  name: string;
  role: string;
  image: string;
  company?: string;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Placetrix's structured aptitude and technical tests were vital to my prep. Consistent practice boosted my confidence and helped me clear the Infosys aptitude round.",
    image: "https://api.dicebear.com/9.x/glass/svg?seed=Pranjal%20Haral",
    name: "Pranjal Haral",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "Regular practice with Placetrix improved my fundamentals and helped me crack the Infosys aptitude round. I recommend it to all aspirants.",
    image: "https://api.dicebear.com/9.x/glass/svg?seed=Janhavi%20Patil",
    name: "Janhavi Patil",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "The app's quizzes and mock tests significantly improved my speed and accuracy, leaving me well-prepared for the placement process. Truly thankful!",
    image: "https://api.dicebear.com/9.x/glass/svg?seed=Pinal%20Lagdhir",
    name: "Pinal Lagdhir",
    role: "Software Engineer",
    company: "Infosys",
  },
  {
    quote:
      "Placetrix helped me approach placements in a structured way. The consistent practice strengthened my problem-solving skills and boosted my confidence.",
    image: "https://api.dicebear.com/9.x/glass/svg?seed=Chaitali%20Bonde",
    name: "Chaitali Bonde",
    role: "Software Engineer",
    company: "Infosys",
  },
];

const TestimonialItem = React.memo(function TestimonialItem({
  testimonial,
  last = false,
}: {
  testimonial: Testimonial;
  last?: boolean;
}) {
  const { quote, company, image, name, role } = testimonial;

  return (
    <figure className={cn("py-10", !last && "border-b border-border")}>
      <span
        aria-hidden="true"
        className="mb-3 block select-none font-serif text-5xl leading-none text-foreground/15"
      >
        &ldquo;
      </span>
      <blockquote>
        <p className="text-balance text-base leading-relaxed tracking-wide text-foreground/75 sm:text-lg">
          {quote}
        </p>
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <Avatar className="size-9 rounded-full ring-1 ring-border">
          <AvatarImage
            alt={`${name}'s profile picture`}
            src={image}
            className="object-cover"
          />
          <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5">
          <cite className="text-sm font-medium not-italic">{name}</cite>
          <span className="text-[11px] tracking-tight text-muted-foreground">
            {role}
            {company && `, ${company}`}
          </span>
        </div>
      </figcaption>
    </figure>
  );
});

const TestimonialsSection = React.memo(function TestimonialsSection() {
  return (
    <section
      className={cn(
        "w-full bg-white text-slate-950 dark:bg-black dark:text-white",
        SECTION_Y
      )}
    >
      <div className={CONTENT}>
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Testimonials
          </p>
          <h2
            className={cn(
              cirka.className,
              "text-balance text-4xl font-semibold tracking-tight md:text-7xl"
            )}
          >
            Real students, real results
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Trusted by students and educators across India to prepare with
            confidence.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-16 md:grid-cols-2">
          <div>
            {[testimonials[0], testimonials[2]].map((t, i) => (
              <TestimonialItem key={t.name} testimonial={t} last={i === 1} />
            ))}
          </div>
          <div className="md:pt-16">
            {[testimonials[1], testimonials[3]].map((t, i) => (
              <TestimonialItem key={t.name} testimonial={t} last={i === 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

const CTASection = React.memo(function CTASection() {
  return (
    <section className="w-full bg-white pb-16 text-slate-950 dark:bg-black dark:text-white md:pb-24">
      <div className={CONTENT}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-300/80 px-8 py-16 text-center dark:border-white/10 dark:bg-white/2 md:px-16 md:py-20">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Get started today
          </p>
          <h2
            className={cn(
              cirka.className,
              "text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
            )}
          >
            Your placement journey starts here.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground md:text-base">
            Join hundreds of students who have already cracked their dream
            placements using Placetrix.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="font-medium" asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

const company = [
  {
    title: "Our Team",
    href: "/our-team",
  },
  {
    title: "Privacy Policy",
    href: "/privacy-policy",
  },
  {
    title: "Terms of Service",
    href: "/terms-of-service",
  },
];

const resources = [
  {
    title: "Pricing",
    href: "#",
  },
  {
    title: "Help Center",
    href: "/help-center",
  },
  {
    title: "FAQs",
    href: "#",
  },
];

const socialLinks = [
  {
    icon: <LinkedinIcon />,
    link: "https://www.linkedin.com/company/360-view-tech/",
  },
  {
    icon: <InstagramIcon />,
    link: "https://www.instagram.com/360viewtech/",
  },
  {
    icon: <GithubIcon />,
    link: "https://github.com/360viewtech",
  },
];

const Footer = React.memo(function Footer() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-5xl">
        <div className="grid max-w-5xl grid-cols-6 gap-6 p-4">
          <div className="col-span-6 flex flex-col gap-4 pt-5 md:col-span-4">
            <a className="font-bold" href="#">
              PlaceTrix
            </a>
            <p className="max-w-sm text-balance text-sm text-muted-foreground">
              Train. Track. Triumph.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((item, index) => (
                <Button
                  asChild
                  key={`social-${item.link}-${index}`}
                  size="icon-sm"
                  variant="outline"
                >
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-xs text-muted-foreground">Resources</span>
            <div className="mt-2 flex flex-col gap-2">
              {resources.map(({ href, title }) => (
                <a
                  className="w-max text-sm hover:underline"
                  href={href}
                  key={title}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>

          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-xs text-muted-foreground">Company</span>
            <div className="mt-2 flex flex-col gap-2">
              {company.map(({ href, title }) => (
                <a
                  className="w-max text-sm hover:underline"
                  href={href}
                  key={title}
                >
                  {title}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 h-px w-full bg-border" />
        <div className="flex max-w-4xl flex-col justify-between gap-2 py-4">
          <p className="text-center text-sm font-light text-muted-foreground">
            &copy; {new Date().getFullYear()}, 360 View Tech, All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
});

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-950 supports-[overflow:clip]:overflow-clip dark:bg-black dark:text-white">
      <HeaderShell />
      <main className="flex flex-col">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}