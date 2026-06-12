export const PUBLIC_REGISTRATION_ROLES = Object.freeze([
  "spectator",
]);

export const isPublicRegistrationRole = (role) =>
  PUBLIC_REGISTRATION_ROLES.includes(role);
