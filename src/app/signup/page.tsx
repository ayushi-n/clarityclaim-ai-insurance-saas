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

const schema = z
  .object({
    organizationName: z.string().min(2, "Tell us your company name"),
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid work email"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type FormData = z.infer<typeof schema>;

export default function SignupPage() {
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

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Something went wrong. Try again.");
      setLoading(false);
      return;
    }

    await signIn("credentials", { redirect: false, email: data.email, password: data.password });
    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="font-display text-3xl font-medium tracking-tight text-pond-500">Create your workspace</h1>
        <p className="mt-2 text-sm text-pond-400">Your first 25 claims are free — no card needed.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <Field
            id="organizationName"
            label="Company name"
            placeholder="Meridian Mutual"
            error={errors.organizationName?.message}
            {...register("organizationName")}
          />
          <Field
            id="name"
            label="Full name"
            placeholder="Alex Rivera"
            error={errors.name?.message}
            {...register("name")}
          />
          <Field
            id="email"
            label="Work email"
            type="email"
            placeholder="you@insurer.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <Field
              id="confirmPassword"
              label="Confirm"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </div>

          {serverError && (
            <div className="flex items-center gap-2 rounded-lg bg-rosy-50 px-3 py-2 text-sm text-rosy-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating workspace…" : "Create workspace"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-pond-400">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-midnight-500 hover:underline">
            Log in
          </a>
        </p>
      </motion.div>
    </AuthShell>
  );
}
