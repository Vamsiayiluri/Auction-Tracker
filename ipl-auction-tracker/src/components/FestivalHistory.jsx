import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import api from "../utils/api";

const FESTIVAL_HISTORY_SECTIONS = [
  "Auction Results",
  "Re-Auction History",
  "Owner Activity",
  "Retentions",
  "Audit Log",
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

export default function FestivalHistory({
  festivalId,
  initialSection = "Auction Results",
  sections = FESTIVAL_HISTORY_SECTIONS,
}) {
  const availableSections = sections.filter((section) =>
    FESTIVAL_HISTORY_SECTIONS.includes(section)
  );
  const [activeSection, setActiveSection] = useState(
    availableSections.includes(initialSection)
      ? initialSection
      : availableSections[0]
  );
  const [auctions, setAuctions] = useState([]);
  const [audits, setAudits] = useState([]);
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get(`/v2/festivals/${festivalId}/auction/history`)
      .then((response) => {
        if (!active) return;
        setAuctions(response.data.data || []);
        setAudits(response.data.audits || []);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load Festival history."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [festivalId]);

  const filteredAuctions = useMemo(() => {
    const value = search.trim().toLowerCase();
    return auctions.filter((auction) => {
      const result = auction.result?.outcome || auction.status;
      const matchesOutcome = !outcome || result === outcome;
      const matchesSearch =
        !value ||
        [
          auction.participant?.employee?.employeeNumber,
          auction.participant?.employee?.name,
          auction.result?.teamName,
        ].some((field) => String(field || "").toLowerCase().includes(value));
      return matchesOutcome && matchesSearch;
    });
  }, [auctions, outcome, search]);

  const auditRows = useMemo(() => {
    if (activeSection === "Re-Auction History") {
      return audits.filter(({ action }) => action.includes("reauction"));
    }
    if (activeSection === "Owner Activity") {
      return audits.filter(({ action }) => action.includes("owner"));
    }
    if (activeSection === "Retentions") {
      return audits.filter(({ action }) => action.includes("retention"));
    }
    return audits;
  }, [activeSection, audits]);

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {availableSections.length > 1 && (
        <Card variant="outlined">
          <Tabs
            value={activeSection}
            onChange={(event, value) => setActiveSection(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Festival history sections"
          >
            {availableSections.map((section) => (
              <Tab key={section} value={section} label={section} />
            ))}
          </Tabs>
        </Card>
      )}

      {activeSection === "Auction Results" && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            fullWidth
            size="small"
            label="Search participant or team"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Outcome</InputLabel>
            <Select
              label="Outcome"
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
            >
              <MenuItem value="">All Outcomes</MenuItem>
              <MenuItem value="sold">Sold</MenuItem>
              <MenuItem value="unsold">Unsold</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )}

      {activeSection === "Auction Results" && (
        <HistoryTable
          title="Auction Results"
          columns={[
            "Participant",
            "Attempt",
            "Outcome",
            "Team",
            "Amount",
            "Finalized",
          ]}
        >
          {filteredAuctions.map((auction) => (
            <TableRow key={auction.id}>
              <TableCell>{auction.participant?.employee?.name}</TableCell>
              <TableCell>{auction.attemptNumber || 1}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={auction.result?.outcome || auction.status}
                />
              </TableCell>
              <TableCell>{auction.result?.teamName || "-"}</TableCell>
              <TableCell>
                {auction.result?.finalAmount
                  ? formatMoney(auction.result.finalAmount)
                  : "-"}
              </TableCell>
              <TableCell>
                {auction.result?.finalizedAt
                  ? new Date(auction.result.finalizedAt).toLocaleString()
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </HistoryTable>
      )}

      {["Re-Auction History", "Owner Activity", "Retentions", "Audit Log"].includes(
        activeSection
      ) && <AuditSection title={activeSection} rows={auditRows} />}
    </Stack>
  );
}

function HistoryTable({ title, columns, children }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column}>{column}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>{children}</TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function AuditSection({ title, rows }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
        {rows.length ? (
          rows.map((row) => (
            <Box
              key={row.id}
              sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography>{row.action.replaceAll("_", " ")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(row.createdAt).toLocaleString()}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography color="text.secondary">No activity recorded.</Typography>
        )}
      </CardContent>
    </Card>
  );
}
