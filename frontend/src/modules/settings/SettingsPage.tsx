import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  Divider,
  Grid,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Formik } from "formik";
import * as Yup from "yup";
import { api } from "../../api/axios";
import useNotistack from "../orders/hooks/useNotistack";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const validationSchema = Yup.object({
  currentPassword: Yup.string().required("Parola curentă este obligatorie"),
  newPassword: Yup.string()
    .required("Parola nouă este obligatorie")
    .min(8, "Minim 8 caractere")
    .matches(
      passwordRegex,
      "Minim 1 literă mică, 1 literă mare, 1 cifră și 1 caracter special"
    ),
  confirmPassword: Yup.string()
    .required("Confirmarea parolei este obligatorie")
    .oneOf([Yup.ref("newPassword")], "Parolele nu se potrivesc"),
});

const SettingsPage: React.FC = () => {
  const { successNotistack, errorNotistack } = useNotistack();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: "auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Setări
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestionează parola contului tău
          </Typography>
        </Box>
      </Stack>

      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            bgcolor: "primary.50",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Schimbă parola
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Minim 8 caractere, cu literă mică, literă mare, cifră și simbol.
          </Typography>
        </Box>

        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Formik
            initialValues={{ currentPassword: "", newPassword: "", confirmPassword: "" }}
            validationSchema={validationSchema}
            onSubmit={async (values, { resetForm, setSubmitting }) => {
              try {
                await api.post("/auth/change-password", {
                  currentPassword: values.currentPassword,
                  newPassword: values.newPassword,
                });
                successNotistack("Parola a fost schimbată cu succes");
                resetForm();
              } catch (err: any) {
                const msg = err?.response?.data?.error || "Nu am putut schimba parola";
                errorNotistack(msg);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, isValid }) => (
              <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      name="currentPassword"
                      label="Parola curentă"
                      type={showCurrent ? "text" : "password"}
                      value={values.currentPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      fullWidth
                      autoComplete="current-password"
                      sx={{
                        "& input::-ms-reveal": { display: "none" },
                        "& input::-ms-clear": { display: "none" },
                      }}
                      error={touched.currentPassword && Boolean(errors.currentPassword)}
                      helperText={touched.currentPassword && errors.currentPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCurrent((v) => !v)}
                              edge="end"
                              aria-label={showCurrent ? "Ascunde parola" : "Arată parola"}
                            >
                              {showCurrent ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      name="newPassword"
                      label="Parola nouă"
                      type={showNew ? "text" : "password"}
                      value={values.newPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      fullWidth
                      autoComplete="new-password"
                      sx={{
                        "& input::-ms-reveal": { display: "none" },
                        "& input::-ms-clear": { display: "none" },
                      }}
                      error={touched.newPassword && Boolean(errors.newPassword)}
                      helperText={touched.newPassword && errors.newPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNew((v) => !v)}
                              edge="end"
                              aria-label={showNew ? "Ascunde parola" : "Arată parola"}
                            >
                              {showNew ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      name="confirmPassword"
                      label="Confirmă parola nouă"
                      type={showConfirm ? "text" : "password"}
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      fullWidth
                      autoComplete="new-password"
                      sx={{
                        "& input::-ms-reveal": { display: "none" },
                        "& input::-ms-clear": { display: "none" },
                      }}
                      error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                      helperText={touched.confirmPassword && errors.confirmPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirm((v) => !v)}
                              edge="end"
                              aria-label={showConfirm ? "Ascunde parola" : "Arată parola"}
                            >
                              {showConfirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                {!isValid && touched.confirmPassword && values.newPassword && values.confirmPassword && (
                  <Alert severity="warning">Parolele nu se potrivesc</Alert>
                )}

                <Divider />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
                  <Button type="submit" variant="contained" disabled={!isValid || isSubmitting}>
                    {isSubmitting ? "Se salvează..." : "Schimbă parola"}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Formik>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPage;
