sap.ui.define([], () => {
    "use strict";

    const LIB_URL = sap.ui.require.toUrl("com/ec/hrportal/employeecentral/lib/jspdf.umd.min.js");
    let pLib = null;

    // Loads jsPDF the first time it is needed, then reuses it
    function loadLib() {
        if (window.jspdf && window.jspdf.jsPDF) {
            return Promise.resolve(window.jspdf.jsPDF);
        }
        if (!pLib) {
            pLib = new Promise((resolve, reject) => {
                const oScript = document.createElement("script");
                oScript.src = LIB_URL;
                oScript.onload = () => {
                    if (window.jspdf && window.jspdf.jsPDF) {
                        resolve(window.jspdf.jsPDF);
                    } else {
                        pLib = null;
                        reject(new Error("jsPDF loaded but was not found on window"));
                    }
                };
                oScript.onerror = () => {
                    pLib = null;
                    reject(new Error("Could not load " + LIB_URL));
                };
                document.head.appendChild(oScript);
            });
        }
        return pLib;
    }

    // jsPDF's default font cannot draw the rupee sign, so the PDF uses "INR"
    function money(n) {
        return "INR " + new Intl.NumberFormat("en-IN").format(n);
    }

    function monthLabel(sMonth) {
        return new Date(sMonth + "-01T00:00:00Z").toLocaleDateString("en-US", {
            month: "long", year: "numeric", timeZone: "UTC"
        });
    }

    function addRow(oDoc, iY, sLabel, iAmount, bBold) {
        oDoc.setFont("helvetica", bBold ? "bold" : "normal");
        oDoc.text(sLabel, 20, iY);
        oDoc.text(money(iAmount), 190, iY, { align: "right" });
    }

    return {
        download(oPayslip, oUser) {
            return loadLib().then((JsPDF) => {
                const oDoc = new JsPDF({ unit: "mm", format: "a4" });

                oDoc.setFont("helvetica", "bold");
                oDoc.setFontSize(18);
                oDoc.text("Employee Central", 20, 22);

                oDoc.setFontSize(12);
                oDoc.setFont("helvetica", "normal");
                oDoc.text("Payslip for " + monthLabel(oPayslip.month), 20, 30);
                oDoc.line(20, 34, 190, 34);

                oDoc.text("Employee: " + oUser.name, 20, 44);
                oDoc.text("Employee ID: " + oUser.id, 20, 51);
                oDoc.text("Department: " + oUser.department, 20, 58);
                oDoc.line(20, 63, 190, 63);

                let iY = 73;
                oDoc.setFont("helvetica", "bold");
                oDoc.text("Earnings", 20, iY);
                iY += 8;
                addRow(oDoc, iY, "Basic", oPayslip.basic);              iY += 7;
                addRow(oDoc, iY, "House rent allowance", oPayslip.hra); iY += 7;
                addRow(oDoc, iY, "Special allowance", oPayslip.special); iY += 9;
                addRow(oDoc, iY, "Gross earnings", oPayslip.gross, true); iY += 14;

                oDoc.setFont("helvetica", "bold");
                oDoc.text("Deductions", 20, iY);
                iY += 8;
                addRow(oDoc, iY, "Provident fund", oPayslip.pf);        iY += 7;
                addRow(oDoc, iY, "Income tax", oPayslip.tax);           iY += 9;
                addRow(oDoc, iY, "Total deductions", oPayslip.deductions, true); iY += 6;

                oDoc.line(20, iY, 190, iY);
                iY += 9;
                oDoc.setFontSize(14);
                addRow(oDoc, iY, "Net pay", oPayslip.net, true);

                oDoc.setFontSize(9);
                oDoc.setFont("helvetica", "normal");
                oDoc.text("This is a computer-generated payslip with sample data.", 20, 280);

                oDoc.save("Payslip_" + oPayslip.month + "_" + oUser.id + ".pdf");
            });
        }
    };
});