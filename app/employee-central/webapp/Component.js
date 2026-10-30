sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/ec/hrportal/employeecentral/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.ec.hrportal.employeecentral.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
            this.setModel(models.createAppModel(), "app");

            // enable routing
            this.getRouter().initialize();
        }
    });
});