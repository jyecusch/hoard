"use client";

import { CodeManageModal } from "@/components/code-manage-modal";

interface CodeDisplayProps {
  code?: string | null;
  containerId: string;
  containerName: string;
  onCodeUpdate?: (code: string) => void;
  editable?: boolean;
}

export function CodeDisplay({ 
  code, 
  containerId,
  containerName,
  onCodeUpdate, 
  editable = false 
}: CodeDisplayProps) {
  const handleCodeRemove = () => {
    onCodeUpdate?.("");
  };

  return (
    <CodeManageModal
      code={code}
      containerId={containerId}
      containerName={containerName}
      onCodeUpdate={onCodeUpdate}
      onCodeRemove={handleCodeRemove}
      editable={editable}
    />
  );
}