"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid work email"),
  password: z.string().min(1, "Enter your password"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setServerError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (res?.error) {
      setServerError("That email and password don't match an account.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="font-display text-3xl font-medium tracking-tight text-pond-500">Welcome back</h1>
        <p className="mt-2 text-sm text-pond-400">Log in to your claims workspace.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <Field
            id="email"
            label="Work email"
            type="email"
            placeholder="you@insurer.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError && (
            <div className="flex items-center gap-2 rounded-lg bg-rosy-50 px-3 py-2 text-sm text-rosy-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-pond-400">
          New to ClarityClaim?{" "}
          <a href="/signup" className="font-medium text-midnight-500 hover:underline">
            Create a workspace
          </a>
        </p>
      </motion.div>
    </AuthShell>
  );
}
