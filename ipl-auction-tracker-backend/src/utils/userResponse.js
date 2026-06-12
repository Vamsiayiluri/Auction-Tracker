const SAFE_USER_FIELDS = ["id", "name", "email", "role", "isVerified"];

export const toSafeUserResponse = (user) => {
  if (!user) return null;

  const plainUser =
    typeof user.get === "function" ? user.get({ plain: true }) : user;

  const safeUser = SAFE_USER_FIELDS.reduce((response, field) => {
    response[field] = plainUser[field];
    return response;
  }, {});
  if (typeof plainUser.mustChangePassword === "boolean") {
    safeUser.mustChangePassword = plainUser.mustChangePassword;
  }
  return safeUser;
};
