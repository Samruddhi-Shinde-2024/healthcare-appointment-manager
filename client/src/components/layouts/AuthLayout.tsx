import type { ReactNode } from 'react';

type AuthLayoutProps = Readonly<{ children: ReactNode }>;

export function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 px-4 py-12">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-700/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 shadow-lg">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">MedSchedule</h1>
            <p className="text-xs text-brand-300">Healthcare Management Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} MedSchedule. All rights reserved.
        </p>
      </div>
    </div>
  );
}
