
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { app } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SignUpPage() {
    const auth = getAuth(app);
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mode, setMode] = useState<'signup' | 'reset'>('signup');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            toast({
                title: "Account Created",
                description: "You have successfully signed up. Please log in.",
            });
            // You might want to redirect the user to the login page or dashboard
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess("A password reset link has been sent to your email.");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="absolute top-4 left-4">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">&larr; Back to Login</Link>
            </div>
            <Card className="w-full max-w-md shadow-2xl border-0">
                <CardHeader className="text-center">
                     <Link href="/" className="mx-auto mb-4 flex items-center justify-center">
                        <Image src="/icon.png" alt="School logo" width={40} height={40} className="h-10 w-10" />
                    </Link>
                    <CardTitle className="font-headline text-2xl">Parent Portal</CardTitle>
                    <CardDescription>
                        {mode === 'signup' ? 'Create an account' : 'Reset your password'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                    {success && <Alert variant="default" className="mb-4"><AlertDescription>{success}</AlertDescription></Alert>}

                    {mode === 'signup' ? (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div>
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <div>
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign Up
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </Button>
                        </form>
                    )}
                     <div className="mt-4 text-center text-sm">
                        {mode === 'signup' ? (
                            <p>
                                Forgot your password?{' '}
                                <Button variant="link" className="p-0 h-auto" onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}>
                                    Reset it here.
                                </Button>
                            </p>
                        ) : (
                            <p>
                                Ready to sign up?{' '}
                                <Button variant="link" className="p-0 h-auto" onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}>
                                    Create an account.
                                </Button>
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
