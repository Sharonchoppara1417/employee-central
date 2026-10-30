const cds = require("@sap/cds");
const { SELECT, INSERT, UPDATE } = cds.ql;

const ATTENDANCE_MONTHS = ["2026-09", "2026-10"];

// Today as "yyyy-mm-dd" (server local time)
function todayIso() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

// Mon-Fri days between two ISO dates, both included
function countWorkingDays(sFrom, sTo) {
  if (!sFrom || !sTo || sTo < sFrom) return 0;
  let iCount = 0;
  const oEnd = new Date(sTo + "T00:00:00Z");
  for (let d = new Date(sFrom + "T00:00:00Z"); d <= oEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const iDay = d.getUTCDay();
    if (iDay !== 0 && iDay !== 6) iCount++;
  }
  return iCount;
}

module.exports = class HrService extends cds.ApplicationService {
  init() {

    /* ---------- submit a leave request ---------- */
    this.on("submitLeaveRequest", async (req) => {
      const { LeaveRequests, LeaveBalances } = cds.entities("hr");
      const { employee_ID, leaveType_ID, startDate, endDate, reason } = req.data;

      if (!employee_ID || !leaveType_ID || !startDate || !endDate) return req.reject(400, "MISSING_FIELDS");
      if (endDate < startDate) return req.reject(400, "INVALID_DATES");
      if (startDate < todayIso()) return req.reject(400, "START_IN_PAST");
      if (!reason || reason.trim().length < 5) return req.reject(400, "REASON_REQUIRED");

      const iDays = countWorkingDays(startDate, endDate);
      if (iDays === 0) return req.reject(400, "NO_WORKING_DAYS");

      const oBalance = await SELECT.one.from(LeaveBalances).where({ employee_ID, leaveType_ID });
      if (!oBalance || iDays > oBalance.remaining) return req.reject(400, "INSUFFICIENT_BALANCE");

      const aExisting = await SELECT.from(LeaveRequests)
        .where({ employee_ID, status: { "!=": "Rejected" } });
      if (aExisting.some((r) => startDate <= r.endDate && endDate >= r.startDate)) {
        return req.reject(409, "OVERLAP");
      }

      const aIds = await SELECT.from(LeaveRequests).columns("ID");
      const ID = "R" + String(aIds.length + 1).padStart(3, "0");

      await INSERT.into(LeaveRequests).entries({
        ID,
        employee_ID,
        leaveType_ID,
        startDate,
        endDate,
        days: iDays,
        reason: reason.trim(),
        status: "Pending",
        managerComment: "",
        createdAt: todayIso()
      });
      return SELECT.one.from(LeaveRequests).where({ ID });
    });

    /* ---------- approve or reject: shared rules ---------- */
    // Returns the request id when the decision was saved, otherwise rejects the request
    const decide = async (req, { requestID, managerID, decision, comment }) => {
      const { LeaveRequests, LeaveBalances, Employees } = cds.entities("hr");

      if (!["Approved", "Rejected"].includes(decision)) return req.reject(400, "INVALID_DECISION");

      const oRequest = await SELECT.one.from(LeaveRequests).where({ ID: requestID });
      if (!oRequest) return req.reject(404, "NOT_FOUND");

      const oEmployee = await SELECT.one.from(Employees).where({ ID: oRequest.employee_ID });
      if (!oEmployee || oEmployee.manager_ID !== managerID) return req.reject(403, "NOT_AUTHORIZED");
      if (oRequest.status !== "Pending") return req.reject(409, "ALREADY_DECIDED");
      if (decision === "Rejected" && (!comment || comment.trim().length < 5)) {
        return req.reject(400, "COMMENT_REQUIRED");
      }

      if (decision === "Approved") {
        const oBalance = await SELECT.one.from(LeaveBalances)
          .where({ employee_ID: oRequest.employee_ID, leaveType_ID: oRequest.leaveType_ID });
        if (!oBalance || oBalance.remaining < oRequest.days) return req.reject(400, "INSUFFICIENT_BALANCE");
        await UPDATE(LeaveBalances)
          .set({ remaining: oBalance.remaining - oRequest.days })
          .where({ ID: oBalance.ID });
      }

      await UPDATE(LeaveRequests)
        .set({ status: decision, managerComment: (comment || "").trim() })
        .where({ ID: requestID });
      return requestID;
    };

    // Reads the saved request back through the service entity (includes statusCriticality)
    const readRequest = (ID) => SELECT.one.from(this.entities.LeaveRequests).where({ ID });

    /* ---------- LEGACY action: the manager id comes from the request body ---------- */
    // Kept only so the freestyle demo keeps working without a login.
    // Do not copy this pattern: the client could claim to be any manager.
    this.on("decideLeaveRequest", async (req) => {
      const { requestID, managerID, decision, comment } = req.data;
      await decide(req, { requestID, managerID, decision, comment });
      return readRequest(requestID);
    });

    /* ---------- bound actions: the manager id comes from the logged-in user ---------- */
    const decideAsLoggedInUser = async (req, sDecision) => {
      const sManagerID = req.user.attr && req.user.attr.employeeId;
      if (!sManagerID) return req.reject(403, "NOT_AUTHORIZED");

      // The key comes from the URL: LeaveRequests('R001')/HrService.approve
      const vKey = req.params[req.params.length - 1];
      const requestID = typeof vKey === "object" ? vKey.ID : vKey;

      await decide(req, {
        requestID,
        managerID: sManagerID,
        decision: sDecision,
        comment: req.data.comment
      });
      return readRequest(requestID);
    };

    this.on("approve", "LeaveRequests", (req) => decideAsLoggedInUser(req, "Approved"));
    this.on("reject", "LeaveRequests", (req) => decideAsLoggedInUser(req, "Rejected"));

    /* ---------- attendance (computed, same rules as the mock) ---------- */
    this.on("getAttendance", async (req) => {
      const { Employees, LeaveRequests } = cds.entities("hr");
      const { employeeID } = req.data;

      const aEmployees = await SELECT.from(Employees).columns("ID").orderBy("ID");
      const iEmp = aEmployees.findIndex((e) => e.ID === employeeID);
      if (iEmp < 0) return req.reject(404, "NOT_FOUND");

      const aLeave = await SELECT.from(LeaveRequests)
        .where({ employee_ID: employeeID, status: "Approved" });
      const sToday = todayIso();
      const aRows = [];

      ATTENDANCE_MONTHS.forEach((sMonth) => {
        const [iYear, iMonth] = sMonth.split("-").map(Number);
        const iLastDay = new Date(Date.UTC(iYear, iMonth, 0)).getUTCDate();

        for (let d = 1; d <= iLastDay; d++) {
          const sDate = sMonth + "-" + String(d).padStart(2, "0");
          const iWeekday = new Date(sDate + "T00:00:00Z").getUTCDay();
          if (iWeekday === 0 || iWeekday === 6 || sDate > sToday) continue;

          const bOnLeave = aLeave.some((r) => sDate >= r.startDate && sDate <= r.endDate);
          const iSeed = (d + iEmp * 3) % 11;

          let status = "Present";
          let checkIn = "09:" + String((d % 4) * 5).padStart(2, "0");
          let checkOut = "18:" + String((d * 7) % 30).padStart(2, "0");

          if (bOnLeave) {
            status = "Leave"; checkIn = ""; checkOut = "";
          } else if (iSeed === 4) {
            status = "Absent"; checkIn = ""; checkOut = "";
          } else if (iSeed === 2 || iSeed === 7) {
            status = "Late";
            checkIn = "10:" + String(10 + (d % 5) * 5).padStart(2, "0");
          }
          aRows.push({ date: sDate, checkIn, checkOut, status });
        }
      });

      return aRows.sort((a, b) => b.date.localeCompare(a.date));
    });

    return super.init();
  }
};