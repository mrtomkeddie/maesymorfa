
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
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase/config";

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
  const auth = getAuth(app);


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
    
    // Mock login for dev environment if Firebase isn't configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', userRole);
    } else {
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            // Real role check would happen here by getting user's custom claims
             localStorage.setItem('isAuthenticated', 'true');
             localStorage.setItem('userRole', userRole);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return;
        }
    }


    toast({
        title: "Login Successful",
        description: "Welcome back!",
    });
    
    let destination = '/dashboard';
    if (userRole === 'admin') {
      destination = '/admin/dashboard';
    } else if (userRole === 'teacher') {
      destination = '/teacher/dashboard';
    }
    
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="space-y-6">
       {error && (
        <Alert variant="destructive">
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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
        ) : (
             <p>Contact your system administrator for access.</p>
        )}
      </div>
    </div>
  );
}
