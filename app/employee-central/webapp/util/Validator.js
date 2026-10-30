sap.ui.define([], () => {
    "use strict";

    // Today as "yyyy-mm-dd" in the user's local time zone
    function todayIso() {
        const d = new Date();
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");
    }

    function toUtcDate(sIso) {
        return new Date(sIso + "T00:00:00Z");
    }

    // Counts Mon-Fri days between two ISO dates, both included
    function countWorkingDays(sFrom, sTo) {
        if (!sFrom || !sTo || sTo < sFrom) {
            return 0;
        }
        let iCount = 0;
        const oEnd = toUtcDate(sTo);
        for (let d = toUtcDate(sFrom); d <= oEnd; d.setUTCDate(d.getUTCDate() + 1)) {
            const iDay = d.getUTCDay();
            if (iDay !== 0 && iDay !== 6) {
                iCount++;
            }
        }
        return iCount;
    }

    // Returns { errors: { fieldName: "i18nKey" }, days: number }
    function validate(oForm, aBalances, aRequests, sToday) {
        const oErrors = {};
        const iDays = countWorkingDays(oForm.from, oForm.to);

        if (!oForm.leaveTypeId) {
            oErrors.leaveTypeId = "errTypeRequired";
        }

        if (!oForm.from) {
            oErrors.from = "errFromRequired";
        } else if (oForm.from < sToday) {
            oErrors.from = "errFromPast";
        }

        if (!oForm.to) {
            oErrors.to = "errToRequired";
        } else if (oForm.from && oForm.to < oForm.from) {
            oErrors.to = "errToBeforeFrom";
        }

        // Checks that need both dates to be in a valid order
        if (oForm.from && oForm.to && !oErrors.to) {
            if (iDays === 0) {
                oErrors.to = "errNoWorkingDays";
            } else {
                const oBalance = aBalances.find((b) => b.leaveTypeId === oForm.leaveTypeId);
                if (oBalance && iDays > oBalance.remaining) {
                    oErrors.leaveTypeId = "errBalance";
                }

                const bOverlap = aRequests.some((r) =>
                    r.status !== "Rejected" && oForm.from <= r.to && oForm.to >= r.from
                );
                if (bOverlap && !oErrors.from) {
                    oErrors.from = "errOverlap";
                }
            }
        }

        if (!oForm.reason || oForm.reason.trim().length < 5) {
            oErrors.reason = "errReason";
        }

        return { errors: oErrors, days: iDays };
    }

    return { todayIso, countWorkingDays, validate };
});