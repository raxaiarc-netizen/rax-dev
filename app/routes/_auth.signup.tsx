import type { MetaFunction } from '@remix-run/cloudflare';
import { SignupForm } from '~/components/auth/SignupForm';

export const meta: MetaFunction = () => {
  return [
    { title: 'Sign Up - RAX.AI' },
    { name: 'description', content: 'Create your RAX.AI account' },
  ];
};

export default function SignupPage() {
  return <SignupForm />;
}
