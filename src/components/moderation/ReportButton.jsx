import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportDialog from "./ReportDialog";

export default function ReportButton({
  targetId,
  targetRole = "creator",
  targetName = "",
  contextType = null,
  contextId = null,
  variant = "outline",
  size = "sm",
  className = "",
  label = "Segnala",
}) {
  const [open, setOpen] = useState(false);
  if (!targetId) return null;
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={`border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/50 ${className}`}
      >
        <Flag className="w-4 h-4 mr-1.5" />
        {label}
      </Button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        targetId={targetId}
        targetRole={targetRole}
        targetName={targetName}
        contextType={contextType}
        contextId={contextId}
      />
    </>
  );
}
