import { useEffect, useState } from "react";
import { Typography } from "@mui/material";

export default function BidTimer({ duration, onTimeout }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft === 0) {
      onTimeout();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeout]);

  return (
    <Typography variant="h6" color="error">
      Time Left: {timeLeft}s
    </Typography>
  );
}
