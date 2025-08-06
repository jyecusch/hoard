"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refetchSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkSession = async () => {
    try {
      const response = await authClient.getSession();
      
      // Better Auth returns { data: { session, user }, error }
      if (response.data?.user) {
        setUser({
          id: response.data.user.id,
          email: response.data.user.email || "",
          name: response.data.user.name || "",
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to check session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const refetchSession = async () => {
    setLoading(true);
    await checkSession();
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      setUser(null);
      router.push("/auth/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);