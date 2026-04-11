"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { loginUser, type ActionResult } from "../../actions";

const initialState: ActionResult = { success: false, idle: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="تسجيل الدخول"
      className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold hover:bg-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
    </button>
  );
}

export function LoginForm({ sessionExpired }: { sessionExpired: boolean }) {
  const [state, formAction] = useActionState(loginUser, initialState);
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
        <div className="text-center mb-6 flex justify-center">
          <Image
            src="/logo.jpeg"
            alt="Teamo Logo"
            width={140}
            height={56}
            className="h-12 w-auto object-contain drop-shadow-sm"
            priority
          />
        </div>

        {sessionExpired && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-sm text-amber-800">
              انتهت جلستك، يرجى تسجيل الدخول مجدداً
            </p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="login_phone"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              رقم الهاتف
            </label>
            <input
              id="login_phone"
              name="phone_number"
              type="tel"
              required
              minLength={7}
              maxLength={20}
              placeholder="أدخل رقم هاتفك"
              aria-label="رقم الهاتف"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="login_password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              كلمة المرور
            </label>
            <input
              id="login_password"
              name="password"
              type="password"
              required
              placeholder="أدخل كلمة المرور"
              aria-label="كلمة المرور"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center" aria-live="polite">
              {error.message}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          ليس لديك حساب؟{" "}
          <a href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
            إنشاء حساب جديد
          </a>
        </p>
      </div>
    </div>
  );
}
