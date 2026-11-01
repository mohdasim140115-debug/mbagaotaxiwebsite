import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="section-y bg-paper pt-[calc(72px+64px)]">
      <div className="container-prose text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="font-display fs-h1 mt-3 font-semibold">This page doesn&apos;t seem to exist.</h1>
        <p className="mt-4 text-lg text-ink-700">It looks like the link pointing here was faulty. Try one of these instead:</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Home
          </Link>
          <Link href="/packages/" className={buttonVariants({ variant: "secondary" })}>
            Packages
          </Link>
          <Link href="/taxi-services/" className={buttonVariants({ variant: "secondary" })}>
            Taxi Services
          </Link>
          <Link href="/goa-taxi-service-contact/" className={buttonVariants({ variant: "secondary" })}>
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
