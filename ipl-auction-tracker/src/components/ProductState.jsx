import { Box, Button, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";

export function ProductStateCard({
  eyebrow,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tertiaryActionLabel,
  onTertiaryAction,
  minHeight = 280,
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          sx={{
            minHeight,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            px: { xs: 1, sm: 3 },
          }}
        >
          <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 560 }}>
            {eyebrow && (
              <Typography variant="overline" color="primary.main">
                {eyebrow}
              </Typography>
            )}
            <Typography variant="h5" fontWeight={900}>
              {title}
            </Typography>
            {message && (
              <Typography color="text.secondary">{message}</Typography>
            )}
            {(actionLabel || secondaryActionLabel || tertiaryActionLabel) && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ pt: 1, width: { xs: "100%", sm: "auto" } }}
              >
                {actionLabel && (
                  <Button variant="contained" onClick={onAction}>
                    {actionLabel}
                  </Button>
                )}
                {secondaryActionLabel && (
                  <Button variant="outlined" onClick={onSecondaryAction}>
                    {secondaryActionLabel}
                  </Button>
                )}
                {tertiaryActionLabel && (
                  <Button color="inherit" onClick={onTertiaryAction}>
                    {tertiaryActionLabel}
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export function LoadingStateCard({
  title = "Loading",
  message = "Preparing the latest information...",
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5} sx={{ py: 4 }}>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          <Typography color="text.secondary">{message}</Typography>
          <Skeleton variant="rounded" height={54} />
          <Skeleton variant="rounded" height={54} width="86%" />
          <Skeleton variant="rounded" height={54} width="72%" />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AccessDeniedState({ onAction, actionLabel = "Return to Dashboard" }) {
  return (
    <ProductStateCard
      eyebrow="Access"
      title="You do not have access to this section."
      message="Open a section connected to your current Festival, Team, or account role."
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
