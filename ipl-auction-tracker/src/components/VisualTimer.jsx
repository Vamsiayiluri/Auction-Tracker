import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

const VisualTimer = ({ initialTime = 20 }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const progress = (timeLeft / initialTime) * 100;

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
        size={50}
        thickness={5}
        sx={{ color: "#ff5252" }}
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
        <Typography variant="h6" component="div">
          {timeLeft}
        </Typography>
      </Box>
    </Box>
  );
};

export default VisualTimer;
