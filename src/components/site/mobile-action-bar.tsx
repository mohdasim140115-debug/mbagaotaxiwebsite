import { getPublicSettings } from "@/server/cms/settings";
import { resolveBooking, resolveCta } from "@/lib/cms/cta";
import { CtaLink } from "./cta-link";

/** Persistent Call · WhatsApp · Book bar on small screens (replaces floating bubbles). */
export async function MobileActionBar() {
  const settings = await getPublicSettings();
  const call = resolveCta({ label: "Call", kind: "call" }, settings);
  const wa = resolveCta({ label: "WhatsApp", kind: "whatsapp" }, settings);
  const book = resolveBooking("Book", settings);
  return (
    <div className="fixed inset-x-0 bottom-0 z-[45] border-t border-line bg-paper-raised/95 p-2 shadow-3 backdrop-blur lg:hidden">
      <div className="grid grid-cols-3 gap-2">
        <CtaLink cta={call} variant="call" size="md" className="w-full px-2" context="mobile_bar" />
        <CtaLink cta={wa} variant="whatsapp" size="md" className="w-full px-2" context="mobile_bar" />
        <CtaLink cta={book} variant="primary" size="md" className="pulse-ring w-full px-2" context="mobile_bar" showIcon={false} />
      </div>
    </div>
  );
}
