const SAFE_USER_FIELDS = ["id", "name", "email", "role", "isVerified"];

export const toSafeUserResponse = (user) => {
  if (!user) return null;

  const plainUser =
    typeof user.get === "function" ? user.get({ plain: true }) : user;

  return SAFE_USER_FIELDS.reduce((safeUser, field) => {
    safeUser[field] = plainUser[field];
    return safeUser;
  }, {});
};
