export function Footer() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-5xl">
        <div className="grid max-w-5xl grid-cols-6 gap-6 p-4">
          <div className="col-span-6 flex flex-col gap-4 pt-5 md:col-span-4">
            <a className="font-bold" href="#">
              PlaceTrix
            </a>
            <p className="max-w-sm text-balance text-muted-foreground text-sm">
              Train. Track. Triumph.
            </p>
          </div>
          <div className="col-span-3 w-full md:col-span-1">
            <span className="text-muted-foreground text-xs">Resources</span>
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
            <span className="text-muted-foreground text-xs">Company</span>
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
          <p className="text-center font-light text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()}{" "}
            <a
              href="/"
              className="hover:underline font-medium"
            >
              PlaceTrix
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

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
    href: "/pricing",
  },
  {
    title: "Help Center",
    href: "/help-center",
  }
];