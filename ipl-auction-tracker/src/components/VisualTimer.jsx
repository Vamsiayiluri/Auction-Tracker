import { Box, CircularProgress, Typography } from "@mui/material";

const VisualTimer = ({ timeLeft, duration = 20 }) => {
  const safeTime = Math.max(0, Number(timeLeft) || 0);
  const safeDuration = Math.max(1, Number(duration) || 20);
  const progress = Math.min(100, (safeTime / safeDuration) * 100);

  return (
    <Box
      position="relative"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
    >
      <CircularProgress
        variant="determinate"
        value={progress}
        size={58}
        thickness={5}
        sx={{
          color:
            safeTime <= 5
              ? "error.main"
              : safeTime <= 10
                ? "secondary.main"
                : "success.main",
        }}
      />
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography variant="body1" fontWeight={700}>
          {safeTime}
        </Typography>
      </Box>
    </Box>
  );
};

export default VisualTimer;
