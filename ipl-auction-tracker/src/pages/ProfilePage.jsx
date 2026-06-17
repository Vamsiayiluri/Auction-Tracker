import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

const roleLabels = {
  admin: "Administrator",
  team_owner: "Team Owner",
  spectator: "Spectator",
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString();
};

const displayValue = (value, fallback = "Not available") => value || fallback;

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || "Auction user";
  const role = roleLabels[user?.role] || user?.role || "User";

  return (
    <Stack spacing={3}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          background:
            "linear-gradient(135deg, rgba(25, 118, 210, 0.10), rgba(25, 118, 210, 0.02))",
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Avatar sx={{ width: 72, height: 72, bgcolor: "primary.main" }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" fontWeight={900}>
                {displayName}
              </Typography>
              <Typography color="text.secondary">{role}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  label={user?.isVerified ? "Verified Account" : "Email Not Verified"}
                  color={user?.isVerified ? "success" : "warning"}
                />
                {user?.mustChangePassword && (
                  <Chip size="small" label="Password Update Required" color="warning" />
                )}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        <ProfileSection title="Profile Information">
          <ProfileRow label="Name" value={displayName} />
          <ProfileRow label="Employee ID" value={displayValue(user?.employeeId || user?.employeeNumber)} />
          <ProfileRow label="Email" value={displayValue(user?.email)} />
        </ProfileSection>

        <ProfileSection title="Role Information">
          <ProfileRow label="Role" value={role} />
          <ProfileRow
            label="Assigned Teams"
            value={displayValue(user?.assignedTeams, "Available from your dashboard")}
          />
          <ProfileRow
            label="Captain Assignments"
            value={displayValue(user?.captainAssignments, "Available from your dashboard")}
          />
        </ProfileSection>

        <ProfileSection title="Account Information">
          <ProfileRow label="Joined Date" value={formatDate(user?.createdAt)} />
          <ProfileRow label="Last Activity" value={formatDate(user?.lastActivityAt || user?.updatedAt)} />
          <ProfileRow label="Account ID" value={displayValue(user?.id)} />
        </ProfileSection>

        <ProfileSection title="Activity Summary">
          <Alert severity="info" sx={{ mb: 1 }}>
            Live assignment data — active auctions, team memberships, and recent
            outcomes — is loaded fresh from your Dashboard, not cached here.
          </Alert>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </ProfileSection>
      </Box>
    </Stack>
  );
}

function ProfileSection({ title, children }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Stack spacing={1.5}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

function ProfileRow({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={700}>{value}</Typography>
    </Box>
  );
}
