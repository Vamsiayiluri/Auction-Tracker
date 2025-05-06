import { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Typography,
  Container,
} from "@mui/material";
import axios from "axios";

export default function UserManagement() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Fetch users (replace with actual API call when backend is ready)
    setUsers([
      { id: 1, username: "owner1", role: "team_owner", approved: false },
      { id: 2, username: "bidder1", role: "bidder", approved: true },
    ]);
  }, []);

  const approveUser = async (id) => {
    alert(`Approving user ID: ${id}`);
    // Simulate API call to approve user
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === id ? { ...user, approved: true } : user
      )
    );
  };

  return (
    <Container>
      <Typography variant="h6">User Management</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.approved ? "Approved" : "Pending"}</TableCell>
              <TableCell>
                {!user.approved && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => approveUser(user.id)}
                  >
                    Approve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}
