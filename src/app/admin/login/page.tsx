
'use client';

import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { watchAdmin } from "@/lib/firebase/auth";

export default function AdminLoginPage() {
  const router = useRouter();

  // Already signed in as an admin when the page opens: go straight in. Only the first answer
  // counts; a fresh sign-in is sent on by the form itself, and two redirects at once get stuck.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let firstAnswer = true;
    return watchAdmin(({ admin }) => {
      if (firstAnswer && admin) router.replace('/admin/dashboard');
      firstAnswer = false;
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="absolute top-4 left-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">&larr; Back to Public Site</Link>
      </div>
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center justify-center">
            <Image src="/icon.png" alt="School logo" width={40} height={40} className="h-10 w-10" />
          </Link>
          <CardTitle className="font-headline text-2xl">Admin Dashboard</CardTitle>
          <CardDescription>Staff login for the Parent Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm userRole="admin" />
        </CardContent>
      </Card>
    </div>
  )
}
