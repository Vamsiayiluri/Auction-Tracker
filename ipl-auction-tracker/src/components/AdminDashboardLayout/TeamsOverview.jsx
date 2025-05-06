import React, { useState, useEffect } from "react";
import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import api from "../../utils/api";

const TeamsOverview = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get(`/teams/getAllteamsAndPlayers`);
        console.log(res.data);
        setTeams(res.data.teams);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Teams & Players
      </Typography>

      {teams.length === 0 ? (
        <Typography>No teams available.</Typography>
      ) : (
        teams?.map((team) => (
          <Accordion key={team.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flex: 1 }}>
                {team.name} - ₹{team.totalAmount} Budget
              </Typography>
              <Typography color="text.secondary">
                Spent: ₹{team.amountSpent}
              </Typography>
            </AccordionSummary>

            <AccordionDetails>
              <Paper variant="outlined" sx={{ p: 1 }}>
                {team.players && team.players.length > 0 ? (
                  <List dense>
                    {team.players.map((player) => (
                      <ListItem key={player.id}>
                        <ListItemText
                          primary={player.name}
                          secondary={`Role: ${player.role} | Price: ₹${player.soldPrice}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography>No players bought yet.</Typography>
                )}
              </Paper>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
};

export default TeamsOverview;
