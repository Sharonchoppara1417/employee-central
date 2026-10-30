sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/actions/EnterText",
    "sap/ui/test/matchers/BindingPath",
    "sap/ui/test/matchers/AggregationLengthEquals"
], (Opa5, Press, EnterText, BindingPath, AggregationLengthEquals) => {
    "use strict";

    const VIEW = "com.ec.hrportal.employeecentral.view.View1";

    // Wait for busy controls and pending work before every step
    Opa5.extendConfig({ autoWait: true });

    Opa5.createPageObjects({
        onTheApp: {

            actions: {
                iSwitchToRole(sRole) {
                    return this.waitFor({
                        viewName: VIEW,
                        id: "roleSwitch",
                        actions(oSwitch) {
                            const oItem = oSwitch.getItems().find((i) => i.getKey() === sRole);
                            oSwitch.setSelectedKey(sRole);
                            oSwitch.fireSelectionChange({ item: oItem });
                        },
                        errorMessage: "The role switch was not found"
                    });
                },

                iOpenSection(sHash) {
                    return this.waitFor({
                        viewName: VIEW,
                        id: "tabBar",
                        success() {
                            Opa5.getHashChanger().setHash(sHash);
                        },
                        errorMessage: "The tab bar was not found"
                    });
                },

                iPressNewRequest() {
                    return this.waitFor({
                        viewName: VIEW,
                        id: "newRequestButton",
                        actions: new Press(),
                        errorMessage: "The New Request button was not found"
                    });
                },

                iFillTheLeaveForm(oData) {
                    this.waitFor({
                        viewName: VIEW, id: "typeSelect",
                        actions(oSelect) { oSelect.setSelectedKey(oData.typeKey); },
                        errorMessage: "The leave type select was not found"
                    });
                    this.waitFor({
                        viewName: VIEW, id: "fromPicker",
                        actions(oPicker) { oPicker.setValue(oData.from); },
                        errorMessage: "The from date was not found"
                    });
                    this.waitFor({
                        viewName: VIEW, id: "toPicker",
                        actions(oPicker) { oPicker.setValue(oData.to); },
                        errorMessage: "The to date was not found"
                    });
                    return this.waitFor({
                        viewName: VIEW, id: "reasonArea",
                        actions: new EnterText({ text: oData.reason }),
                        errorMessage: "The reason field was not found"
                    });
                },

                iPressSubmit() {
                    return this.waitFor({
                        viewName: VIEW,
                        id: "submitRequestButton",
                        actions: new Press(),
                        errorMessage: "The Submit button was not found"
                    });
                },

                iPressReviewOnTheFirstRow() {
                    return this.waitFor({
                        viewName: VIEW,
                        controlType: "sap.m.Button",
                        matchers: new BindingPath({ modelName: "hr", path: "/teamRequests/0" }),
                        actions: new Press(),
                        errorMessage: "The Review button of the first row was not found"
                    });
                },

                iPressApprove() {
                    return this.waitFor({
                        viewName: VIEW,
                        id: "approveButton",
                        actions: new Press(),
                        errorMessage: "The Approve button was not found"
                    });
                }
            },

            assertions: {
                iSeeTheUserName(sName) {
                    return this.waitFor({
                        viewName: VIEW,
                        controlType: "sap.m.Title",
                        properties: { text: sName },
                        success() { Opa5.assert.ok(true, "Home shows " + sName); },
                        errorMessage: "Home does not show " + sName
                    });
                },

                iSeeLeaveRows(iCount) {
                    return this.waitFor({
                        viewName: VIEW,
                        id: "leaveTable",
                        matchers: new AggregationLengthEquals({ name: "items", length: iCount }),
                        success() { Opa5.assert.ok(true, "My Leave shows " + iCount + " requests"); },
                        errorMessage: "My Leave does not show " + iCount + " requests"
                    });
                },

                iSeeTheNewestRequestPending() {
                    return this.waitFor({
                        viewName: VIEW,
                        controlType: "sap.m.ObjectStatus",
                        matchers: new BindingPath({ modelName: "hr", path: "/requests/0" }),
                        properties: { state: "Warning" },
                        success() { Opa5.assert.ok(true, "The newest request is Pending (orange)"); },
                        errorMessage: "The newest request is not shown as Pending"
                    });
                },

                iSeeThePendingCount(iCount) {
                    return this.waitFor({
                        viewName: VIEW,
                        controlType: "sap.m.IconTabFilter",
                        properties: { key: "approvals", count: String(iCount) },
                        success() { Opa5.assert.ok(true, "Approvals tab shows " + iCount + " pending"); },
                        errorMessage: "Approvals tab does not show " + iCount + " pending"
                    });
                }
            }
        }
    });
});