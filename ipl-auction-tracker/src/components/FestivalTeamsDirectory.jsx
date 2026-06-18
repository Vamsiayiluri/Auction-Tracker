import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import api from "../utils/api";
import { socket } from "../webSocket/socket";
import { shouldApplyAuctionSnapshot } from "../utils/auctionSynchronization";
import { LoadingStateCard } from "./ProductState";
import { avatarColor, nameInitials, sourceChipProps } from "./AuctionHubPrimitives";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const memberName = (membership) =>
  membership.participant?.employee?.name || "Unknown participant";

const memberNumber = (membership) =>
  membership.participant?.employee?.employeeNumber || "";

export default function FestivalTeamsDirectory({
  festivalId,
  ownerTeamOnly = false,
  highlightOwnerTeam = false,
}) {
  const [teams, setTeams] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [ownerTeamId, setOwnerTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRevision = useRef(0);

  const loadTeams = useCallback((showLoading = true) => {
    let active = true;
    if (showLoading === true) setLoading(true);
    setError("");
    Promise.all([
      api.get(`/v2/festivals/${festivalId}/teams`),
      api.get(`/v2/festivals/${festivalId}/auction/current`),
    ])
      .then(([teamsResponse, auctionResponse]) => {
        if (!active) return;
        setTeams(teamsResponse.data.data || []);
        setSummaries(auctionResponse.data.data?.teamSummaries || []);
        setOwnerTeamId(
          auctionResponse.data.data?.viewer?.festivalTeamId || null
        );
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load Festival Teams."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [festivalId]);

  useEffect(() => {
    const applySnapshot = (payload) => {
      if (
        payload?.scopeType !== "festival" ||
        payload.scopeId !== festivalId ||
        !shouldApplyAuctionSnapshot(lastRevision.current, payload)
      ) {
        return;
      }
      lastRevision.current = payload.revision;
      setTeams(payload.state?.teams || []);
      setSummaries(payload.state?.teamSummaries || []);
      setLoading(false);
    };
    const joinRoom = () =>
      socket.emit("join-festival-auction", { festivalId });
    const cancelLoad = loadTeams();
    socket.on("auction-state", applySnapshot);
    socket.on("connect", joinRoom);
    if (socket.connected) joinRoom();
    return () => {
      cancelLoad?.();
      socket.emit("leave-festival-auction", { festivalId });
      socket.off("auction-state", applySnapshot);
      socket.off("connect", joinRoom);
    };
  }, [festivalId, loadTeams]);

  const visibleTeams = ownerTeamOnly
    ? teams.filter(({ id }) => id === ownerTeamId)
    : teams;
  const summaryByTeamId = useMemo(
    () =>
      new Map(
        summaries.map((summary) => [summary.festivalTeamId, summary])
      ),
    [summaries]
  );
  const totals = useMemo(
    () =>
      visibleTeams.reduce(
        (result, team) => {
          const summary = summaryByTeamId.get(team.id);
          result.members += team.members?.length || 0;
          result.spent += Number(summary?.spentBudget || 0);
          return result;
        },
        { members: 0, spent: 0 }
      ),
    [summaryByTeamId, visibleTeams]
  );

  if (loading) {
    return (
      <LoadingStateCard
        title="Loading Teams"
        message="Preparing owners, purchases, retentions, and team members."
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ md: "center" }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {ownerTeamOnly ? "My Team" : "Teams"}
          </Typography>
          <Typography color="text.secondary">
            {ownerTeamOnly
              ? "Review your Owner assignment, purse, retentions, purchases, and current team members."
              : highlightOwnerTeam
                ? "Review both Team summaries. Your assigned Team is highlighted."
                : "Select a Team to review its Owner, purse, retentions, purchases, and team members."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={`${visibleTeams.length} teams`} color="primary" />
          <Chip label={`${totals.members} team members`} variant="outlined" />
          <Chip label={`${formatMoney(totals.spent)} spent`} />
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {!error && !visibleTeams.length && (
        <Alert severity="info">
          {ownerTeamOnly
            ? "No active Festival Team is assigned to this Owner account."
            : "No Festival Teams are available."}
        </Alert>
      )}

      <Stack spacing={2}>
        {visibleTeams.map((team) => {
          const summary = summaryByTeamId.get(team.id);
          const memberships = team.members || [];
          const retentions = memberships.filter(
            ({ rosterSource }) => rosterSource === "retention"
          );
          const purchasedPlayers = memberships.filter(
            ({ rosterSource }) => rosterSource === "auction"
          );

          return (
            <Accordion
              key={team.id}
              disableGutters
              defaultExpanded={highlightOwnerTeam && team.id === ownerTeamId}
              sx={
                highlightOwnerTeam && team.id === ownerTeamId
                  ? { border: 2, borderColor: "primary.main" }
                  : undefined
              }
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                  sx={{ flex: 1 }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        alignItems: "center",
                        bgcolor: "primary.50",
                        borderRadius: 2,
                        color: "primary.main",
                        display: "flex",
                        height: 44,
                        justifyContent: "center",
                        width: 44,
                      }}
                    >
                      <GroupsRoundedIcon />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>
                        {team.name}
                      </Typography>
                      {highlightOwnerTeam && team.id === ownerTeamId && (
                        <Chip
                          size="small"
                          color="primary"
                          label="Your Team"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {memberships.length} team members
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        {summary?.owner?.employee?.name || "No owner"}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        ₹{formatMoney(summary?.remainingBudget)} left
                      </Typography>
                    </Stack>
                    {(() => {
                      const spent = Number(summary?.spentBudget || 0);
                      const remaining = Number(summary?.remainingBudget || 0);
                      const total = spent + remaining;
                      const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
                      return (
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={pct > 85 ? "error" : pct > 60 ? "warning" : "primary"}
                          sx={{ height: 5, borderRadius: 3, bgcolor: "action.hover", width: 160 }}
                        />
                      );
                    })()}
                  </Stack>
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      lg: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  <TeamMetricCard
                    title="Owner"
                    value={summary?.owner?.employee?.name || "Not assigned"}
                    detail={summary?.owner?.employee?.employeeNumber}
                  />
                  <TeamMetricCard
                    title="Remaining Purse"
                    value={formatMoney(summary?.remainingBudget)}
                    detail={`Spent ${formatMoney(summary?.spentBudget)}`}
                  />
                  <TeamMembersCard title={`Retentions (${retentions.length})`}>
                    <MembershipList memberships={retentions} />
                  </TeamMembersCard>
                  <TeamMembersCard
                    title={`Purchased Players (${purchasedPlayers.length})`}
                  >
                    <MembershipList memberships={purchasedPlayers} />
                  </TeamMembersCard>
                </Box>
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Current Team Members ({memberships.length})
                    </Typography>
                    <MembershipList memberships={memberships} showSource />
                  </CardContent>
                </Card>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Stack>
  );
}

function TeamMetricCard({ title, value, detail }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
        {detail && (
          <Typography variant="body2" color="text.secondary">
            {detail}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function TeamMembersCard({ title, children }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function MembershipList({ memberships, showSource = false }) {
  if (!memberships.length) {
    return (
      <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
        No participants in this section.
      </Typography>
    );
  }

  return (
    <Stack spacing={0}>
      {memberships.map((membership) => {
        const name = memberName(membership);
        const empNo = memberNumber(membership);
        const source = showSource ? (membership.rosterSource || "") : "";
        const { label: srcLabel, color: srcColor } = sourceChipProps(source);
        const amount = membership.finalAmount ?? membership.purchaseAmount ?? membership.soldPrice;
        const bg = avatarColor(name);
        return (
          <Stack
            key={membership.id}
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
            <Tooltip title={name} placement="left">
              <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: bg, flexShrink: 0 }}>
                {nameInitials(name)}
              </Avatar>
            </Tooltip>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{name}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                {empNo && <Typography variant="caption" color="text.secondary">#{empNo}</Typography>}
                {showSource && source && (
                  <Chip size="small" label={srcLabel} color={srcColor} variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                )}
              </Stack>
            </Box>
            {amount != null && (
              <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ flexShrink: 0 }}>
                ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(amount))}
              </Typography>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
