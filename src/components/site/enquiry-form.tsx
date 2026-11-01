"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { enquirySchema, type EnquiryInput } from "@/lib/validation/enquiry";
import { Button } from "@/components/ui/button";
import { readAttribution } from "./attribution";
import { track } from "@/components/analytics/track";
import { cn } from "@/lib/utils";

type FieldName = keyof EnquiryInput;

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-900">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-500">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-[6px] border border-line bg-white px-3.5 text-base text-ink-900 placeholder:text-ink-500 aria-[invalid=true]:border-danger focus:border-teal-600";

export function EnquiryForm({ consentText, privacyPath, defaultType }: { consentText: string; privacyPath: string; defaultType: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { type: defaultType as EnquiryInput["type"], company: "", startedAt: 0 },
    shouldFocusError: true,
  });

  useEffect(() => {
    setValue("startedAt", Date.now());
    // Prefill the subject when arriving from a "Book" button (?subject=...).
    const subject = new URLSearchParams(window.location.search).get("subject");
    if (subject) setValue("subject", subject.slice(0, 191));
  }, [setValue]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const onSubmit = handleSubmit(
    async (values) => {
      setStatus("submitting");
      setServerError("");
      try {
        const res = await fetch("/api/enquiries/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, ...readAttribution() }),
        });
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !body.ok) {
          setStatus("error");
          setServerError(body.error ?? "Sorry, we couldn't send your enquiry. Please try again or contact us on WhatsApp.");
          return;
        }
        setStatus("success");
        track("enquiry_submit", { enquiry_type: values.type ?? "general" });
      } catch {
        setStatus("error");
        setServerError("Network error — please check your connection and try again.");
      }
    },
    () => {
      track("enquiry_validation_error", {});
      requestAnimationFrame(() => document.getElementById("enq-error-summary")?.focus());
    },
  );

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="mt-6 rounded-[10px] border border-success/30 bg-[#ecf7f1] p-6">
        <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
        <p className="mt-3 text-lg font-semibold">Thank you — your enquiry has been received.</p>
        <p className="mt-1 text-ink-700">Our team will contact you on the phone number you provided. This is an enquiry, not a confirmed booking.</p>
      </div>
    );
  }

  const errorList = Object.entries(errors).filter(([, v]) => v?.message) as [FieldName, { message?: string }][];
  const a = (name: FieldName) => ({
    id: `enq-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `enq-${name}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5" aria-describedby="enq-required-note">
      <p id="enq-required-note" className="text-sm text-ink-500">
        Fields marked * are required.
      </p>
      {errorList.length > 0 && (
        <div id="enq-error-summary" tabIndex={-1} role="alert" className="rounded-[10px] border border-danger/30 bg-danger-50 p-4 text-sm">
          <p className="font-semibold text-danger">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map(([k, v]) => (
              <li key={k}>
                <a href={`#enq-${k}`} className="underline">
                  {v.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input type="hidden" {...register("type")} />
      <input type="hidden" {...register("startedAt")} />
      <input type="hidden" {...register("subject")} />
      {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="enq-company">Company</label>
        <input id="enq-company" tabIndex={-1} autoComplete="off" {...register("company")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="enq-name" label="Full name" error={errors.name?.message}>
          <input {...a("name")} {...register("name")} autoComplete="name" className={inputCls} />
        </Field>
        <Field id="enq-phone" label="Phone / WhatsApp number *" error={errors.phone?.message}>
          <input {...a("phone")} {...register("phone")} type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" className={inputCls} />
        </Field>
        <Field id="enq-email" label="Email" error={errors.email?.message}>
          <input {...a("email")} {...register("email")} type="email" autoComplete="email" className={inputCls} />
        </Field>
        <Field id="enq-travelDate" label="Travel date & time" error={errors.travelDate?.message}>
          <input {...a("travelDate")} {...register("travelDate")} type="datetime-local" className={inputCls} />
        </Field>
        <Field id="enq-pickup" label="Pickup location" error={errors.pickup?.message}>
          <input {...a("pickup")} {...register("pickup")} className={inputCls} placeholder="e.g. Mopa Airport" />
        </Field>
        <Field id="enq-dropoff" label="Destination" error={errors.dropoff?.message}>
          <input {...a("dropoff")} {...register("dropoff")} className={inputCls} placeholder="e.g. Calangute" />
        </Field>
        <Field id="enq-travellers" label="Number of passengers" error={errors.travellers?.message}>
          <input {...a("travellers")} {...register("travellers")} type="number" inputMode="numeric" min={1} max={99} className={inputCls} />
        </Field>
      </div>
      <Field id="enq-message" label="Message" error={errors.message?.message} hint="Flight details, vehicle preference or anything else we should know.">
        <textarea {...a("message")} {...register("message")} rows={4} className={cn(inputCls, "h-auto py-3")} />
      </Field>
      <div>
        <div className="flex items-start gap-3">
          <input
            id="enq-consent"
            type="checkbox"
            {...register("consent")}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "enq-consent-error" : undefined}
            className="mt-1 size-5 shrink-0 accent-teal-600"
          />
          <label htmlFor="enq-consent" className="text-sm text-ink-700">
            {consentText} *
            {privacyPath && (
              <>
                {" "}
                <a href={privacyPath} className="underline">
                  Privacy policy
                </a>
              </>
            )}
          </label>
        </div>
        {errors.consent && (
          <p id="enq-consent-error" className="mt-1.5 text-sm font-medium text-danger">
            {errors.consent.message}
          </p>
        )}
      </div>
      {status === "error" && (
        <p role="alert" className="rounded-[10px] bg-danger-50 p-3 text-sm font-medium text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" && <Loader2 className="animate-spin" aria-hidden="true" />}
        {status === "submitting" ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}
