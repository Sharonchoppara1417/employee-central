sap.ui.define([
    "com/ec/hrportal/employeecentral/util/Validator"
], (Validator) => {
    "use strict";

    const TODAY = "2026-10-29"; // a fixed "today" keeps the tests repeatable
    const BALANCES = [
        { leaveTypeId: "LT1", remaining: 3 },
        { leaveTypeId: "LT3", remaining: 12 }
    ];

    // A valid form (Mon Nov 9 to Fri Nov 13, 2026), with optional overrides
    function form(oOverride) {
        return Object.assign({
            leaveTypeId: "LT3", from: "2026-11-09", to: "2026-11-13", reason: "Family trip"
        }, oOverride);
    }

    QUnit.module("Validator - working days");

    QUnit.test("counts Monday to Friday only", (assert) => {
        assert.strictEqual(Validator.countWorkingDays("2026-11-09", "2026-11-13"), 5, "full week");
        assert.strictEqual(Validator.countWorkingDays("2026-11-06", "2026-11-09"), 2, "Friday to Monday");
        assert.strictEqual(Validator.countWorkingDays("2026-11-07", "2026-11-08"), 0, "weekend only");
        assert.strictEqual(Validator.countWorkingDays("2026-11-10", "2026-11-10"), 1, "one day");
    });

    QUnit.test("returns 0 for missing or reversed dates", (assert) => {
        assert.strictEqual(Validator.countWorkingDays("", "2026-11-10"), 0);
        assert.strictEqual(Validator.countWorkingDays("2026-11-13", "2026-11-09"), 0);
    });

    QUnit.module("Validator - rules");

    QUnit.test("a correct form has no errors", (assert) => {
        const oResult = Validator.validate(form(), BALANCES, [], TODAY);
        assert.deepEqual(oResult.errors, {});
        assert.strictEqual(oResult.days, 5);
    });

    QUnit.test("an empty form reports every required field", (assert) => {
        const oResult = Validator.validate(
            { leaveTypeId: "", from: "", to: "", reason: "" }, BALANCES, [], TODAY);
        assert.deepEqual(Object.keys(oResult.errors).sort(), ["from", "leaveTypeId", "reason", "to"]);
    });

    QUnit.test("a start date in the past is rejected", (assert) => {
        const oResult = Validator.validate(form({ from: "2026-10-01", to: "2026-10-02" }), BALANCES, [], TODAY);
        assert.strictEqual(oResult.errors.from, "errFromPast");
    });

    QUnit.test("an end date before the start date is rejected", (assert) => {
        const oResult = Validator.validate(form({ from: "2026-11-12", to: "2026-11-10" }), BALANCES, [], TODAY);
        assert.strictEqual(oResult.errors.to, "errToBeforeFrom");
    });

    QUnit.test("a weekend-only range is rejected", (assert) => {
        const oResult = Validator.validate(form({ from: "2026-11-07", to: "2026-11-08" }), BALANCES, [], TODAY);
        assert.strictEqual(oResult.errors.to, "errNoWorkingDays");
    });

    QUnit.test("more days than the balance is rejected", (assert) => {
        // Casual (LT1) has 3 days left, the range has 5 working days
        const oResult = Validator.validate(form({ leaveTypeId: "LT1" }), BALANCES, [], TODAY);
        assert.strictEqual(oResult.errors.leaveTypeId, "errBalance");
    });

    QUnit.test("an overlap with a pending or approved request is rejected", (assert) => {
        const aRequests = [{ status: "Pending", from: "2026-11-10", to: "2026-11-12" }];
        const oResult = Validator.validate(form(), BALANCES, aRequests, TODAY);
        assert.strictEqual(oResult.errors.from, "errOverlap");
    });

    QUnit.test("a rejected request does not block the same dates", (assert) => {
        const aRequests = [{ status: "Rejected", from: "2026-11-10", to: "2026-11-12" }];
        const oResult = Validator.validate(form(), BALANCES, aRequests, TODAY);
        assert.deepEqual(oResult.errors, {});
    });

    QUnit.test("a very short reason is rejected", (assert) => {
        const oResult = Validator.validate(form({ reason: "ok" }), BALANCES, [], TODAY);
        assert.strictEqual(oResult.errors.reason, "errReason");
    });
});