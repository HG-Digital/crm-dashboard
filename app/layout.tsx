import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Firmensoftware",
  description: "Interne CRM & Business Software",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-gray-900 text-white">
        {/* Navigation */}
        <nav className="bg-gray-800 px-8 py-4 flex items-center justify-between shadow-md">
          <div className="text-xl font-bold">
            🧠 Firmensoftware
          </div>

          <div className="flex gap-6 font-semibold">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/leads">Leads</NavLink>
            <NavLink href="/finanzen">Finanzen</NavLink>
            <NavLink href="/kalender">Kalender</NavLink>
          </div>
        </nav>

        {/* Content */}
        <main className="p-8">{children}</main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="hover:text-blue-400 transition-colors"
    >
      {children}
    </Link>
  );
}
