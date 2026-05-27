import { alpha, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB", dark: "#1D4ED8", light: "#DBEAFE" },
    secondary: { main: "#F59E0B", dark: "#D97706" },
    success: { main: "#16A34A" },
    error: { main: "#DC2626" },
    background: { default: "#F5F7FB", paper: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#64748B" },
    divider: "#E2E8F0",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h3: { fontWeight: 700, letterSpacing: "-0.045em" },
    h4: { fontWeight: 700, letterSpacing: "-0.04em" },
    h5: { fontWeight: 700, letterSpacing: "-0.025em" },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 48, paddingInline: 20 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#94A3B8",
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 4px ${alpha("#2563EB", 0.1)}`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 20 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
  },
});

export default theme;
