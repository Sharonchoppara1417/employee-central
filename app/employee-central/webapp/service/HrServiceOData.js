sap.ui.define([], () => {
    "use strict";

    const BASE = "/odata/hr";

    /* ---------- helpers ---------- */

    // 'E001' with quotes, apostrophes escaped (OData string literal)
    function lit(sValue) {
        return "'" + String(sValue).replace(/'/g, "''") + "'";
    }

    function enc(sValue) {
        return encodeURIComponent(sValue);
    }

    // Calls the backend; failures become Error("SERVER_CODE")
    function request(sPath, mOptions) {
        return fetch(BASE + sPath, {
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            ...mOptions
        }).then((oRes) => {
            if (oRes.ok) {
                return oRes.status === 204 ? null : oRes.json();
            }
            return oRes.json().catch(() => ({})).then((oBody) => {
                const sCode = (oBody.error && oBody.error.message) || ("HTTP_" + oRes.status);
                throw new Error(sCode);
            });
        });
    }

    function post(sPath, oBody) {
        return request(sPath, { method: "POST", body: JSON.stringify(oBody) });
    }

    /* ---------- mappers: OData shape -> the shape the UI already uses ---------- */

    function mapEmployee(e) {
        return { id: e.ID, name: e.name, email: e.email, department: e.department,
                 managerId: e.manager_ID, role: e.role };
    }

    function mapRequest(r) {
        return {
            id: r.ID,
            employeeId: r.employee_ID,
            leaveTypeId: r.leaveType_ID,
            from: r.startDate,
            to: r.endDate,
            days: r.days,
            reason: r.reason,
            status: r.status,
            managerComment: r.managerComment || "",
            createdAt: r.createdAt,
            leaveTypeName: r.leaveType ? r.leaveType.name : "",
            employeeName: r.employee ? r.employee.name : ""
        };
    }

    /* ---------- public API (same names as the mock) ---------- */

    return {
        getEmployee(sId) {
            return request("/Employees(" + lit(sId) + ")").then(mapEmployee);
        },

        getBalances(sEmployeeId) {
            return request(
                "/LeaveBalances?$filter=" + enc("employee_ID eq " + lit(sEmployeeId)) +
                "&$expand=" + enc("leaveType($select=name)") +
                "&$orderby=" + enc("leaveType_ID")
            ).then((o) => o.value.map((b) => ({
                employeeId: b.employee_ID,
                leaveTypeId: b.leaveType_ID,
                year: b.year,
                remaining: b.remaining,
                leaveTypeName: b.leaveType ? b.leaveType.name : ""
            })));
        },

        getLeaveRequests(sEmployeeId) {
            return request(
                "/LeaveRequests?$filter=" + enc("employee_ID eq " + lit(sEmployeeId)) +
                "&$expand=" + enc("leaveType($select=name)") +
                "&$orderby=" + enc("createdAt desc")
            ).then((o) => o.value.map(mapRequest));
        },

        getAttendance(sEmployeeId) {
            return request("/getAttendance(employeeID=" + lit(sEmployeeId) + ")")
                .then((o) => o.value.map((r) => ({
                    id: sEmployeeId + "-" + r.date,
                    employeeId: sEmployeeId,
                    date: r.date,
                    checkIn: r.checkIn,
                    checkOut: r.checkOut,
                    status: r.status
                })));
        },

        getPayslips(sEmployeeId) {
            return request(
                "/Payslips?$filter=" + enc("employee_ID eq " + lit(sEmployeeId)) +
                "&$orderby=" + enc("month desc")
            ).then((o) => o.value.map((p) => {
                const iGross = p.basic + p.hra + p.special;
                const iDeductions = p.pf + p.tax;
                return {
                    id: p.ID, employeeId: p.employee_ID, month: p.month,
                    basic: p.basic, hra: p.hra, special: p.special, pf: p.pf, tax: p.tax,
                    gross: iGross, deductions: iDeductions, net: iGross - iDeductions
                };
            }));
        },

        getTeamRequests(sManagerId) {
            // Step 1: who reports to this manager?  Step 2: their requests.
            return request(
                "/Employees?$filter=" + enc("manager_ID eq " + lit(sManagerId)) + "&$select=ID"
            ).then((oTeam) => {
                const aIds = oTeam.value.map((e) => e.ID);
                if (!aIds.length) {
                    return [];
                }
                const sFilter = aIds.map((sId) => "employee_ID eq " + lit(sId)).join(" or ");
                return request(
                    "/LeaveRequests?$filter=" + enc(sFilter) +
                    "&$expand=" + enc("employee($select=name),leaveType($select=name)")
                ).then((o) => o.value.map(mapRequest).sort((a, b) =>
                    (a.status === "Pending" ? 0 : 1) - (b.status === "Pending" ? 0 : 1) ||
                    b.createdAt.localeCompare(a.createdAt)
                ));
            });
        },

        submitLeaveRequest(oData) {
            return post("/submitLeaveRequest", {
                employee_ID: oData.employeeId,
                leaveType_ID: oData.leaveTypeId,
                startDate: oData.from,
                endDate: oData.to,
                reason: oData.reason
            }).then(mapRequest);
        },

        decideLeaveRequest({ id, decision, comment, managerId }) {
            return post("/decideLeaveRequest", {
                requestID: id,
                managerID: managerId,
                decision: decision,
                comment: comment
            }).then(mapRequest);
        }
    };
});