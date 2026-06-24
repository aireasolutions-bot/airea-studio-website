import { MessagesSquare } from "lucide-react";
import { PageHead, Roadmap } from "./_Placeholder";

export function Comments() {
  return (
    <div>
      <PageHead
        eyebrow="Review"
        title="Preview & comments"
        sub="Open a private preview of the draft site, click anywhere to pin a comment, and track feedback to resolution."
      />
      <Roadmap
        icon={MessagesSquare}
        title="Click-to-comment review"
        items={[
          "Private preview of unpublished changes",
          "Click any element to drop a pinned comment",
          "Statuses: open → in progress → confirmed / rejected",
          "Threaded notes per area, assigned to teammates",
          "Resolve everything before you publish",
          "Comment activity feed",
        ]}
      />
    </div>
  );
}
