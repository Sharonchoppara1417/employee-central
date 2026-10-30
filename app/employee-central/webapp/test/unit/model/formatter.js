sap.ui.define([
    "com/ec/hrportal/employeecentral/model/formatter"
], (formatter) => {
    "use strict";

    QUnit.module("formatter");

    QUnit.test("statusState maps leave request statuses", (assert) => {
        assert.strictEqual(formatter.statusState("Approved"), "Success");
        assert.strictEqual(formatter.statusState("Rejected"), "Error");
        assert.strictEqual(formatter.statusState("Pending"), "Warning");
        assert.strictEqual(formatter.statusState("Unknown"), "None", "unknown values get no color");
    });

    QUnit.test("attendanceState maps attendance statuses", (assert) => {
        assert.strictEqual(formatter.attendanceState("Present"), "Success");
        assert.strictEqual(formatter.attendanceState("Late"), "Warning");
        assert.strictEqual(formatter.attendanceState("Absent"), "Error");
        assert.strictEqual(formatter.attendanceState("Leave"), "Information");
        assert.strictEqual(formatter.attendanceState(undefined), "None");
    });

    QUnit.test("time shows a dash when empty", (assert) => {
        assert.strictEqual(formatter.time("09:05"), "09:05");
        assert.strictEqual(formatter.time(""), "–");
    });

    QUnit.test("date formats an ISO date", (assert) => {
        assert.strictEqual(formatter.date("2026-11-03"), "Nov 3, 2026");
        assert.strictEqual(formatter.date(""), "", "empty input gives empty text");
    });

    QUnit.test("dateWithDay adds the weekday", (assert) => {
        assert.strictEqual(formatter.dateWithDay("2026-10-28"), "Wed, Oct 28");
    });

    QUnit.test("monthLabel turns yyyy-mm into a month name", (assert) => {
        assert.strictEqual(formatter.monthLabel("2026-10"), "October 2026");
        assert.strictEqual(formatter.monthLabel(""), "");
    });

    QUnit.test("inr formats rupee amounts", (assert) => {
        assert.ok(formatter.inr(69500).includes("69,500"), "contains the grouped amount");
        assert.strictEqual(formatter.inr(null), "");
    });

    QUnit.test("statusText translates through the controller (this)", (assert) => {
        // UI5 calls formatters with the controller as "this", so we fake one
        const oFakeController = { getText: (sKey) => "T:" + sKey };
        assert.strictEqual(formatter.statusText.call(oFakeController, "Pending"), "T:statusPending");
        assert.strictEqual(formatter.statusText.call(oFakeController, ""), "");
    });
});