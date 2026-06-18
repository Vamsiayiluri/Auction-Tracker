import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

const defaultFormatValue = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const getParticipantName = (round) =>
  round?.participant?.employee?.name ||
  round?.participant?.name ||
  round?.player?.name ||
  "Participant";

const getFinalValue = (round) =>
  round?.result?.finalAmount ??
  round?.result?.finalCredits ??
  round?.finalAmount ??
  round?.finalCredits ??
  round?.purchasePrice ??
  0;

const getTeamName = (round) =>
  round?.result?.teamName ||
  round?.result?.sportTeamName ||
  round?.teamName ||
  round?.winningTeamName ||
  "";

export const isSoldRound = (round) =>
  String(round?.result?.outcome || round?.status || "").toLowerCase() ===
  "sold";

export const isUnsoldRound = (round) =>
  String(round?.result?.outcome || round?.status || "").toLowerCase() ===
  "unsold";

export const buildAuctionActivity = ({
  history = [],
  status,
  label = "Auction",
  formatValue = defaultFormatValue,
}) => {
  const entries = history
    .filter((round) => round?.result || round?.status)
    .map((round, index) => {
      const name = getParticipantName(round);
      if (isSoldRound(round)) {
        return {
          id: `sold-${round.id || index}`,
          text: `${name} sold to ${getTeamName(round) || "Team"} for ${formatValue(
            getFinalValue(round)
          )}`,
          tone: "success",
        };
      }
      if (isUnsoldRound(round)) {
        return {
          id: `unsold-${round.id || index}`,
          text: `${name} remained unsold`,
          tone: "warning",
        };
      }
      return {
        id: `round-${round.id || index}`,
        text: `${name} ${String(round.status || "updated").replaceAll("_", " ")}`,
        tone: "default",
      };
    });

  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus.includes("paused")) {
    entries.unshift({ id: "status-paused", text: `${label} paused`, tone: "info" });
  } else if (normalizedStatus.includes("completed")) {
    entries.unshift({
      id: "status-completed",
      text: `${label} completed`,
      tone: "success",
    });
  } else if (normalizedStatus.includes("live")) {
    entries.unshift({ id: "status-live", text: `${label} resumed`, tone: "info" });
  }

  return entries;
};

export function HubMetric({ label, value, detail }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
          {value}
        </Typography>
        {detail && (
          <Typography variant="caption" color="text.secondary">
            {detail}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function HubMetrics({ children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

export const AVATAR_COLORS = [
  "#1976d2", "#388e3c", "#f57c00", "#7b1fa2",
  "#c62828", "#00838f", "#558b2f", "#ad1457",
];

export function nameInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function avatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function sourceChipProps(source = "") {
  const s = source.toLowerCase();
  if (s.includes("retention") || s.includes("retain"))
    return { label: "Retained", color: "warning" };
  if (s.includes("auction"))
    return { label: "Auction", color: "success" };
  return { label: source || "Auction", color: "default" };
}

const COLLAPSED_LIMIT = 6;

export function HubTeamCard({
  name,
  isViewer,
  remaining,
  spent,
  roster = [],
  labels = [],
  formatValue = defaultFormatValue,
  totalBudget,
}) {
  const [expanded, setExpanded] = useState(false);
  const retentions = roster.filter((m) => {
    const src = (m.acquisitionType || m.rosterSource || m.source || "").toLowerCase();
    return src.includes("retain");
  }).length;
  const auctionBought = roster.length - retentions;
  const spentNum = Number(String(spent).replace(/[^0-9.]/g, "")) || 0;
  const remainNum = Number(String(remaining).replace(/[^0-9.]/g, "")) || 0;
  const total = spentNum + remainNum;
  const spentPct = total > 0 ? Math.round((spentNum / total) * 100) : 0;
  const visible = expanded ? roster : roster.slice(0, COLLAPSED_LIMIT);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: isViewer ? "primary.main" : "divider",
        borderWidth: isViewer ? 2 : 1,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, bgcolor: isViewer ? "primary.50" : "background.paper" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={800}>{name}</Typography>
              {isViewer && <Chip size="small" color="primary" label="My Team" />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {roster.length} players &nbsp;·&nbsp; {retentions} retained &nbsp;·&nbsp; {auctionBought} via auction
            </Typography>
          </Box>
        </Stack>

        {/* Budget bar */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Budget used</Typography>
            <Typography variant="caption" fontWeight={700}>{spentPct}%</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={spentPct}
            sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover" }}
            color={spentPct > 85 ? "error" : spentPct > 60 ? "warning" : "primary"}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Spent</Typography>
              <Typography variant="body2" fontWeight={700}>{spent}</Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary">Remaining</Typography>
              <Typography variant="body2" fontWeight={700} color={remainNum === 0 ? "error.main" : "success.main"}>
                {remaining}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Divider />

      {/* Player list */}
      <Box sx={{ px: 2, py: 1.5 }}>
        {!roster.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No players acquired yet.
          </Typography>
        ) : (
          <>
            <Stack spacing={0}>
              {visible.map((member, idx) => (
                <TeamMemberRow
                  key={member.id || member.participant?.id || idx}
                  member={member}
                  index={idx + 1}
                  formatValue={formatValue}
                />
              ))}
            </Stack>
            {roster.length > COLLAPSED_LIMIT && (
              <Button
                size="small"
                onClick={() => setExpanded((e) => !e)}
                sx={{ mt: 1, textTransform: "none" }}
              >
                {expanded
                  ? "Show less"
                  : `Show ${roster.length - COLLAPSED_LIMIT} more players`}
              </Button>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}

function TeamMemberRow({ member, index, formatValue }) {
  const participant =
    member.participant?.employee?.name ||
    member.participant?.name ||
    member.employee?.name ||
    member.name ||
    "Participant";
  const amount =
    member.finalAmount ??
    member.finalCredits ??
    member.purchasePrice ??
    member.purchaseAmount ??
    member.soldPrice ??
    member.amount;
  const source =
    member.acquisitionType ||
    member.rosterSource ||
    member.source ||
    member.result?.acquisitionType ||
    "";
  const { label: srcLabel, color: srcColor } = sourceChipProps(source);
  const bgColor = avatarColor(participant);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        py: 1,
        px: 0.5,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
        borderRadius: 1,
        transition: "background 0.15s",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Tooltip title={participant} placement="left">
        <Avatar
          sx={{
            width: 34,
            height: 34,
            fontSize: 13,
            fontWeight: 700,
            bgcolor: bgColor,
            flexShrink: 0,
          }}
        >
          {nameInitials(participant)}
        </Avatar>
      </Tooltip>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {participant}
        </Typography>
        <Chip
          size="small"
          label={srcLabel}
          color={srcColor}
          variant="outlined"
          sx={{ height: 18, fontSize: 10, mt: 0.25 }}
        />
      </Box>
      {amount ? (
        <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ flexShrink: 0 }}>
          ₹{formatValue(amount)}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function LastAuctionResultPanel({
  round,
  label = "Auction",
  formatValue = defaultFormatValue,
}) {
  return (
    <Card variant="outlined" sx={{ borderColor: round ? "success.main" : "divider" }}>
      <CardContent>
        <Typography variant="overline" color="primary.main">
          Last Auction Result
        </Typography>
        {round ? (
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={900}>
              {getParticipantName(round)}
            </Typography>
            {isSoldRound(round) ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                  gap: 1,
                }}
              >
                <ResultStat label="Status" value="SOLD" />
                <ResultStat label="Winning Team" value={getTeamName(round) || "Team"} />
                <ResultStat label="Winning Bid" value={formatValue(getFinalValue(round))} />
                <ResultStat label="Total Bids" value={(round.bids || []).length} />
                <ResultStat label="Auction" value={label} />
              </Box>
            ) : (
              <ResultStat label="Status" value="Unsold" />
            )}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            Finalized auction outcomes will appear here.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ResultStat({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={900}>{value}</Typography>
    </Box>
  );
}

export function AuctionActivityFeed({ entries = [], title = "Live Activity" }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {entries.slice(0, 10).map((entry) => (
            <Stack
              key={entry.id}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ py: 0.5 }}
            >
              <Chip size="small" color={entry.tone === "default" ? "default" : entry.tone} label="Event" />
              <Typography>{entry.text}</Typography>
            </Stack>
          ))}
          {!entries.length && (
            <Typography color="text.secondary">Auction activity will appear here.</Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function BidHistorySummary({
  rounds = [],
  selectedRound,
  onSelectRound,
  onClose,
  formatValue = defaultFormatValue,
}) {
  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" fontWeight={800}>
            Participant Bid Summaries
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
            Detailed bids are available inside each participant history.
          </Typography>
          <Stack spacing={1.25}>
            {rounds.map((round, index) => (
              <Box
                key={round.id || index}
                sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Typography fontWeight={900}>{getParticipantName(round)}</Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                      <Chip size="small" label={`Status: ${isSoldRound(round) ? "Sold" : isUnsoldRound(round) ? "Unsold" : "In Progress"}`} />
                      {isSoldRound(round) ? (
                        <>
                          <Chip size="small" variant="outlined" label={`Winning Team: ${getTeamName(round) || "Team"}`} />
                          <Chip size="small" variant="outlined" label={`Winning Bid: ${formatValue(getFinalValue(round))}`} />
                        </>
                      ) : null}
                      <Chip size="small" variant="outlined" label={`Total Bids: ${(round.bids || []).length}`} />
                    </Stack>
                  </Box>
                  <Button variant="outlined" onClick={() => onSelectRound(round)}>
                    View Bid History
                  </Button>
                </Stack>
              </Box>
            ))}
            {!rounds.length && (
              <Typography color="text.secondary">
                No Bid History Available Yet. Bid history will appear once the Auction begins.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
      <Dialog open={Boolean(selectedRound)} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{getParticipantName(selectedRound)} Bid History</DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Bid</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(selectedRound?.bids || []).map((bid, index) => (
                  <TableRow key={bid.id || index}>
                    <TableCell>Bid #{index + 1}</TableCell>
                    <TableCell>{bid.teamName || bid.sportTeamName || "Team"}</TableCell>
                    <TableCell align="right">
                      {formatValue(bid.amount ?? bid.bidAmount ?? bid.credits)}
                    </TableCell>
                  </TableRow>
                ))}
                {!selectedRound?.bids?.length && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No bids were placed for this participant.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography fontWeight={800}>
              Winner: {isSoldRound(selectedRound) ? getTeamName(selectedRound) || "Team" : "No winner"}
            </Typography>
            <Typography fontWeight={800}>
              Final Price: {isSoldRound(selectedRound) ? formatValue(getFinalValue(selectedRound)) : "-"}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function HubProgress({ completed, total }) {
  const percentage = total ? Math.min(100, (completed / total) * 100) : 0;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="body2">Players Auctioned</Typography>
        <Typography variant="body2" fontWeight={800}>
          {completed} / {total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{ height: 8, borderRadius: 999 }}
      />
    </Box>
  );
}
