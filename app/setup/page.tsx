import { redirect } from 'next/navigation';

// The setup page moved to the home page; old links still land there.
export default function SetupPage() {
  redirect('/');
}
