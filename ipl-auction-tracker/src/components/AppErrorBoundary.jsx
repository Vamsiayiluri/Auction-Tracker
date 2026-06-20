import { Component } from "react";
import { Box } from "@mui/material";
import { ProductStateCard } from "./ProductState";
import { isChunkLoadError, recoverFromChunkError } from "../utils/chunkRecovery";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, key: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[APP_ERROR_BOUNDARY]", {
      message: error?.message || String(error),
      stack: errorInfo?.componentStack,
    });
    if (isChunkLoadError(error)) {
      recoverFromChunkError({
        error,
        scope: this.props.scope || "app",
        reload: true,
      });
    }
  }

  retry = () => {
    this.setState((current) => ({
      error: null,
      key: current.key + 1,
    }));
  };

  reload = () => {
    window.location.reload();
  };

  dashboard = () => {
    window.location.assign("/dashboard");
  };

  render() {
    if (!this.state.error) {
      return <Box key={this.state.key}>{this.props.children}</Box>;
    }

    const chunkFailure = isChunkLoadError(this.state.error);
    return (
      <ProductStateCard
        eyebrow={chunkFailure ? "Application Update" : "Application Error"}
        title={
          chunkFailure
            ? "A new version is available."
            : this.props.title || "This section could not be loaded."
        }
        message={
          chunkFailure
            ? "The app was updated while this page was open. Reload to get the latest files."
            : "The rest of the application is still available. Retry this section or reload the app."
        }
        actionLabel="Retry"
        onAction={this.retry}
        secondaryActionLabel="Reload App"
        onSecondaryAction={this.reload}
        tertiaryActionLabel="Go to Dashboard"
        onTertiaryAction={this.dashboard}
      />
    );
  }
}
