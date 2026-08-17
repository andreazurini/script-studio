// app/login/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInForm } from "@/app/login/sign-in-form";

export default async function LoginPage() {
  // Chi ha già una sessione non deve vedere il form di login.
  const session = await auth();
  if (session) redirect("/");

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Accedi</h1>
      <SignInForm />
    </main>
  );
}
