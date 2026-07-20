import React, { useState } from "react";
import { Comment } from "../types";
import { CommentEditor, renderMarkdown } from "./CommentEditor";
import { CommentReply } from "./CommentReply";
import { MessageSquare, MoreVertical, Edit2, Trash2 } from "lucide-react";

interface CommentCardProps {
  comment: Comment;
  currentUserId: string;
  userRole: string;
  projectOwnerId: string;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId: string) => Promise<void>;
  onReact: (commentId: string, emoji: string) => Promise<void>;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  currentUserId,
  userRole,
  projectOwnerId,
  onEdit,
  onDelete,
  onReply,
  onReact
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isDeleted = comment.deleted_at !== null;
  const isAuthor = comment.user_id === currentUserId;
  const isAdmin = userRole === "admin";
  const isProjectOwner = projectOwnerId === currentUserId;
  const isTemp = comment.id.startsWith("temp-");
  
  // Can edit/delete if owner, admin, or comment author (unless deleted or temp)
  const canModify = !isDeleted && !isTemp && (isAuthor || isAdmin || isProjectOwner);

  // Core Emojis list
  const CORE_EMOJIS = ["👍", "❤️", "😄", "🎉"];

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Group reactions by emoji
  const reactionsGrouped = comment.reactions.reduce((acc, curr) => {
    acc[curr.emoji] = acc[curr.emoji] || [];
    acc[curr.emoji].push(curr.user_id);
    return acc;
  }, {} as Record<string, string[]>);

  const handleEditSubmit = async (content: string) => {
    await onEdit(comment.id, content);
    setIsEditing(false);
  };

  const handleReplySubmit = async (content: string) => {
    await onReply(content, comment.id);
    setIsReplying(false);
  };

  // Generate a nice profile avatar placeholder from author display name
  const authorInitial = (comment.user_display_name || "U")[0].toUpperCase();
  const getAvatarBgColor = (name: string) => {
    const colors = ["bg-indigo-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-purple-500", "bg-sky-500"];
    const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  return (
    <div className="group relative flex gap-3 text-xs py-3 select-text">
      
      {/* Left side: Avatar */}
      <div className="shrink-0 select-none">
        {comment.user_avatar_url ? (
          <img
            src={comment.user_avatar_url}
            alt={comment.user_display_name}
            className="w-7 h-7 rounded-full object-cover border border-stitch-outline-variant/40"
          />
        ) : (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white ${getAvatarBgColor(comment.user_display_name || "User")}`}>
            {authorInitial}
          </div>
        )}
      </div>

      {/* Right side: Body */}
      <div className="flex-1 min-w-0 space-y-1">
        
        {/* Header (Author, date, etc.) */}
        <div className="flex items-center gap-2 select-none">
          <span className="font-bold text-stitch-on-surface font-sans">
            {comment.user_display_name || "User"}
          </span>
          <span className="text-[10px] text-stitch-on-surface-variant/50">
            {formatDate(comment.created_at)}
          </span>
          {comment.updated_at !== comment.created_at && !isDeleted && (
            <span className="text-[9px] text-stitch-on-surface-variant/40 italic">
              (edited)
            </span>
          )}
        </div>

        {/* Content area */}
        {isEditing ? (
          <div className="pt-1.5 select-none">
            <CommentEditor
              initialValue={comment.content}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
              submitLabel="Save"
              isCompact
            />
          </div>
        ) : (
          <div
            className={`text-stitch-on-surface leading-relaxed max-w-none break-words ${isDeleted ? "text-stitch-on-surface-variant/40 italic" : ""}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
          />
        )}

        {/* Footer actions & Reactions */}
        {!isEditing && !isDeleted && !isTemp && (
          <div className="flex flex-wrap items-center gap-3 pt-1 select-none">
            
            {/* Thread Reactions list */}
            {comment.reactions.length > 0 && (
              <div className="flex items-center gap-1">
                {Object.entries(reactionsGrouped).map(([emoji, userIds]) => {
                  const hasReacted = userIds.includes(currentUserId);
                  return (
                    <button
                      key={emoji}
                      onClick={() => onReact(comment.id, emoji)}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all duration-200 ${
                        hasReacted
                          ? "bg-stitch-primary/10 text-stitch-primary border-stitch-primary/20 hover:bg-stitch-primary/15"
                          : "bg-stitch-surface-container-lowest text-stitch-on-surface-variant border-stitch-outline-variant hover:bg-stitch-surface-container-low"
                      }`}
                      title={hasReacted ? "Remove reaction" : "React"}
                    >
                      <span>{emoji}</span>
                      <span>{userIds.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick React Picker */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {CORE_EMOJIS.map((emoji) => {
                const userIds = reactionsGrouped[emoji] || [];
                const hasReacted = userIds.includes(currentUserId);
                if (hasReacted) return null; // already shown in reactions list
                
                return (
                  <button
                    key={emoji}
                    onClick={() => onReact(comment.id, emoji)}
                    className="p-1 hover:bg-stitch-surface-container rounded-lg text-[11px] transition-colors"
                    title={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            {/* Reply Button */}
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="inline-flex items-center gap-1 py-1 px-1.5 text-[10px] font-black text-stitch-primary hover:underline"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Reply</span>
            </button>
          </div>
        )}

        {/* Action Menu (Edit / Delete Dropdown) */}
        {canModify && !isEditing && (
          <div className="absolute right-0 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none">
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 rounded-lg text-stitch-on-surface-variant/50 hover:text-stitch-on-surface hover:bg-stitch-surface-container transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <div className="absolute right-0 mt-1 w-24 bg-white border border-stitch-outline-variant/60 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-scale-in">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-stitch-surface-container flex items-center gap-1.5 text-stitch-on-surface font-semibold"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this comment?")) {
                          onDelete(comment.id);
                        }
                        setShowActions(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-1.5 text-stitch-error font-semibold"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Inline Reply Form */}
        {isReplying && (
          <CommentReply
            onReplySubmit={handleReplySubmit}
            onCancel={() => setIsReplying(false)}
            parentAuthorNameName={comment.user_display_name}
          />
        )}

        {/* Thread replies list */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3.5 pl-3 border-l border-stitch-outline-variant/40 space-y-3.5">
            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                userRole={userRole}
                projectOwnerId={projectOwnerId}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
                onReact={onReact}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
