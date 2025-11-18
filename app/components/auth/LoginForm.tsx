import { useState } from 'react';
import { Link } from '@remix-run/react';
import { classNames } from '~/utils/classNames';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/oauth/google';
  };

  const handleGithubLogin = () => {
    window.location.href = '/api/auth/oauth/github';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as { success?: boolean; accessToken?: string; error?: string };

    if (response.ok && data.success) {
      // Store access token in localStorage
      // Refresh token is automatically stored in HTTP-only cookie by the server
      localStorage.setItem('accessToken', data.accessToken!);
      window.location.href = '/';
    } else {
      setError(data.error || 'Login failed');
    }
  };

  return (
    <div
      className={classNames(
        'w-full py-8 px-8 box-border flex flex-col items-center overflow-hidden bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 max-w-md',
        className,
      )}
      {...props}
    >
      <span className="text-3xl font-semibold text-white/95 mb-6">Sign In</span>

      {/* GitHub Sign In Button */}
      <button
        type="button"
        onClick={handleGithubLogin}
        className="w-full mt-4 inline-flex items-center justify-center whitespace-nowrap rounded-lg transition-all h-10 px-6 gap-2 text-sm font-medium border border-white/16 text-white/95 hover:border-white/12 active:border-white/12 bg-transparent"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <div className="text-sm font-medium text-white/95">Sign in with GitHub</div>
      </button>

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full mt-3 inline-flex items-center justify-center whitespace-nowrap rounded-lg transition-all h-10 px-6 gap-2 text-sm font-medium border border-white/16 text-white/95 hover:border-white/12 active:border-white/12 bg-transparent"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4.22235 7.99951C4.22235 7.57738 4.29437 7.17242 4.42178 6.79295L2.18482 5.11993C1.73537 6.01321 1.50198 6.99954 1.50342 7.99951C1.50342 9.03435 1.74828 10.0105 2.18371 10.8769L4.41957 9.20109C4.2892 8.81389 4.22259 8.40808 4.22235 7.99951Z"
            fill="#FBBC05"
          />
          <path
            d="M8.15116 4.15897C9.08738 4.15897 9.93331 4.48361 10.5981 5.01542L12.532 3.1247C11.3537 2.12033 9.84301 1.49988 8.15116 1.49988C5.5242 1.49988 3.26618 2.97069 2.18481 5.12013L4.42289 6.79314C4.93809 5.26084 6.40724 4.15897 8.15116 4.15897Z"
            fill="#EA4335"
          />
          <path
            d="M8.15116 11.8408C6.40668 11.8408 4.93753 10.7389 4.42178 9.2066L2.18481 10.8796C3.26563 13.0291 5.52364 14.4999 8.15116 14.4999C9.7721 14.4999 11.3199 13.9365 12.4822 12.88L10.3582 11.2724C9.75936 11.6419 9.00484 11.8408 8.15061 11.8408"
            fill="#34A853"
          />
          <path
            d="M14.4965 7.99975C14.4965 7.61584 14.4355 7.20202 14.3452 6.81812H8.15063V9.3293H11.716C11.5382 10.1858 11.0529 10.8439 10.3588 11.2721L12.4822 12.8797C13.7026 11.7707 14.4965 10.1187 14.4965 7.99975Z"
            fill="#4285F4"
          />
        </svg>
        <div className="text-sm font-medium text-white/95">Sign in with Google</div>
      </button>

      {/* Divider */}
      <div className="w-full text-center text-white/60 text-sm my-6">Or Sign in with email</div>

      {/* Form */}
      <div className="w-full flex-1 overflow-hidden">
        <form onSubmit={handleSubmit} className="w-full">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="mb-2">
            <input
              type="email"
              name="email"
              placeholder="Email: *****@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent text-white/95 placeholder:text-white/60 box-border text-sm leading-[22px] rounded-lg transition-all outline-none px-4 py-2.5 h-[38px] border border-white/16 focus:border-white/40"
            />
          </div>
          <p className="flex items-start text-xs leading-5 text-red-400 min-h-5 mb-2">
            <div className="message-content">&nbsp;</div>
          </p>

          {/* Password */}
          <div className="mb-2">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent text-white/95 placeholder:text-white/60 box-border text-sm leading-[22px] rounded-lg transition-all outline-none px-4 py-2.5 h-[38px] border border-white/16 focus:border-white/40"
            />
          </div>
          <p className="flex items-start text-xs leading-5 text-red-400 min-h-5 mb-4">
            <div className="message-content">&nbsp;</div>
          </p>

          {/* Sign up link */}
          <div className="text-white/60 text-sm mb-4 flex items-center justify-center">
            <span>Don&apos;t have an account?</span>&nbsp;
            <Link to="/signup" className="text-white/95 hover:text-white/60 transition-colors underline">
              Sign up
            </Link>
            &nbsp;now
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mb-4 inline-flex items-center justify-center whitespace-nowrap rounded-lg transition-all h-10 px-6 gap-2 text-sm font-medium bg-white text-black hover:bg-white/80 active:bg-white/80 disabled:bg-white/40 disabled:text-black/40"
          >
            Continue
          </button>

          {/* Terms */}
          <div className="text-center text-white/60 text-xs">
            <span>By continuing, you agree to our </span>
            <a href="/terms" className="text-white/95 hover:text-white/60 transition-colors underline">
              Terms
            </a>
            <span> and </span>
            <a href="/privacy" className="text-white/95 hover:text-white/60 transition-colors underline">
              Privacy Policy
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

