import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  requireOnboarded?: boolean;
}

const ProtectedRoute = ({ children, requireOnboarded = false }: Props) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const fetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboarded(null);
      fetchedForUser.current = null;
      return;
    }

    // Don't re-fetch if we already fetched for this user
    // and already know they're onboarded — prevents loop
    if (fetchedForUser.current === user.id && onboarded === true) return;

    fetchedForUser.current = user.id;

    supabase
      .from("profiles")
      .select("onboarded")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setOnboarded(data?.onboarded ?? false);
      });
  }, [user]);

  // Still loading auth
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Waiting for onboarded check
  if (requireOnboarded && onboarded === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
      </div>
    );
  }

  // Not onboarded — but only redirect if we're NOT already on onboarding
  if (requireOnboarded && onboarded === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;