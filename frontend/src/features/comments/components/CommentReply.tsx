import React from "react";
import { CommentEditor } from "./CommentEditor";

interface CommentReplyProps {
  onReplySubmit: (content: string) => Promise<void>;
  onCancel: () => void;
  parentAuthorNameName?: string;
}

export const CommentReply: React.FC<CommentReplyProps> = ({
  onReplySubmit,
  onCancel,
  parentAuthorNameName = "user"
}) => {
  return (
    <div className="mt-3.5 pl-4 border-l-2 border-stitch-outline-variant/60 animate-fade-in select-none">
      <div className="mb-2 text-[10px] font-bold text-stitch-on-surface-variant/70">
        Replying to <span className="text-stitch-primary">@{parentAuthorNameName}</span>
      </div>
      <CommentEditor
        onSubmit={onReplySubmit}
        onCancel={onCancel}
        submitLabel="Reply"
        placeholder="Type your reply here… (Markdown supported)"
        isCompact
      />
    </div>
  );
};
