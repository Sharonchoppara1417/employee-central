sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },
  
createAppModel() {
    return new JSONModel({
        role: "employee",
        userId: "E001",
        section: "home",
        attMonth: "2026-10",
        months: [
            { key: "2026-10" },
            { key: "2026-09" }
        ],
        busy: false,
        loadFailed: false
    });
}
    };

});