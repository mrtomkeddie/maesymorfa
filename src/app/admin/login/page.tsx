
'use client';

import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase, getUserRole } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const role = await getUserRole(session.user.id);
        if (role === 'admin') {
          router.push('/admin/dashboard');
        }
      }
    };
    checkSession();
  }, [router, isSupabaseConfigured]);
  
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
