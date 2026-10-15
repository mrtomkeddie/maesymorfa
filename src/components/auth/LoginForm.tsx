'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";
import { isFirebaseConfigured, isLocalDemo } from "@/lib/firebase/config";
import { sendAdminPasswordReset, signInAdmin } from "@/lib/firebase/auth";
import { ADMIN_HOME } from "@/lib/config/features";

// Plain-English messages for the sign-in errors staff are likely to see
function signInErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  if (code === 'auth/too-many-requests') return "Too many tries. Wait a few minutes, then try again, or reset your password below.";
  if (code === 'auth/network-request-failed') return "Could not reach the server. Check your internet connection and try again.";
  if (code === 'auth/user-disabled') return "This account has been switched off.";
  return "That email and password don't match. Please try again.";
}

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

interface LoginFormProps {
  userRole: 'parent' | 'admin' | 'teacher';
}

export function LoginForm({ userRole }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // School admins sign in for real; the parent and teacher portals are still demos
  const realSignIn = userRole === 'admin' && isFirebaseConfigured;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setNotice(null);

    if (userRole === 'admin' && !isFirebaseConfigured && !isLocalDemo) {
      setError("The admin area isn't set up on this website yet. Ask whoever runs the website to check its Firebase settings.");
      setIsLoading(false);
      return;
    }

    if (realSignIn) {
      try {
        const result = await signInAdmin(values.email, values.password);
        if (result === 'not-admin') {
          setError("This account can't edit the school website yet. Ask whoever runs the website to add you.");
          setIsLoading(false);
          return;
        }
      } catch (signInError) {
        setError(signInErrorMessage(signInError));
        setIsLoading(false);
        return;
      }
    } else {
      // Demo sign-in for the parent and teacher portals
      await new Promise(resolve => setTimeout(resolve, 500)); // Fake delay
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', userRole);
    }

    toast({
      title: "Login Successful",
      description: "Welcome back!",
    });

    let destination = '/dashboard';
    if (userRole === 'admin') {
      destination = ADMIN_HOME;
    } else if (userRole === 'teacher') {
      destination = '/teacher/dashboard';
    }

    router.push(destination);
    router.refresh();
  }

  async function onForgotPassword() {
    const email = form.getValues('email').trim();
    if (!z.string().email().safeParse(email).success) {
      form.setError('email', { message: 'Type your email address first, then press "Forgot your password?" again.' });
      return;
    }
    setError(null);
    try {
      await sendAdminPasswordReset(email);
    } catch (resetError) {
      // Say the same thing whether or not the account exists
      console.error('Password reset failed:', resetError);
    }
    setNotice(`If ${email} has an account, a link to set a new password is on its way. Check your inbox and spam folder.`);
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder={userRole === 'admin' ? "admin@example.com" : userRole === 'teacher' ? "teacher@example.com" : "parent@example.com"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm text-muted-foreground">
        {userRole === 'parent' ? (
          <>
            <p>Don't have an account? <Link href="/signup" className="underline">Sign up</Link></p>
            <p>Forgot your password? <Link href="/signup" className="underline">Reset it</Link></p>
          </>
        ) : realSignIn ? (
          <p>
            <button type="button" onClick={onForgotPassword} className="underline">Forgot your password?</button>
          </p>
        ) : (
          <p>Contact your system administrator for access.</p>
        )}
      </div>
    </div>
  );
}
