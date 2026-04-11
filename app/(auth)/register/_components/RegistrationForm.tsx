"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { registerUser, type ActionResult } from "../../actions";

const initialState: ActionResult = { success: false, idle: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="إنشاء حساب"
      className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold hover:bg-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
    </button>
  );
}

export function RegistrationForm({
  initialReferralCode,
}: {
  initialReferralCode: string;
}) {
  const [state, formAction] = useActionState(registerUser, initialState);
  const error = "error" in state ? state.error : null;
  const router = useRouter();

  useEffect(() => {
    if ("success" in state && state.success === true) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          إنشاء حساب جديد
        </h1>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              الاسم الكامل
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              placeholder="أدخل اسمك الكامل"
              aria-label="الاسم الكامل"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
            />
            {error?.field === "full_name" && (
              <p className="mt-1 text-sm text-red-600" aria-live="polite">
                {error.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="phone_number"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              رقم الهاتف
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              required
              minLength={7}
              maxLength={20}
              placeholder="أدخل رقم هاتفك"
              aria-label="رقم الهاتف"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
            />
            {error?.field === "phone_number" && (
              <p className="mt-1 text-sm text-red-600" aria-live="polite">
                {error.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              placeholder="أدخل كلمة المرور"
              aria-label="كلمة المرور"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
            />
            {error?.field === "password" && (
              <p className="mt-1 text-sm text-red-600" aria-live="polite">
                {error.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="referral_code"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              كود الإحالة *
            </label>
            <input
              id="referral_code"
              name="referral_code"
              type="text"
              defaultValue={initialReferralCode}
              placeholder="أدخل كود الإحالة (اختياري)"
              aria-label="كود الإحالة"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
            />
            {error?.field === "referral_code" && (
              <p className="mt-1 text-sm text-red-600" aria-live="polite">
                {error.message}
              </p>
            )}
          </div>

          {error?.field === "general" && (
            <p className="text-sm text-red-600 text-center" aria-live="polite">
              {error.message}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          لديك حساب بالفعل؟{" "}
          <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
            تسجيل الدخول
          </a>
        </p>
      </div>
    </div>
  );
}
