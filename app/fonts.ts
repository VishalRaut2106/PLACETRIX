import localFont from "next/font/local";

export const cirka = localFont({
  src: "../assets/Cirka-Variable.ttf",
  variable: "--font-cirka",
  display: "swap",
  weight: "100 1000",
  fallback: ["Georgia", "serif"],
});