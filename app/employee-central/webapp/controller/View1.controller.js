sap.ui.define([
    "./BaseController",
    "../service/HrService",
    "../model/formatter",
    "../util/Validator",
    "../util/PayslipPdf",
    "sap/base/Log",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (BaseController, HrService, formatter, Validator, PayslipPdf, Log, JSONModel, Filter, FilterOperator, Fragment, MessageBox, MessageToast) => {
    "use strict";

    const VALID_SECTIONS = ["home", "leave", "attendance", "payslips", "approvals"];
    const USER_BY_ROLE = { employee: "E001", manager: "E002" };

    // Service error codes -> i18n keys
    const DECISION_ERRORS = {
        INSUFFICIENT_BALANCE: "errApproveBalance",
        ALREADY_DECIDED: "errAlreadyDecided",
        NOT_AUTHORIZED: "errNotAuthorized"
    };

    return BaseController.extend("com.ec.hrportal.employeecentral.controller.View1", {

        formatter: formatter,

        onInit() {
            this._loadToken = 0;
            this.getView().setModel(new JSONModel(this._emptyHrData()), "hr");
            this.getView().setModel(new JSONModel(this._emptyForm()), "form");
            this.getView().setModel(new JSONModel({ request: {}, comment: "", error: "" }), "decision");
            this.getRouter().getRoute("main").attachPatternMatched(this._onRouteMatched, this);
            this._loadUserData();
        },

        /* ---------- data ---------- */

        _emptyHrData() {
            return {
                user: {}, balances: [], requests: [], attendance: [], attSummary: {},
                payslips: [], teamRequests: [], pendingCount: 0
            };
        },

        _loadUserData() {
            const oApp = this.getModel("app");
            const sUserId = oApp.getProperty("/userId");
            const iToken = ++this._loadToken; // identifies this load

            oApp.setProperty("/busy", true);
            oApp.setProperty("/loadFailed", false);

            return Promise.all([
                HrService.getEmployee(sUserId),
                HrService.getBalances(sUserId),
                HrService.getLeaveRequests(sUserId),
                HrService.getAttendance(sUserId),
                HrService.getPayslips(sUserId),
                HrService.getTeamRequests(sUserId)
            ]).then(([oUser, aBalances, aRequests, aAttendance, aPayslips, aTeamRequests]) => {
                if (iToken !== this._loadToken) {
                    return; // a newer load has started, ignore this old answer
                }
                this.getModel("hr").setData({
                    user: oUser,
                    balances: aBalances,
                    requests: aRequests,
                    attendance: aAttendance,
                    attSummary: {},
                    payslips: aPayslips,
                    teamRequests: aTeamRequests,
                    pendingCount: aTeamRequests.filter((r) => r.status === "Pending").length
                });
                this._updateAttendance();
            }).catch((oError) => {
                if (iToken !== this._loadToken) {
                    return;
                }
                Log.error("Loading HR data failed", oError && oError.message, "com.ec.hrportal");
                this.getModel("hr").setData(this._emptyHrData()); // never show the previous user's data
                oApp.setProperty("/loadFailed", true);
            }).finally(() => {
                if (iToken === this._loadToken) {
                    oApp.setProperty("/busy", false);
                }
            });
        },

        onRetry() {
            this._loadUserData();
        },

        // Blocks a dialog while something is being saved
        _setBusy(pDialog, bBusy) {
            pDialog.then((oDialog) => {
                oDialog.setBusyIndicatorDelay(0); // block clicks immediately
                oDialog.setBusy(bBusy);
            });
        },

        /* ---------- routing and role ---------- */

        _onRouteMatched(oEvent) {
            const oApp = this.getModel("app");
            const sSection = oEvent.getParameter("arguments").section || "home";
            const bManager = oApp.getProperty("/role") === "manager";

            // Unknown section, or an employee trying to open Approvals: go home
            if (!VALID_SECTIONS.includes(sSection) || (sSection === "approvals" && !bManager)) {
                this.getRouter().navTo("main", { section: "home" }, true);
                return;
            }
            oApp.setProperty("/section", sSection);
        },

        onTabSelect(oEvent) {
            this.getRouter().navTo("main", { section: oEvent.getParameter("key") });
        },

        onRoleChange(oEvent) {
            const sRole = oEvent.getParameter("item").getKey();
            const oApp = this.getModel("app");

            oApp.setProperty("/role", sRole);
            oApp.setProperty("/userId", USER_BY_ROLE[sRole]);
            this._loadUserData();

            // If an employee is sitting on Approvals, move them away
            if (sRole !== "manager" && oApp.getProperty("/section") === "approvals") {
                this.getRouter().navTo("main", { section: "home" }, true);
            }
        },

        /* ---------- attendance ---------- */

        onMonthChange(oEvent) {
            this.getModel("app").setProperty("/attMonth", oEvent.getParameter("selectedItem").getKey());
            this._updateAttendance();
        },

        // Filters the table to the chosen month and recounts the summary
        _updateAttendance() {
            const sMonth = this.getModel("app").getProperty("/attMonth");
            const oBinding = this.byId("attendanceTable").getBinding("items");

            if (oBinding) {
                oBinding.filter(new Filter("date", FilterOperator.BT, sMonth + "-01", sMonth + "-31"));
            }

            const oSummary = { Present: 0, Late: 0, Absent: 0, Leave: 0 };
            this.getModel("hr").getProperty("/attendance")
                .filter((r) => r.date.startsWith(sMonth))
                .forEach((r) => { oSummary[r.status]++; });
            this.getModel("hr").setProperty("/attSummary", oSummary);
        },

        /* ---------- payslips ---------- */

        onDownloadPayslip(oEvent) {
            const oPayslip = oEvent.getSource().getBindingContext("hr").getObject();
            const oUser = this.getModel("hr").getProperty("/user");

            PayslipPdf.download(oPayslip, oUser).catch((oError) => {
                Log.error("PDF generation failed", oError && oError.message, "com.ec.hrportal");
                MessageBox.error(this.getText("pdfError"));
            });
        },

        /* ---------- approvals (manager) ---------- */

        onReviewRequest(oEvent) {
            const oRequest = oEvent.getSource().getBindingContext("hr").getObject();
            this.getModel("decision").setData({ request: { ...oRequest }, comment: "", error: "" });

            if (!this._pDecisionDialog) {
                this._pDecisionDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.ec.hrportal.employeecentral.fragment.ApprovalDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pDecisionDialog.then((oDialog) => oDialog.open());
        },

        onDecisionCommentChange() {
            this.getModel("decision").setProperty("/error", "");
        },

        onCancelDecision() {
            this._pDecisionDialog.then((oDialog) => oDialog.close());
        },

        onApprove() {
            this._decide("Approved");
        },

        onReject() {
            this._decide("Rejected");
        },

        _decide(sDecision) {
            const oDecision = this.getModel("decision");
            const sComment = (oDecision.getProperty("/comment") || "").trim();

            // Rejecting needs a reason the employee can read
            if (sDecision === "Rejected" && sComment.length < 5) {
                oDecision.setProperty("/error", this.getText("errRejectComment"));
                return;
            }

            this._setBusy(this._pDecisionDialog, true);
            HrService.decideLeaveRequest({
                id: oDecision.getProperty("/request/id"),
                decision: sDecision,
                comment: sComment,
                managerId: this.getModel("app").getProperty("/userId")
            }).then(() => {
                this._pDecisionDialog.then((oDialog) => oDialog.close());
                MessageToast.show(this.getText(sDecision === "Approved" ? "decisionApproved" : "decisionRejected"));
                return this._loadUserData();
            }).catch((oError) => {
                MessageBox.error(this.getText(DECISION_ERRORS[oError.message] || "decideError"));
            }).finally(() => {
                this._setBusy(this._pDecisionDialog, false);
            });
        },

        /* ---------- leave request dialog ---------- */

        _emptyForm() {
            return { leaveTypeId: "", from: "", to: "", reason: "", days: 0, submitted: false, errors: {} };
        },

        onNewRequest() {
            this.getModel("form").setData(this._emptyForm());

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.ec.hrportal.employeecentral.fragment.LeaveRequestDialog",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pDialog.then((oDialog) => oDialog.open());
        },

        onCancelRequest() {
            this._pDialog.then((oDialog) => oDialog.close());
        },

        onFormChange() {
            const oForm = this.getModel("form");
            if (oForm.getProperty("/submitted")) {
                this._runValidation(); // live feedback once the user has tried to submit
            } else {
                oForm.setProperty("/days", Validator.countWorkingDays(
                    oForm.getProperty("/from"), oForm.getProperty("/to")
                ));
            }
        },

        // Runs the validator, shows translated messages, returns true if valid
        _runValidation() {
            const oForm = this.getModel("form");
            const oHr = this.getModel("hr");
            const oResult = Validator.validate(
                oForm.getData(),
                oHr.getProperty("/balances"),
                oHr.getProperty("/requests"),
                Validator.todayIso()
            );

            const oErrors = {};
            Object.entries(oResult.errors).forEach(([sField, sKey]) => {
                oErrors[sField] = this.getText(sKey);
            });

            oForm.setProperty("/errors", oErrors);
            oForm.setProperty("/days", oResult.days);
            return Object.keys(oErrors).length === 0;
        },

        onSubmitRequest() {
            const oForm = this.getModel("form");
            oForm.setProperty("/submitted", true);

            if (!this._runValidation()) {
                return;
            }

            const oData = oForm.getData();
            this._setBusy(this._pDialog, true);
            HrService.submitLeaveRequest({
                employeeId: this.getModel("app").getProperty("/userId"),
                leaveTypeId: oData.leaveTypeId,
                from: oData.from,
                to: oData.to,
                days: oData.days,
                reason: oData.reason.trim(),
                createdAt: Validator.todayIso()
            }).then(() => {
                this._pDialog.then((oDialog) => oDialog.close());
                MessageToast.show(this.getText("requestSubmitted"));
                return this._loadUserData();
            }).then(() => {
                this.getRouter().navTo("main", { section: "leave" });
            }).catch((oError) => {
                Log.error("Submitting leave request failed", oError && oError.message, "com.ec.hrportal");
                MessageBox.error(this.getText("submitError"));
            }).finally(() => {
                this._setBusy(this._pDialog, false);
            });
        }
    });
});