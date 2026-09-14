import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-medium text-pond-500">
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          className={cn(
            "focus-ring w-full rounded-xl border border-pond-100 bg-clarity-100 px-4 py-2.5 text-[15px] text-pond-500 placeholder:text-pond-300 transition-colors focus:border-midnight-400",
            error && "border-rosy-400",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rosy-500">{error}</p>}
      </div>
    );
  }
);

Field.displayName = "Field";