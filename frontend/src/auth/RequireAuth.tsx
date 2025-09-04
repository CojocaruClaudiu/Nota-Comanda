import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null; // or a skeleton
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
};
