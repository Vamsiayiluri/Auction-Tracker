import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

export const DashboardSection = ({
  title,
  description,
  children,
  action,
}) => (
  <Stack spacing={2}>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ sm: "flex-end" }}
      spacing={1.5}
    >
      <Box>
        <Typography variant="h5">{title}</Typography>
        {description && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
    {children}
  </Stack>
);

export const DashboardGrid = ({ children, columns = 3 }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        md: "repeat(2, minmax(0, 1fr))",
        xl: `repeat(${columns}, minmax(0, 1fr))`,
      },
      gap: 2,
    }}
  >
    {children}
  </Box>
);

export const EmptyDashboardState = ({ children }) => (
  <Alert severity="info">{children}</Alert>
);

export const ActionCard = ({
  eyebrow,
  title,
  description,
  status,
  statusColor = "default",
  actionLabel,
  onAction,
  secondary,
  severity = "default",
}) => {
  const borderColor =
    severity === "urgent"
      ? "error.main"
      : severity === "warning"
        ? "warning.main"
        : severity === "live"
          ? "success.main"
          : "divider";

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderColor,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent sx={{ display: "flex", flex: 1, flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            {eyebrow && (
              <Typography variant="overline" color="primary.main">
                {eyebrow}
              </Typography>
            )}
            <Typography variant="h6">{title}</Typography>
          </Box>
          {status && (
            <Chip
              size="small"
              color={statusColor}
              label={status}
              sx={{ flexShrink: 0 }}
            />
          )}
        </Stack>
        {description && (
          <Typography color="text.secondary" sx={{ mt: 1.25 }}>
            {description}
          </Typography>
        )}
        {secondary && (
          <Typography variant="body2" sx={{ mt: 1.25 }}>
            {secondary}
          </Typography>
        )}
        {actionLabel && onAction && (
          <Button
            variant={severity === "live" || severity === "urgent" ? "contained" : "outlined"}
            color={severity === "urgent" ? "error" : "primary"}
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={onAction}
            sx={{ alignSelf: "flex-start", mt: "auto" }}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const DashboardHero = ({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <Card
    variant="outlined"
    sx={{
      background:
        "linear-gradient(135deg, rgba(25,118,210,0.10), rgba(46,125,50,0.06))",
    }}
  >
    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        spacing={3}
      >
        <Box sx={{ maxWidth: 760 }}>
          <Typography variant="overline" color="primary.main">
            {eyebrow}
          </Typography>
          <Typography variant="h4">{title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        </Box>
        {actionLabel && (
          <Button variant="contained" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Stack>
    </CardContent>
  </Card>
);
