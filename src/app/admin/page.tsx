import { redirect } from 'next/navigation';
import { ADMIN_HOME } from '@/lib/config/features';

// /admin on its own goes straight to the page staff use
export default function AdminIndexPage() {
  redirect(ADMIN_HOME);
}
