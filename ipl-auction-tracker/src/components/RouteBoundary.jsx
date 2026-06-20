import AppErrorBoundary from "./AppErrorBoundary";

export default function RouteBoundary({ children, name = "This page" }) {
  return (
    <AppErrorBoundary scope={`route:${name}`} title={`${name} could not be loaded.`}>
      {children}
    </AppErrorBoundary>
  );
}
