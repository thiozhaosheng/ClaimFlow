import { FileSearch, FileText, Inbox } from "lucide-react";

const VARIANTS = {
  documents: FileText,
  queue: Inbox,
  audit: FileSearch,
};

export default function EmptyState({
  variant = "documents",
  title,
  message,
}) {
  const Icon = VARIANTS[variant] || FileText;
  return (
    <div className="empty-state">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-subtle text-text-tertiary mb-3">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-text">{message}</p>
    </div>
  );
}
