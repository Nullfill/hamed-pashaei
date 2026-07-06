import type { HomeSection } from "@/lib/providers/types";
import { SectionRail } from "@/components/media/SectionRail";

export function MediaSlider({ section }: { section: HomeSection }) {
  return <SectionRail section={section} />;
}
