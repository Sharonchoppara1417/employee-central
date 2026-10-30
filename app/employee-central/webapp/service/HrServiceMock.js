sap.ui.define([
     "../util/Validator"
], (Validator) => {
    "use strict";

    const MOCK_URL = sap.ui.require.toUrl("com/ec/hrportal/employeecentral/model/mock/hrData.json");
    let pLoad = null;

    // Loads the JSON once, then reuses the same Promise
    function load() {
        if (!pLoad) {
            pLoad = fetch(MOCK_URL)
                .then((oRes) => {
                    if (!oRes.ok) {
                        throw new Error("Mock data failed to load: " + oRes.status);
                    }
                    return oRes.json();
                })
                .catch((oErr) => {
                    pLoad = null; // allow a retry on the next call
                    throw oErr;
                });
        }
        return pLoad;
    }
        const ATTENDANCE_MONTHS = ["2026-09", "2026-10"];

    // Builds daily attendance rows from simple rules (mock only)
    function buildAttendance(oDb) {
        const sToday = Validator.todayIso();
        const aRows = [];

        oDb.employees.forEach((oEmp, iEmp) => {
            ATTENDANCE_MONTHS.forEach((sMonth) => {
                const [iYear, iMonth] = sMonth.split("-").map(Number);
                const iLastDay = new Date(Date.UTC(iYear, iMonth, 0)).getUTCDate();

                for (let d = 1; d <= iLastDay; d++) {
                    const sDate = sMonth + "-" + String(d).padStart(2, "0");
                    const iWeekday = new Date(sDate + "T00:00:00Z").getUTCDay();

                    // Skip weekends and days in the future
                    if (iWeekday === 0 || iWeekday === 6 || sDate > sToday) {
                        continue;
                    }

                    const bOnLeave = oDb.leaveRequests.some((r) =>
                        r.employeeId === oEmp.id && r.status === "Approved" &&
                        sDate >= r.from && sDate <= r.to
                    );
                    const iSeed = (d + iEmp * 3) % 11; // same input gives same result every time

                    let sStatus = "Present";
                    let sCheckIn = "09:" + String((d % 4) * 5).padStart(2, "0");
                    let sCheckOut = "18:" + String((d * 7) % 30).padStart(2, "0");

                    if (bOnLeave) {
                        sStatus = "Leave";
                        sCheckIn = "";
                        sCheckOut = "";
                    } else if (iSeed === 4) {
                        sStatus = "Absent";
                        sCheckIn = "";
                        sCheckOut = "";
                    } else if (iSeed === 2 || iSeed === 7) {
                        sStatus = "Late";
                        sCheckIn = "10:" + String(10 + (d % 5) * 5).padStart(2, "0");
                    }

                    aRows.push({
                        id: oEmp.id + "-" + sDate,
                        employeeId: oEmp.id,
                        date: sDate,
                        checkIn: sCheckIn,
                        checkOut: sCheckOut,
                        status: sStatus
                    });
                }
            });
        });
        return aRows;
    }

    return {
        getEmployee(sId) {
            return load().then((oDb) => oDb.employees.find((e) => e.id === sId));
        },

        getBalances(sEmployeeId) {
            return load().then((oDb) =>
                oDb.leaveBalances
                    .filter((b) => b.employeeId === sEmployeeId)
                    .map((b) => ({
                        ...b,
                        leaveTypeName: oDb.leaveTypes.find((t) => t.id === b.leaveTypeId).name
                    }))
            );
        },

        getLeaveRequests(sEmployeeId) {
            return load().then((oDb) =>
                oDb.leaveRequests
                    .filter((r) => r.employeeId === sEmployeeId)
                    .map((r) => ({
                        ...r,
                        leaveTypeName: oDb.leaveTypes.find((t) => t.id === r.leaveTypeId).name
                    }))
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            );
        },
                getAttendance(sEmployeeId) {
            return load().then((oDb) =>
                buildAttendance(oDb)
                    .filter((r) => r.employeeId === sEmployeeId)
                    .sort((a, b) => b.date.localeCompare(a.date))
            );
        },
                getPayslips(sEmployeeId) {
            return load().then((oDb) =>
                oDb.payslips
                    .filter((p) => p.employeeId === sEmployeeId)
                    .map((p) => {
                        const iGross = p.basic + p.hra + p.special;
                        const iDeductions = p.pf + p.tax;
                        return { ...p, gross: iGross, deductions: iDeductions, net: iGross - iDeductions };
                    })
                    .sort((a, b) => b.month.localeCompare(a.month))
            );
        },
                getTeamRequests(sManagerId) {
            return load().then((oDb) => {
                const aTeamIds = oDb.employees
                    .filter((e) => e.managerId === sManagerId)
                    .map((e) => e.id);

                return oDb.leaveRequests
                    .filter((r) => aTeamIds.includes(r.employeeId))
                    .map((r) => ({
                        ...r,
                        employeeName: oDb.employees.find((e) => e.id === r.employeeId).name,
                        leaveTypeName: oDb.leaveTypes.find((t) => t.id === r.leaveTypeId).name
                    }))
                    // Pending first, then newest first
                    .sort((a, b) =>
                        (a.status === "Pending" ? 0 : 1) - (b.status === "Pending" ? 0 : 1) ||
                        b.createdAt.localeCompare(a.createdAt)
                    );
            });
        },

        decideLeaveRequest({ id, decision, comment, managerId }) {
            return load().then((oDb) => {
                const oRequest = oDb.leaveRequests.find((r) => r.id === id);
                if (!oRequest) {
                    throw new Error("NOT_FOUND");
                }

                const oEmployee = oDb.employees.find((e) => e.id === oRequest.employeeId);
                if (!oEmployee || oEmployee.managerId !== managerId) {
                    throw new Error("NOT_AUTHORIZED");
                }
                if (oRequest.status !== "Pending") {
                    throw new Error("ALREADY_DECIDED");
                }

                if (decision === "Approved") {
                    const oBalance = oDb.leaveBalances.find((b) =>
                        b.employeeId === oRequest.employeeId && b.leaveTypeId === oRequest.leaveTypeId
                    );
                    if (!oBalance || oBalance.remaining < oRequest.days) {
                        throw new Error("INSUFFICIENT_BALANCE");
                    }
                    oBalance.remaining -= oRequest.days;
                }

                oRequest.status = decision;
                oRequest.managerComment = comment;
                return oRequest;
            });
        },
                submitLeaveRequest(oData) {
            return load().then((oDb) => {
                const oRequest = {
                    id: "R" + String(oDb.leaveRequests.length + 1).padStart(3, "0"),
                    employeeId: oData.employeeId,
                    leaveTypeId: oData.leaveTypeId,
                    from: oData.from,
                    to: oData.to,
                    days: oData.days,
                    reason: oData.reason,
                    status: "Pending",
                    managerComment: "",
                    createdAt: oData.createdAt
                };
                oDb.leaveRequests.push(oRequest);
                return oRequest;
            });
        }
    };
});
