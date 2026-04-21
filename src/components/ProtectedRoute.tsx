import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isSessionOnboarded } from "@/lib/onboardingSession";

interface Props {
  children: ReactNode;
  requireOnboarded?: boolean;
}

const ProtectedRoute = ({ children, requireOnboarded = false }: Props) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboarded, setOnboarded] = useState<boolean | null>(() => {
    if (user && requireOnboarded && isSessionOnboarded(user.id)) return true;
    return null;
  });

  useEffect(() => {
    if (!user) {
      setOnboarded(null);
      return;
    }

    if (!requireOnboarded) {
      setOnboarded(null);
      return;
    }

    if (isSessionOnboarded(user.id)) {
      setOnboarded(true);
      return;
    }

    let cancelled = false;
    supabase
      .from("profiles")
      .select("onboarded")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const db = data?.onboarded ?? false;
        if (isSessionOnboarded(user.id)) {
          setOnboarded(true);
          return;
        }
        setOnboarded(db);
      });
    return () => {
      cancelled = true;
    };
  }, [user, requireOnboarded]);

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

  if (requireOnboarded && onboarded === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
