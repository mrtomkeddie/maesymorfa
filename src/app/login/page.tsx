
'use client';

import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { app } from "@/lib/firebase/config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Here you would also check the user's role
        // For now, we assume if they have a session, they go to the parent dashboard.
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router, auth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 left-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">&larr; Back to Public Site</Link>
      </div>
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center justify-center">
             <Image src="/icon.png" alt="School logo" width={40} height={40} className="h-10 w-10" />
          </Link>
          <CardTitle className="font-headline text-2xl">Parent Portal Login</CardTitle>
          <CardDescription>Sign in to access the Parent Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm userRole="parent" />
        </CardContent>
      </Card>
    </div>
  )
}
