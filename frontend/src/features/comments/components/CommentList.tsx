import React from "react";
import { useComments } from "../hooks/useComments";
import { CommentCard } from "./CommentCard";
import { CommentEditor } from "./CommentEditor";
import { useAuthStore } from "../../../store/authStore";
import { MessageSquare, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface CommentListProps {
  taskId: string;
  projectOwnerId: string;
}

export const CommentList: React.FC<CommentListProps> = ({
  taskId,
  projectOwnerId
}) => {
  const {
    comments,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    createComment,
    editComment,
    deleteComment,
    toggleReaction
  } = useComments(taskId);

  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  
  const currentUserId = session?.user?.id || "";
  const userRole = profile?.role || "developer";

  const handlePostTopComment = async (content: string) => {
    await createComment(content, null);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top comment editor */}
      <div className="bg-stitch-surface-container/10 p-3.5 border border-stitch-outline-variant/60 rounded-2xl select-none">
        <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-stitch-on-surface-variant/80">
          Join the discussion
        </div>
        <CommentEditor
          onSubmit={handlePostTopComment}
          placeholder="Share your thoughts or ask a question… (Markdown supported)"
          submitLabel="Comment"
        />
      </div>

      {/* Global comment errors */}
      {error && (
        <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 select-none">
          <AlertCircle className="w-3.5 h-3.5 text-stitch-error shrink-0" />
          <p className="text-[10px] font-semibold text-stitch-error">{error}</p>
        </div>
      )}

      {/* Comments scrolling view */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 select-text">
        {loading && comments.length === 0 ? (
          <div className="space-y-4 select-none">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-7 h-7 bg-stitch-surface-container rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/4 bg-stitch-surface-container rounded" />
                  <div className="h-4 w-3/4 bg-stitch-surface-container rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 select-none">
            <MessageSquare className="w-6 h-6 text-stitch-on-surface-variant/20 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-stitch-on-surface">No discussion yet</h4>
            <p className="text-[10px] text-stitch-on-surface-variant/70 max-w-xs mx-auto mt-0.5 leading-relaxed">
              Be the first to post a question or comment on this task.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stitch-outline-variant/30 space-y-1">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                userRole={userRole}
                projectOwnerId={projectOwnerId}
                onEdit={editComment}
                onDelete={deleteComment}
                onReply={createComment}
                onReact={toggleReaction}
              />
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="pt-2 text-center select-none">
            <Button
              onClick={loadMore}
              variant="secondary"
              size="sm"
              disabled={loadingMore}
              className="rounded-xl text-[10px] font-black tracking-wide uppercase px-3 py-1.5"
            >
              {loadingMore ? (
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Loading More…</span>
                </div>
              ) : (
                "Load More Discussion"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
