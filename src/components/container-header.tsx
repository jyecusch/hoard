"use client";

import { Camera } from "lucide-react";
import { EditableName } from "@/components/editable-name";
import { Tags } from "@/components/tags";
import { CodeDisplay } from "@/components/code-display";
import { useAuth } from "@/components/auth-provider";

interface ContainerHeaderProps {
  containerId: string;
  container: {
    id: string;
    name: string;
    code?: string | null;
    tags?: string[];
  };
  primaryImage?: {
    filepath: string;
  } | null;
  onTagsUpdate?: (tags: string[]) => void;
  onCodeUpdate?: (code: string) => void;
}

export function ContainerHeader({
  containerId,
  container,
  primaryImage,
  onTagsUpdate,
  onCodeUpdate,
}: ContainerHeaderProps) {
  const { user } = useAuth();

  return (
    <div className="mb-2 flex gap-8">
      <div className="flex-shrink-0">
        <div className="relative h-32 w-32 rounded-lg overflow-hidden bg-muted">
          {user && primaryImage ? (
            <img
              src={`/api/images/${primaryImage.filepath}`}
              alt={`${container.name} primary photo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="mb-4">
          <EditableName 
            containerId={containerId} 
            initialName={container.name}
          />
        </div>
        <div className="space-y-2">
          <CodeDisplay
            code={container.code}
            containerId={containerId}
            containerName={container.name}
            onCodeUpdate={onCodeUpdate}
            editable
          />
          <Tags 
            tags={container.tags || []} 
            editable 
            onUpdate={onTagsUpdate} 
          />
        </div>
      </div>
    </div>
  );
}