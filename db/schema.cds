namespace hr;

entity Employees {
  key ID         : String(10);
      name       : String(100);
      email      : String(100);
      department : String(50);
      manager    : Association to Employees;
      role       : String(20);
}

entity LeaveTypes {
  key ID          : String(10);
      name        : String(50);
      annualQuota : Integer;
}

entity LeaveBalances {
  key ID        : String(20);
      employee  : Association to Employees;
      leaveType : Association to LeaveTypes;
      year      : Integer;
      remaining : Integer;
}

entity LeaveRequests {
  key ID             : String(10);
      employee       : Association to Employees;
      leaveType      : Association to LeaveTypes;
      startDate      : Date;
      endDate        : Date;
      days           : Integer;
      reason         : String(200);
      status         : String(20);
      managerComment : String(200);
      createdAt      : Date;
}

entity Payslips {
  key ID       : String(30);
      employee : Association to Employees;
      month    : String(7);
      basic    : Integer;
      hra      : Integer;
      special  : Integer;
      pf       : Integer;
      tax      : Integer;
}