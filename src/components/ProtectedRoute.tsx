import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  /** When true, route requires onboarding to be completed. */
  requireOnboarded?: boolean;
}

const ProtectedRoute = ({ children, requireOnboarded = false }: Props) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboarded(null);
      return;
    }
    supabase
      .from("profiles")
      .select("onboarded")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setOnboarded(data?.onboarded ?? false));
  }, [user]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireOnboarded && onboarded === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
      </div>
    );
  }

  if (requireOnboarded && onboarded === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
