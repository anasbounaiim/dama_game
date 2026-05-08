import "./globals.css";

export const metadata = {
  title: "Moroccan Dama",
  description: "A Moroccan-style dama game built with Next.js and Tailwind.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
