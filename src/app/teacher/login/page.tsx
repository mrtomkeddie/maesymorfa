
'use client';

import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
// Firebase Auth Check Removed for Dev Mode
// import { getAuth... } removed
export default function TeacherLoginPage() {
  const router = useRouter();
  // Auth check removed

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
          <CardTitle className="font-headline text-2xl">Teacher Portal</CardTitle>
          <CardDescription>Staff login for the Teacher Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm userRole="teacher" />
        </CardContent>
      </Card>
    </div>
  )
}
