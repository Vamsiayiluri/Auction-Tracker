const toPlain = (record) =>
  typeof record?.get === "function" ? record.get({ plain: true }) : record;

export const toEmployeeResponse = (employee) => {
  const plain = toPlain(employee);

  return {
    id: plain.id,
    employeeNumber: plain.employeeNumber,
    name: plain.name,
    email: plain.email,
    department: plain.department,
    employmentStatus: plain.employmentStatus,
    source: plain.source,
    identityStatus: plain.identityStatus,
    userId: plain.userId,
    hasLogin: Boolean(plain.userId),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};
