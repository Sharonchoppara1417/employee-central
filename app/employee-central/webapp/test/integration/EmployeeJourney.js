sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App"
], (opaTest) => {
    "use strict";

    // Monday at least 14 days from today, and not before Nov 9, 2026
    // (so it can never overlap the sample requests)
    function nextFreeWeek() {
        const oStart = new Date(Math.max(Date.now() + 14 * 86400000, new Date(2026, 10, 9).getTime()));
        while (oStart.getDay() !== 1) {
            oStart.setDate(oStart.getDate() + 1);
        }
        const iso = (d) => [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");

        const sFrom = iso(oStart);
        oStart.setDate(oStart.getDate() + 4); // Friday
        return { from: sFrom, to: iso(oStart) };
    }

    QUnit.module("Employee journey");

    opaTest("The employee submits a leave request", (Given, When, Then) => {
        Given.iStartMyUIComponent({
            componentConfig: { name: "com.ec.hrportal.employeecentral", async: true },
            hash: "leave"
        });

        Then.onTheApp.iSeeLeaveRows(4);

        When.onTheApp.iPressNewRequest();
        When.onTheApp.iFillTheLeaveForm({ typeKey: "LT3", ...nextFreeWeek(), reason: "Family trip" });
        When.onTheApp.iPressSubmit();

        Then.onTheApp.iSeeLeaveRows(5);
        Then.onTheApp.iSeeTheNewestRequestPending();

        Then.iTeardownMyUIComponent();
    });
});