import { RegistrationForm } from "./_components/RegistrationForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <RegistrationForm initialReferralCode={params.ref ?? ""} />
    </div>
  );
}
