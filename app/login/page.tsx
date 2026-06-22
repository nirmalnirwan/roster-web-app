import { X } from "lucide-react";
import Link from "next/link";

import LoginForm from "../../components/auth/LoginForm";
import { Button } from "../../components/ui/button";

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3"
          aria-label="Close login"
        >
          <Link href="/">
            <X className="h-4 w-4" />
          </Link>
        </Button>

        <div className="mb-6 pr-10">
          <h1 className="text-2xl font-bold">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your housekeeping roster dashboard.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
