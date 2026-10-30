sap.ui.define([
    "sap/ui/core/format/DateFormat"
], (DateFormat) => {
    "use strict";

    const oDateFormat = DateFormat.getDateInstance({ style: "medium", UTC: true });
    const oMonthFormat = DateFormat.getDateInstance({ pattern: "MMMM yyyy", UTC: true });
    const oInr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    const oDayFormat = DateFormat.getDateInstance({ pattern: "EEE, MMM d", UTC: true });

    return {
        // Leave request status -> ValueState
        statusState(sStatus) {
            switch (sStatus) {
                case "Approved": return "Success";
                case "Rejected": return "Error";
                case "Pending":  return "Warning";
                default:         return "None";
            }
     },
     

        // Attendance status -> ValueState
        attendanceState(sStatus) {
            switch (sStatus) {
                case "Present": return "Success";
                case "Late":    return "Warning";
                case "Absent":  return "Error";
                case "Leave":   return "Information";
                default:        return "None";
            }
        },

        // "2026-11-03" -> "Nov 3, 2026"
        date(sIso) {
            return sIso ? oDateFormat.format(new Date(sIso)) : "";
        },

        // "2026-10-28" -> "Wed, Oct 28"
        dateWithDay(sIso) {
            return sIso ? oDayFormat.format(new Date(sIso)) : "";
        },

        // Empty time -> dash
        time(sTime) {
            return sTime || "–";
        },
                // "2026-10" -> "October 2026"
        monthLabel(sMonth) {
            return sMonth ? oMonthFormat.format(new Date(sMonth + "-01")) : "";
        },

        // 69500 -> "₹69,500"
        inr(iAmount) {
            return iAmount == null ? "" : oInr.format(iAmount);
        },
                // "Pending" -> translated text, using the controller's i18n bundle
        statusText(sStatus) {
            return sStatus ? this.getText("status" + sStatus) : "";
        },
    };
});