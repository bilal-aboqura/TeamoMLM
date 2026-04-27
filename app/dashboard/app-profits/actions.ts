"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { appProfitProofUploadSchema } from "@/lib/validations/app-profit-schemas";
import type { SubmitProofResult } from "@/lib/app-profits/types";

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function mapRpcError(message?: string) {
  if (!message) return "حدث خطأ، يرجى المحاولة مرة أخرى";
  if (message.includes("unauthenticated")) return "يرجى تسجيل الدخول أولاً";
  if (message.includes("access_denied")) return "هذه الميزة غير متاحة لحسابك حالياً";
  if (message.includes("offer_not_found")) return "العرض غير متاح";
  if (message.includes("already_submitted")) return "لديك إثبات معلق أو مقبول لهذا التطبيق";
  return "حدث خطأ، يرجى المحاولة مرة أخرى";
}

export async function submitAppProfitProof(
  _prevState: SubmitProofResult,
  formData: FormData
): Promise<SubmitProofResult> {
  const parsed = appProfitProofUploadSchema.safeParse({
    offer_id: formData.get("offer_id"),
    proof: formData.get("proof"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      error: {
        field: (firstError.path[0]?.toString() as "offer_id" | "proof") ?? "general",
        message: firstError.message,
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { field: "general", message: "يرجى تسجيل الدخول أولاً" } };
  }

  const { offer_id, proof } = parsed.data;
  const storagePath = `proofs/${user.id}/${crypto.randomUUID()}.${extensionFor(proof)}`;
  const buffer = await proof.arrayBuffer();
  const adminClient = createAdminClient();

  const { error: uploadError } = await adminClient.storage
    .from("app-profit-proofs")
    .upload(storagePath, buffer, {
      contentType: proof.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: { field: "general", message: "حدث خطأ أثناء رفع الصورة" } };
  }

  const { error: rpcError } = await supabase.rpc("user_submit_app_profit_proof", {
    p_offer_id: offer_id,
    p_screenshot_url: storagePath,
  });

  if (rpcError) {
    await adminClient.storage.from("app-profit-proofs").remove([storagePath]);
    return { error: { field: "general", message: mapRpcError(rpcError.message) } };
  }

  revalidatePath("/dashboard/app-profits");
  revalidatePath("/dashboard/app-profits/history");
  return { success: true };
}
