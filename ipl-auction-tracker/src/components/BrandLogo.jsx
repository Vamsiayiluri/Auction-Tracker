import { Box, Stack, Typography } from "@mui/material";

const BrandLogo = ({ inverse = false, compact = false }) => (
  <Stack direction="row" alignItems="center" spacing={1.5}>
    <Box
      component="img"
      src="/auctionarena-mark.svg"
      alt="AuctionArena logo"
      sx={{ width: compact ? 44 : 52, height: compact ? 44 : 52 }}
    />
    <Box>
      <Typography
        variant={compact ? "h6" : "h5"}
        color={inverse ? "common.white" : "text.primary"}
        lineHeight={1.1}
      >
        AuctionArena
      </Typography>
      {!compact && (
        <Typography
          variant="caption"
          color={inverse ? "rgba(255,255,255,0.72)" : "text.secondary"}
          letterSpacing="0.08em"
        >
          LIVE PLAYER AUCTIONS
        </Typography>
      )}
    </Box>
  </Stack>
);

export default BrandLogo;
