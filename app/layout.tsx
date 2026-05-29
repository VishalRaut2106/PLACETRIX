import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
// @ts-ignore: CSS side-effect import for global styles
import "./globals.css";
import { cirka } from "@/app/fonts";
import { Toaster } from "@/components/ui/sonner";


export const metadata: Metadata = {
  title: "Placetrix",
  description:
    "Practice mock tests, join study groups, and track your progress with Placetrix.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cirka.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        ><TooltipProvider>{children}
            <Toaster position="bottom-right"/>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
