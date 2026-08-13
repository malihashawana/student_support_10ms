import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, FileAudio, FileText, FileVideo, ImageIcon, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAttachmentUrl } from "@/lib/attachments.functions";
import { formatBytes, formatDateShort } from "@/lib/support-constants";

export type AttachmentRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  external_url: string | null;
  storage_path: string | null;
  created_at: string;
};

function iconFor(type: string | null) {
  if (!type) return <FileText className="size-4" />;
  if (type === "link") return <Link2 className="size-4" />;
  if (type.startsWith("image/")) return <ImageIcon className="size-4" />;
  if (type.startsWith("audio/")) return <FileAudio className="size-4" />;
  if (type.startsWith("video/")) return <FileVideo className="size-4" />;
  return <FileText className="size-4" />;
}

export function AttachmentList({ attachments }: { attachments: AttachmentRow[] }) {
  const resolve = useServerFn(getAttachmentUrl);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function load(id: string) {
    setLoading(id);
    try {
      const { url } = await resolve({ data: { id } });
      setUrls((prev) => ({ ...prev, [id]: url }));
      return url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "This attachment could not be opened.");
      return null;
    } finally {
      setLoading(null);
    }
  }

  if (!attachments.length) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">No attachments on this ticket.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {attachments.map((attachment) => {
        const type = attachment.file_type ?? "";
        const url = urls[attachment.id];
        const isImage = type.startsWith("image/");
        const isAudio = type.startsWith("audio/");
        const isVideo = type.startsWith("video/");
        const isLink = type === "link" || (!!attachment.external_url && !attachment.storage_path);
        return (
          <li key={attachment.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground">{iconFor(attachment.file_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isLink ? "External link" : (attachment.file_type ?? "file")} ·{" "}
                  {isLink ? "—" : formatBytes(attachment.file_size)} ·{" "}
                  {formatDateShort(attachment.created_at)}
                </p>
              </div>
              {isLink ? (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={attachment.external_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <ExternalLink className="size-4" />
                    Open link
                  </a>
                </Button>
              ) : url ? (
                <Button size="sm" variant="outline" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    Open
                  </a>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading === attachment.id}
                  onClick={() => load(attachment.id)}
                >
                  {isImage || isAudio || isVideo ? "Preview" : "Download"}
                </Button>
              )}
            </div>
            {url && isImage ? (
              <img
                src={url}
                alt={attachment.file_name}
                className="mt-3 max-h-80 w-auto rounded-lg border border-border"
                loading="lazy"
              />
            ) : null}
            {url && isAudio ? <audio className="mt-3 w-full" controls src={url} /> : null}
            {url && isVideo ? (
              <video className="mt-3 max-h-80 w-full rounded-lg" controls src={url} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
