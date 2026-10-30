sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App"
], (opaTest) => {
    "use strict";

    QUnit.module("Manager journey");

    opaTest("The manager approves the first pending request", (Given, When, Then) => {
        Given.iStartMyUIComponent({
            componentConfig: { name: "com.ec.hrportal.employeecentral", async: true }
        });

        When.onTheApp.iSwitchToRole("manager");
        When.onTheApp.iOpenSection("approvals");
        Then.onTheApp.iSeeThePendingCount(4);

        When.onTheApp.iPressReviewOnTheFirstRow();
        When.onTheApp.iPressApprove();
        Then.onTheApp.iSeeThePendingCount(3);

        Then.iTeardownMyUIComponent();
    });
});