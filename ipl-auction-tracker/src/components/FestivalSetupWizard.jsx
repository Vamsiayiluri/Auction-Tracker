import { useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MobileStepper,
  Stack,
  Step,
  StepButton,
  Stepper,
  Typography,
} from "@mui/material";
import {
  FESTIVAL_SETUP_STEPS,
  getSetupCompletion,
} from "../utils/festivalWorkspace";

export default function FestivalSetupWizard({
  festivalId,
  readiness,
  locked,
  activeStep,
  onStepChange,
  onRefresh,
}) {
  const storageKey = `festival-setup-step-v2:${festivalId}`;
  // Prevent double-clicks from firing concurrent step changes.
  const steppingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(storageKey, FESTIVAL_SETUP_STEPS[activeStep]);
  }, [activeStep, storageKey]);

  const completed = getSetupCompletion(readiness);

  // Navigate between steps WITHOUT triggering a data refresh.
  //
  // Previously openStep called onRefresh() on every navigation. That caused
  // two concurrent loadRegistrationData calls every time Next/Back was clicked:
  //   1. The call inside invalidateFestivalSetup (with stale/old step captured)
  //   2. The call from useEffect([loadRegistrationData]) after activeStep changed
  //
  // The useEffect-triggered load already handles refreshing step-specific data.
  // onRefresh is reserved for the explicit "Refresh Progress" button below, which
  // the user clicks after making changes that should update server-side readiness.
  const openStep = (index) => {
    if (steppingRef.current) return;
    steppingRef.current = true;
    // Release the guard after a short debounce so rapid double-clicks are dropped
    // but normal Back→Next sequences are not affected.
    setTimeout(() => { steppingRef.current = false; }, 400);

    console.log(
      `[FESTIVAL_SETUP_DEBUG] openStep | festivalId=${festivalId} | from=${activeStep} (${FESTIVAL_SETUP_STEPS[activeStep]}) → to=${index} (${FESTIVAL_SETUP_STEPS[index]})`
    );
    onStepChange(index);
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <Typography variant="h6">Festival Setup Wizard</Typography>
            <Typography color="text.secondary">
              Progress is saved in this browser so incomplete setup can resume.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button size="small" onClick={onRefresh}>
              Refresh Progress
            </Button>
            <Chip
              color={readiness?.overallStatus === "READY" ? "success" : "warning"}
              label={readiness?.overallStatus || "NOT READY"}
            />
          </Stack>
        </Box>
        {locked && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Setup is locked. Auction operations and history remain available.
          </Alert>
        )}
        <Stepper
          nonLinear
          activeStep={activeStep}
          alternativeLabel
          sx={{ display: { xs: "none", lg: "flex" } }}
        >
          {FESTIVAL_SETUP_STEPS.map((label, index) => (
            <Step key={label} completed={completed[index]}>
              <StepButton
                disabled={
                  index > activeStep &&
                  !completed.slice(activeStep, index).every(Boolean)
                }
                onClick={() => openStep(index)}
              >
                {label}
              </StepButton>
            </Step>
          ))}
        </Stepper>
        <MobileStepper
          variant="progress"
          steps={FESTIVAL_SETUP_STEPS.length}
          position="static"
          activeStep={activeStep}
          sx={{ display: { lg: "none" }, px: 0 }}
          nextButton={
            <Button
              size="small"
              disabled={
                activeStep === FESTIVAL_SETUP_STEPS.length - 1 ||
                !completed[activeStep]
              }
              onClick={() => openStep(activeStep + 1)}
            >
              Next
            </Button>
          }
          backButton={
            <Button
              size="small"
              disabled={activeStep === 0}
              onClick={() => openStep(activeStep - 1)}
            >
              Back
            </Button>
          }
        />
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ mt: 2, display: { xs: "none", lg: "flex" } }}
        >
          <Button disabled={activeStep === 0} onClick={() => openStep(activeStep - 1)}>
            Back
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
            Step {activeStep + 1} of {FESTIVAL_SETUP_STEPS.length}:{" "}
            {FESTIVAL_SETUP_STEPS[activeStep]}
          </Typography>
          <Button
            variant="contained"
            disabled={
              activeStep === FESTIVAL_SETUP_STEPS.length - 1 ||
              !completed[activeStep]
            }
            onClick={() => openStep(activeStep + 1)}
          >
            Next
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
