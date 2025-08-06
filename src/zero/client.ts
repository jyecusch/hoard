import { Zero } from "@rocicorp/zero";
import { schema } from "./schema";

// Note: Zero will be initialized in the provider with the actual user ID
export const createZeroClient = (userID: string | null) => {
  return new Zero({
    server: process.env.NEXT_PUBLIC_ZERO_SERVER || "http://localhost:4848",
    schema,
    userID: userID || "anonymous",
  });
};

// Default instance for server-side or initial load
export const zero = createZeroClient(null);
