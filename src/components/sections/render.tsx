import type { Section } from "@/lib/cms/sections";
import { HeroSection } from "./hero";
import { AirportSection, FleetSection, PackagesSection, ServicesSection } from "./catalogue";
import {
  AboutIntroSection,
  CtaBandSection,
  DestinationsSection,
  FaqSection,
  FeatureCardsSection,
  FeatureSplitSection,
  PageHeaderSection,
  RichTextSection,
  StatsSection,
  TestimonialsSection,
} from "./content";
import { HotelsSection } from "./hotels";
import { ContactSection, EnquiryFormSection } from "./contact";
import { GallerySection } from "./gallery";
import { BlogPostsSection } from "./blog-list";

/** Maps CMS section types to their renderers. Unknown types render nothing (never raw HTML). */
export function SectionRenderer({ section }: { section: Section }) {
  const data = section.data;
  switch (section.type) {
    case "hero":
      return <HeroSection data={data} />;
    case "page_header":
      return <PageHeaderSection data={data} />;
    case "services":
      return <ServicesSection data={data} />;
    case "packages":
      return <PackagesSection data={data} />;
    case "feature_split":
      return <FeatureSplitSection data={data} />;
    case "fleet":
      return <FleetSection data={data} />;
    case "airport":
      return <AirportSection data={data} />;
    case "destinations":
      return <DestinationsSection data={data} />;
    case "testimonials":
      return <TestimonialsSection data={data} />;
    case "faq":
      return <FaqSection data={data} />;
    case "rich_text":
      return <RichTextSection data={data} />;
    case "about_intro":
      return <AboutIntroSection data={data} />;
    case "feature_cards":
      return <FeatureCardsSection data={data} />;
    case "stats":
      return <StatsSection data={data} />;
    case "cta_band":
      return <CtaBandSection data={data} />;
    case "hotels":
      return <HotelsSection data={data} />;
    case "contact":
      return <ContactSection data={data} />;
    case "gallery":
      return <GallerySection data={data} />;
    case "blog_posts":
      return <BlogPostsSection data={data} />;
    case "enquiry_form":
      return <EnquiryFormSection data={data} />;
    default:
      return null;
  }
}

export function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <SectionRenderer key={s.id ?? i} section={s} />
      ))}
    </>
  );
}
