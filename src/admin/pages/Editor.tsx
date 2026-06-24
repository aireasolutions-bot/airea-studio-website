import { FilePenLine } from "lucide-react";
import { PageHead, Roadmap } from "./_Placeholder";

export function Editor() {
  return (
    <div>
      <PageHead
        eyebrow="Content"
        title="Site editor"
        sub="Change copy, headlines, CTAs, and images across the site — no code. Edits save as a draft you can preview and publish."
      />
      <Roadmap
        icon={FilePenLine}
        title="Visual content editing"
        items={[
          "Edit every headline, paragraph, and CTA label",
          "Swap images by picking from the Asset library",
          "Manage FAQ questions & answers",
          "Edit pricing plans and features",
          "Draft vs. published — nothing goes live until you publish",
          "Section-by-section, with a live preview alongside",
        ]}
      />
    </div>
  );
}
