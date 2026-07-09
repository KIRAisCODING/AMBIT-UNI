import React from 'react';

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      // 1. Fetch CSRF token
      const res = await fetch("/api/auth/csrf");
      const { csrfToken } = await res.json();

      // 2. Dynamically create form and submit it
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = window.location.origin + "/";
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Failed to sign in with Google:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary flex flex-col items-center justify-center p-6 transition-colors duration-300">
      {/* Outer Card Container */}
      <div className="w-full max-w-[440px] bg-surface border border-border rounded-[32px] canvas-shadow p-10 flex flex-col items-center text-center animate-scale-in">
        
        {/* Ambit Logo */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-3xl font-headline font-bold tracking-tighter text-textPrimary">
            AMBIT
          </span>
          <span className="text-[10px] uppercase tracking-widest font-mono text-pill-active-text bg-pill-active px-2 py-0.5 rounded-full font-semibold">
            v2.5
          </span>
        </div>

        {/* Headings */}
        <h1 className="text-2xl md:text-3xl font-headline font-bold tracking-tight text-textPrimary mb-2">
          Your external brain.
        </h1>
        <p className="text-sm text-textSecondary font-medium mb-10">
          Capture. Organize. Execute.
        </p>

        {/* Continue with Google CTA */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-pill-active text-pill-active-text font-bold text-xs py-3.5 px-6 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          {/* Custom inline Google Logo SVG */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.328 2.673 1.34 6.577l3.926 3.188z"
            />
            <path
              fill="#34A853"
              d="M16.04 15.345c-1.077.732-2.477 1.164-4.04 1.164a7.077 7.077 0 0 1-6.734-4.855L1.34 14.842C3.328 18.745 7.33 21.418 12 21.418c3.09 0 5.89-1.018 7.91-2.782l-3.87-3.291z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.275c0-.8-.073-1.573-.209-2.318H12v4.51h6.46A5.523 5.523 0 0 1 16.04 18.1l3.87 3.29c2.264-2.09 3.58-5.172 3.58-9.115z"
            />
            <path
              fill="#FBBC05"
              d="M5.266 14.235A7.077 7.077 0 0 1 4.91 12c0-.79.127-1.545.356-2.255L1.34 6.557A11.936 11.936 0 0 0 0 12c0 1.92.436 3.745 1.218 5.382l4.048-3.147z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Small Footer */}
        <p className="text-[10px] text-textMuted font-medium mt-8 leading-relaxed max-w-[280px]">
          By continuing you agree to the <span className="hover:underline cursor-pointer">Terms</span> and <span className="hover:underline cursor-pointer">Privacy Policy</span>.
        </p>

      </div>
    </div>
  );
}
