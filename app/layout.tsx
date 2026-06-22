import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SideNav from "@/components/sidenav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Roster Manager - Housekeeper Scheduling",
  description: "Manage weekly cleaning rosters for retirement villages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-neutral-950 dark:text-slate-100`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen md:flex">
            <SideNav />
            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
              <Navbar />
              <main className="flex-1 bg-slate-50/90 pb-20 dark:bg-neutral-950 md:pb-0">
                <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
                  {children}
                </div>
              </main>
              <Footer />
            </div>
          </div>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
