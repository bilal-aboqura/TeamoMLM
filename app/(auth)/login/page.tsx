import { LoginForm } from "./_components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const params = await searchParams;
  const expired = params.expired === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <LoginForm sessionExpired={expired} />
    </div>
  );
}
