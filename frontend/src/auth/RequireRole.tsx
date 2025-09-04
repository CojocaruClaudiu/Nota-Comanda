import React from "react";
import { useAuth } from "./AuthContext";
import { Box, Typography } from "@mui/material";

export const RequireRole: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Nu aveți permisiuni pentru această pagină.</Typography>
      </Box>
    );
  }
  return <>{children}</>;
};
