import { Rocket } from "lucide-react";
import { PageHead, Roadmap } from "./_Placeholder";

export function Publish() {
  return (
    <div>
      <PageHead
        eyebrow="Go live"
        title="Publish"
        sub="Push approved changes to the live site. Every publish is also committed to GitHub for a full version history."
      />
      <Roadmap
        icon={Rocket}
        title="One-click publish → live + GitHub"
        items={[
          "Review a diff of what changed before publishing",
          "Publishes the draft content to the live site",
          "Commits the change to GitHub automatically",
          "Triggers a Vercel deploy",
          "Full audit log: who published what, and when",
          "Roll back to any previous version",
        ]}
      />
    </div>
  );
}
