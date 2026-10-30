
"use strict";

QUnit.config.autostart = false;
QUnit.config.reorder = false; // the manager journey must run before the employee journey

sap.ui.require(["sap/ui/core/Core"], (Core) => {
    Core.ready(() => {
        sap.ui.require([
            "com/ec/hrportal/employeecentral/test/integration/pages/App",
            "com/ec/hrportal/employeecentral/test/integration/ManagerJourney",
            "com/ec/hrportal/employeecentral/test/integration/EmployeeJourney"
        ], () => {
            QUnit.start();
        });
    });
});