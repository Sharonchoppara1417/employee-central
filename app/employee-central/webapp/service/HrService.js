sap.ui.define([
    "./HrServiceMock",
    "./HrServiceOData"
], (HrServiceMock, HrServiceOData) => {
    "use strict";

    // index.html?data=odata  -> real OData backend
    // anything else          -> mock JSON (default)
    const bOData = new URLSearchParams(window.location.search).get("data") === "odata";

    return bOData ? HrServiceOData : HrServiceMock;
});