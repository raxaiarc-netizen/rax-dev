import type { MetaFunction } from '@remix-run/cloudflare';
import { LoginForm } from '~/components/auth/LoginForm';

export const meta: MetaFunction = () => {
  return [
    { title: 'Login - RAX.AI' },
    { name: 'description', content: 'Sign in to your RAX.AI account' },
  ];
};

export default function LoginPage() {
  return <LoginForm />;
}
