import { useCallback, useEffect, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../utils/api";

const emptyEmployee = {
  employeeNumber: "",
  name: "",
  email: "",
  department: "",
  employmentStatus: "active",
  identityStatus: "verified",
};

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(emptyEmployee);
  const [linkUserId, setLinkUserId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadEmployees = useCallback(async (searchValue) => {
    setError("");
    try {
      const response = await api.get("/v2/employees", {
        params: { page: 1, pageSize: 100, search: searchValue || undefined },
      });
      setEmployees(response.data.data || []);
    } catch {
      setError("Unable to load employees.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadEmployees(search);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loadEmployees, search]);

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(emptyEmployee);
    setLinkUserId("");
    setDialogOpen(true);
  };

  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setForm({
      employeeNumber: employee.employeeNumber || "",
      name: employee.name || "",
      email: employee.email || "",
      department: employee.department || "",
      employmentStatus: employee.employmentStatus,
      identityStatus: employee.identityStatus,
    });
    setLinkUserId(employee.userId || "");
    setDialogOpen(true);
  };

  const saveEmployee = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        email: form.email || null,
        department: form.department || null,
      };
      let employeeId = editingEmployee?.id;
      if (editingEmployee) {
        await api.patch(`/v2/employees/${editingEmployee.id}`, payload);
      } else {
        const response = await api.post("/v2/employees", payload);
        employeeId = response.data.data.id;
      }
      if (linkUserId && linkUserId !== editingEmployee?.userId) {
        await api.post(`/v2/employees/${employeeId}/link-user`, {
          userId: linkUserId,
        });
      }
      setDialogOpen(false);
      setNotice(editingEmployee ? "Employee updated." : "Employee created.");
      await loadEmployees(search);
    } catch (requestError) {
      setError(
        requestError.response?.data?.errors?.[0]?.message ||
          requestError.response?.data?.message ||
          "Unable to save employee."
      );
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    setError("");
    try {
      const response = await api.get("/v2/employees/import/template", {
        responseType: "blob",
      });
      const contentType =
        response.headers["content-type"] || "text/csv;charset=utf-8";
      const contentDisposition = response.headers["content-disposition"] || "";
      const filename =
        contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] ||
        "employee-import-template.csv";
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: contentType });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      setNotice("Employee import template downloaded.");
    } catch (requestError) {
      let message = "Unable to download the employee template.";
      const responseData = requestError.response?.data;

      if (responseData instanceof Blob) {
        try {
          const errorBody = JSON.parse(await responseData.text());
          message = errorBody.message || message;
        } catch {
          // Keep the fallback message when the error body is not JSON.
        }
      } else if (responseData?.message) {
        message = responseData.message;
      }

      setError(message);
    }
  };

  const uploadImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append("csv", importFile);
    setBusy(true);
    setImportProgress(0);
    setImportResult(null);
    try {
      const response = await api.post("/v2/employees/import", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setImportProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      setImportResult(response.data);
      setImportProgress(100);
      await loadEmployees(search);
    } catch (requestError) {
      setImportResult({
        created: 0,
        updated: 0,
        failed: 1,
        errors:
          requestError.response?.data?.errors || [
            { row: null, message: "Unable to import employees." },
          ],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5">Employee Directory</Typography>
          <Typography color="text.secondary">
            Manage canonical employee identities independently from login accounts.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={downloadTemplate}
          >
            Download Template
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadRoundedIcon />}
            onClick={() => {
              setImportOpen(true);
              setImportFile(null);
              setImportResult(null);
              setImportProgress(0);
            }}
          >
            Import Employees
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreate}
          >
            Add Employee
          </Button>
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <TextField
            fullWidth
            sx={{ mb: 2 }}
            label="Search employee number, name, email, or department"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Identity</TableCell>
                  <TableCell>Login</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.employeeNumber || "Needs review"}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.email || "-"}</TableCell>
                    <TableCell>{employee.department || "-"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={employee.identityStatus} />
                    </TableCell>
                    <TableCell>{employee.hasLogin ? "Linked" : "Not linked"}</TableCell>
                    <TableCell align="right">
                      <Button onClick={() => openEdit(employee)}>Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => !busy && setDialogOpen(false)} fullWidth>
        <DialogTitle>{editingEmployee ? "Manage Employee" : "Add Employee"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Employee number"
              value={form.employeeNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  employeeNumber: event.target.value,
                }))
              }
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <TextField
              label="Department"
              value={form.department}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  department: event.target.value,
                }))
              }
            />
            {editingEmployee && (
              <>
                <TextField
                  select
                  label="Employment status"
                  value={form.employmentStatus}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      employmentStatus: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Identity status"
                  value={form.identityStatus}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      identityStatus: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="provisional">Provisional</MenuItem>
                  <MenuItem value="needs_review">Needs review</MenuItem>
                </TextField>
              </>
            )}
            <TextField
              label="Optional existing User ID for login"
              value={linkUserId}
              disabled={Boolean(editingEmployee?.userId)}
              helperText="Login linkage is optional and does not define employee identity."
              onChange={(event) => setLinkUserId(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={busy} onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !form.employeeNumber.trim() || !form.name.trim()}
            onClick={saveEmployee}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => !busy && setImportOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Import Employees</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Upload EmployeeNumber, Name, Email, and Department. Existing
              employees are updated by EmployeeNumber; login accounts are not
              required.
            </Alert>
            <Button component="label" variant="outlined">
              {importFile ? importFile.name : "Select Employee CSV"}
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] || null);
                  setImportResult(null);
                }}
              />
            </Button>
            {busy && (
              <LinearProgress variant="determinate" value={importProgress} />
            )}
            {importResult && (
              <Alert severity={importResult.failed ? "warning" : "success"}>
                Created {importResult.created}. Updated {importResult.updated}.
                Failed {importResult.failed}.
              </Alert>
            )}
            {importResult?.errors?.length > 0 && (
              <List dense>
                {importResult.errors.map((item, index) => (
                  <ListItem key={`${item.row}-${index}`} disableGutters>
                    <ListItemText
                      primary={`Row ${item.row ?? "-"}: ${item.message}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={busy}
            onClick={() => setImportOpen(false)}
          >
            Close
          </Button>
          <Button
            variant="contained"
            disabled={busy || !importFile}
            onClick={uploadImport}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
