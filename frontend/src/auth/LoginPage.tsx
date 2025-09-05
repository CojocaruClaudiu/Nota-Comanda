// auth/LoginPage.tsx
import React, { useState } from "react";
import { Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { useAuth } from "./AuthContext";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState("admin@topaz.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from?.pathname || "/";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      enqueueSnackbar("Bun venit!", { variant: "success" });
      navigate(from, { replace: true });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || "Autentificare eșuată", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100dvh",              // fill viewport
        width: "100vw",
        display: "grid",
        placeItems: "center",          // perfect centering
        overflow: "hidden",            // no scrollbar
        px: 2,
      }}
    >
      <Container maxWidth="sm" disableGutters sx={{ width: "100%", maxWidth: 560 }}>
        <Box
          component="form"
          onSubmit={onSubmit}
          sx={(t) => ({
            width: "100%",
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            border: `1px solid ${t.palette.divider}`,
            bgcolor: t.palette.background.paper,
            boxShadow: { xs: 0, md: 1 },
          })}
        >
          <Stack spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
            <Box component="img" src="/LogoTopaz-1x1.png" alt="Topaz" sx={{ width: 64, opacity: 0.95 }} />
            <Typography variant="h5" fontWeight={800}>
              Autentificare
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <TextField
              label="Parolă"
              fullWidth
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<LockRoundedIcon />}
              disabled={loading}
            >
              {loading ? "Se conectează..." : "Conectare"}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;
