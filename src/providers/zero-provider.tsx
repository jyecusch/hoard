"use client";

import { ZeroProvider } from "@rocicorp/zero/react";
import { schema } from "@/zero/schema";
import { useAuth } from "@/components/auth-provider";
import { ReactNode, useCallback } from "react";

interface ZeroDataProviderProps {
  children: ReactNode;
}

export function ZeroDataProvider({ children }: ZeroDataProviderProps) {
  const { user } = useAuth();

  // Function to fetch JWT token from our API
  const getAuthToken = useCallback(async (): Promise<string | undefined> => {
    if (!user?.id) {
      return undefined;
    }

    try {
      const response = await fetch("/api/auth/zero-token", {
        credentials: "include", // Include cookies for Better Auth session
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "Failed to get Zero auth token:",
          response.status,
          response.statusText
        );
        // Try to log the response body for more details
        try {
          const errorText = await response.text();
          console.error("Auth token error response:", errorText);
        } catch {
          console.error("Could not read error response");
        }
        return undefined;
      }

      const { token } = await response.json();
      return token;
    } catch (error) {
      console.error("Error fetching Zero auth token:", error);
      return undefined;
    }
  }, [user?.id]);

  // Zero configuration
  const server = process.env.NEXT_PUBLIC_ZERO_SERVER || "http://localhost:4848";
  const userID = user?.id || "anonymous";

  return (
    <ZeroProvider
      userID={userID}
      auth={getAuthToken} // Pass function for dynamic token fetching
      schema={schema}
      server={server}
      // Optional: Configure sync options
      kvStore="idb" // Use IndexedDB for persistence
      // Add connection debugging
      onError={(error) => {
        console.error("Zero connection error:", error);
      }}
    >
      {children}
    </ZeroProvider>
  );
}
