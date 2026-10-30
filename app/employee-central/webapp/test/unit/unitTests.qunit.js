"use strict";

// Do not start QUnit until the test modules are loaded
QUnit.config.autostart = false;
QUnit.config.reorder = false; // keep the order we wrote

sap.ui.require(["sap/ui/core/Core"], (Core) => {
    Core.ready(() => {
        sap.ui.require([
            "com/ec/hrportal/employeecentral/test/unit/model/formatter",
            "com/ec/hrportal/employeecentral/test/unit/util/Validator",
            "com/ec/hrportal/employeecentral/test/unit/service/HrServiceMock"
        ], () => {
            QUnit.start();
        });
    });
});