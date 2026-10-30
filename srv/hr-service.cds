

using hr from '../db/schema';

service HrService @(path: '/odata/hr') {

  entity Employees     as projection on hr.Employees;
  entity LeaveTypes    as projection on hr.LeaveTypes;
  entity LeaveBalances as projection on hr.LeaveBalances;
    entity LeaveRequests as projection on hr.LeaveRequests {
    *,
    case
      when status = 'Approved' then 3
      when status = 'Rejected' then 1
      when status = 'Pending'  then 2
      else 0
    end as statusCriticality : Integer
  } actions {
    @requires: 'manager'
    action approve(comment : String @title : 'Comment (optional)') returns LeaveRequests;

    @requires: 'manager'
    action reject(comment : String @title : 'Reason for rejection') returns LeaveRequests;
  };

 

  entity Payslips      as projection on hr.Payslips;

  type AttendanceRow {
    date     : Date;
    checkIn  : String(5);
    checkOut : String(5);
    status   : String(10);
  }

  action submitLeaveRequest(
    employee_ID : String,
    leaveType_ID : String,
    startDate : Date,
    endDate : Date,
    reason : String
  ) returns LeaveRequests;

  action decideLeaveRequest(
    requestID : String,
    managerID : String,
    decision : String,
    comment : String
  ) returns LeaveRequests;

  function getAttendance(employeeID : String) returns array of AttendanceRow;
}