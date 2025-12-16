"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Password strength calculation
function calculatePasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "bg-gray-200", percentage: 0 };

  let score = 0;
  const length = password.length;

  // Length scoring
  if (length >= 6) score += 20;
  if (length >= 8) score += 20;
  if (length >= 10) score += 20;
  if (length >= 12) score += 15;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 5; // lowercase
  if (/[A-Z]/.test(password)) score += 5; // uppercase
  if (/[0-9]/.test(password)) score += 10; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 10; // special characters

  // Bonus for having multiple types
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (varietyCount >= 3) score += 10;
  if (varietyCount === 4) score += 5;

  // Determine label and color
  let label = "";
  let color = "";
  
  if (score < 40) {
    label = "Weak";
    color = "bg-red-500";
  } else if (score < 70) {
    label = "Medium";
    color = "bg-yellow-500";
  } else if (score < 90) {
    label = "Strong";
    color = "bg-green-500";
  } else {
    label = "Very Strong";
    color = "bg-green-600";
  }

  return { score, label, color, percentage: Math.min(score, 100) };
}

// Validate minimum requirements
function validatePasswordRequirements(password: string) {
  const hasMinLength = password.length >= 6;
  const hasSpecialOrNumber = /[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password);
  return hasMinLength && hasSpecialOrNumber;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showWeakPasswordWarning, setShowWeakPasswordWarning] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const meetsRequirements = useMemo(() => validatePasswordRequirements(password), [password]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Check minimum requirements
    if (!meetsRequirements) {
      setError("Password must be at least 6 characters and include a number or special character");
      setLoading(false);
      return;
    }

    // Check if password is weak (score < 40) and show warning
    if (passwordStrength.score < 40 && !showWeakPasswordWarning) {
      setShowWeakPasswordWarning(true);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg p-8 shadow-soft ring-1 ring-[color:var(--color-border)] text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-semibold text-[color:var(--color-dark)] mb-3">
              Password Reset Successful!
            </h2>
            <p className="text-sm text-[color:var(--color-medium)] mb-6 leading-relaxed">
              Your password has been updated. Redirecting you to the homepage...
            </p>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="masthead text-3xl font-black text-[color:var(--color-dark)]">
              Spring-Ford Press
            </h1>
          </Link>
          <p className="text-sm text-[color:var(--color-medium)] mt-2">
            Create a new password for your account
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-soft ring-1 ring-[color:var(--color-border)]">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              <p className="text-xs text-[color:var(--color-medium)] mt-1.5 mb-2">
                Must be at least 6 characters and include a number or special character
              </p>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-dark)]">
                      Password Strength:
                    </span>
                    <span className={`text-xs font-semibold ${
                      passwordStrength.score < 40 ? 'text-red-600' :
                      passwordStrength.score < 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ease-out ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-[color:var(--color-border)] bg-white px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-riviera-blue)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Weak Password Warning - Small Popup */}
            {showWeakPasswordWarning && (
              <div className="rounded-md bg-yellow-50 border border-yellow-300 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-1">Weak Password</h4>
                    <p className="text-yellow-800 mb-3 text-xs leading-relaxed">
                      This password may be vulnerable. We recommend at least 10 characters with uppercase, lowercase, numbers, and special characters.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowWeakPasswordWarning(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-yellow-900 bg-white border border-yellow-300 hover:bg-yellow-50 rounded transition"
                      >
                        Go Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWeakPasswordWarning(false);
                          handleResetPassword(new Event('submit') as any);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-yellow-600 text-white hover:bg-yellow-700 rounded transition"
                      >
                        Proceed Anyway
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#2b7a92] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting password..." : "Reset Password"}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

