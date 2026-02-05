import React from "react";
import { Box, Card, CardContent, Stack, Typography, Chip, Button, Divider } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: "auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Profil
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Informații despre contul tău
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Nume</Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                {user.name || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Email</Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                {user.email}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">Roluri</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {user.roles.map((role) => (
                  <Chip key={role} label={role} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            </Box>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
              <Button variant="contained" onClick={() => navigate("/setari")}>
                Schimbă parola
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;
