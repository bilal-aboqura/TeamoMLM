"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

export type PayLaterActionResult =
  | { success: true; message?: string }
  | { error: { field: string; message: string } };

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function activatePayLater(
  packageId: string
): Promise<PayLaterActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return {
      error: { field: "general", message: "يرجى تسجيل الدخول أولاً" },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("user_activate_pay_later", {
    p_to_package_id: packageId,
  });

  if (error) {
    const message = error.message;
    if (message.includes("not_eligible")) {
      return {
        error: {
          field: "general",
          message:
            "الميزة غير متاحة حالياً. تحتاج إلى 30 يوم عمل معتمد أو موافقة الإدارة.",
        },
      };
    }
    if (message.includes("monthly_limit")) {
      return {
        error: {
          field: "general",
          message: "يمكن استخدام الترقية بالدفع لاحقاً مرة واحدة فقط كل 30 يوم.",
        },
      };
    }
    if (message.includes("open_debt_exists")) {
      return {
        error: {
          field: "general",
          message: "لديك دين دفع لاحق مفتوح بالفعل.",
        },
      };
    }
    if (message.includes("only_next_package")) {
      return {
        error: {
          field: "general",
          message: "يمكن الترقية فقط إلى الباقة التالية مباشرة.",
        },
      };
    }

    return {
      error: {
        field: "general",
        message: "حدث خطأ أثناء تفعيل الترقية. يرجى المحاولة مرة أخرى.",
      },
    };
  }

  revalidatePath("/dashboard/pay-later");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");

  return { success: true, message: "تمت الترقية بنجاح" };
}

export async function repayPayLaterFromWallet(
  debtId: string
): Promise<PayLaterActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return {
      error: { field: "general", message: "يرجى تسجيل الدخول أولاً" },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("user_repay_pay_later_from_wallet", {
    p_debt_id: debtId,
  });

  if (error) {
    if (error.message.includes("insufficient_balance")) {
      return {
        error: {
          field: "general",
          message: "رصيد المحفظة غير كافٍ لسداد الدين بالكامل.",
        },
      };
    }
    return {
      error: {
        field: "general",
        message: "تعذر سداد الدين من المحفظة. يرجى المحاولة مرة أخرى.",
      },
    };
  }

  revalidatePath("/dashboard/pay-later");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return { success: true, message: "تم سداد الدين من المحفظة" };
}

export async function submitPayLaterReceipt(
  formData: FormData
): Promise<PayLaterActionResult> {
  const debtId = formData.get("debt_id")?.toString() ?? "";
  const receipt = formData.get("receipt");

  if (!debtId) {
    return { error: { field: "general", message: "طلب السداد غير صالح" } };
  }

  if (!(receipt instanceof File)) {
    return { error: { field: "receipt", message: "يرجى رفع صورة السداد" } };
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(receipt.type)) {
    return {
      error: {
        field: "receipt",
        message: "يرجى رفع صورة فقط بصيغة JPEG أو PNG",
      },
    };
  }

  if (receipt.size <= 0 || receipt.size > MAX_FILE_SIZE) {
    return {
      error: {
        field: "receipt",
        message: "حجم الصورة يجب أن يكون أكبر من صفر ولا يتجاوز 50 ميغابايت",
      },
    };
  }

  const userId = await requireUserId();
  if (!userId) {
    return {
      error: { field: "general", message: "يرجى تسجيل الدخول أولاً" },
    };
  }

  const admin = createAdminClient();

  const { data: debt } = await admin
    .from("pay_later_debts")
    .select("id, status, user_id, repayment_receipt_path")
    .eq("id", debtId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!debt || !["active", "overdue"].includes(debt.status)) {
    return {
      error: {
        field: "general",
        message: "لا يمكن إرسال إثبات لهذا الدين حالياً.",
      },
    };
  }

  const ext = receipt.type === "image/png" ? "png" : "jpg";
  const storagePath = `pay-later-repayments/${userId}/${crypto.randomUUID()}.${ext}`;
  const buffer = await receipt.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("proofs")
    .upload(storagePath, buffer, {
      contentType: receipt.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: {
        field: "general",
        message: "حدث خطأ أثناء رفع صورة السداد.",
      },
    };
  }

  const { error: updateError } = await admin
    .from("pay_later_debts")
    .update({
      status: "pending_review",
      repayment_receipt_path: storagePath,
      repayment_submitted_at: new Date().toISOString(),
      repayment_rejection_reason: null,
    })
    .eq("id", debtId)
    .eq("user_id", userId);

  if (updateError) {
    await admin.storage.from("proofs").remove([storagePath]);
    return {
      error: {
        field: "general",
        message: "تعذر إرسال إثبات السداد. يرجى المحاولة مرة أخرى.",
      },
    };
  }

  if (debt.repayment_receipt_path) {
    await admin.storage.from("proofs").remove([debt.repayment_receipt_path]);
  }

  revalidatePath("/dashboard/pay-later");
  revalidatePath("/admin/pay-later");

  return { success: true, message: "تم إرسال إثبات السداد للمراجعة" };
}
