sap.ui.define([
    "com/ec/hrportal/employeecentral/service/HrServiceMock",
    "com/ec/hrportal/employeecentral/util/Validator"
], (HrService, Validator) => {
    "use strict";

    // The read tests only use employee E001, and the write tests below
    // only touch E003, so the order of tests cannot affect each other.

    QUnit.module("HrServiceMock - reading");

    QUnit.test("getEmployee returns the employee", async (assert) => {
        const oEmployee = await HrService.getEmployee("E001");
        assert.strictEqual(oEmployee.name, "Siri Reddy");
        assert.strictEqual(oEmployee.managerId, "E002");
    });

    QUnit.test("getBalances returns 3 leave types with names", async (assert) => {
        const aBalances = await HrService.getBalances("E001");
        assert.strictEqual(aBalances.length, 3);
        const oCasual = aBalances.find((b) => b.leaveTypeName === "Casual");
        assert.strictEqual(oCasual.remaining, 9);
    });

    QUnit.test("getLeaveRequests returns the newest request first", async (assert) => {
        const aRequests = await HrService.getLeaveRequests("E001");
        assert.strictEqual(aRequests.length, 4);
        const aDates = aRequests.map((r) => r.createdAt);
        assert.deepEqual(aDates, [...aDates].sort().reverse(), "sorted by createdAt, newest first");
    });

    QUnit.test("getPayslips calculates gross, deductions and net", async (assert) => {
        const aPayslips = await HrService.getPayslips("E001");
        assert.strictEqual(aPayslips[0].month, "2026-10", "newest month first");
        assert.strictEqual(aPayslips[0].gross, 85000);
        assert.strictEqual(aPayslips[0].deductions, 15500);
        assert.strictEqual(aPayslips[0].net, 69500);
    });

    QUnit.test("getTeamRequests lists the team and puts pending first", async (assert) => {
        const aRequests = await HrService.getTeamRequests("E002");
        assert.ok(aRequests.length > 0);
        assert.ok(aRequests.every((r) => ["E001", "E003"].includes(r.employeeId)), "only team members");

        const iFirstDecided = aRequests.findIndex((r) => r.status !== "Pending");
        const bPendingAfter = iFirstDecided >= 0 &&
            aRequests.slice(iFirstDecided).some((r) => r.status === "Pending");
        assert.notOk(bPendingAfter, "no pending request after a decided one");
    });

    QUnit.test("getAttendance: weekdays only, no future days, approved leave shows as Leave", async (assert) => {
        const aRows = await HrService.getAttendance("E001");
        const sToday = Validator.todayIso();

        assert.ok(aRows.every((r) => r.date <= sToday), "no future dates");
        assert.ok(aRows.every((r) => {
            const iDay = new Date(r.date + "T00:00:00Z").getUTCDay();
            return iDay !== 0 && iDay !== 6;
        }), "no weekends");

        const oLeaveDay = aRows.find((r) => r.date === "2026-09-14");
        assert.strictEqual(oLeaveDay.status, "Leave", "Sep 14 is covered by an approved request");
    });

    QUnit.module("HrServiceMock - writing");

    QUnit.test("a manager who is not the employee's manager is refused", async (assert) => {
        await assert.rejects(
            HrService.decideLeaveRequest({ id: "R004", decision: "Approved", comment: "", managerId: "E001" }),
            /NOT_AUTHORIZED/
        );
    });

    QUnit.test("approving deducts the balance and cannot be repeated", async (assert) => {
        const getCasual = async () =>
            (await HrService.getBalances("E003")).find((b) => b.leaveTypeName === "Casual").remaining;
        const iBefore = await getCasual();
        const oRequest = { id: "R005", decision: "Approved", comment: "", managerId: "E002" };

        const oResult = await HrService.decideLeaveRequest(oRequest);
        assert.strictEqual(oResult.status, "Approved");
        assert.strictEqual(await getCasual(), iBefore - 3, "3 days deducted");

        await assert.rejects(HrService.decideLeaveRequest(oRequest), /ALREADY_DECIDED/);
    });

    QUnit.test("submitLeaveRequest creates a Pending request", async (assert) => {
        const oNew = await HrService.submitLeaveRequest({
            employeeId: "E003", leaveTypeId: "LT3", from: "2026-12-01", to: "2026-12-02",
            days: 2, reason: "Test request", createdAt: "2026-10-29"
        });
        assert.strictEqual(oNew.status, "Pending");

        const aRequests = await HrService.getLeaveRequests("E003");
        assert.ok(aRequests.some((r) => r.id === oNew.id), "it appears in the list");
    });
});