sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/ec/hrportal/leaverequests/test/integration/pages/LeaveRequestsList.gen",
	"com/ec/hrportal/leaverequests/test/integration/pages/LeaveRequestsObjectPage.gen"
], function (JourneyRunner, LeaveRequestsListGenerated, LeaveRequestsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/ec/hrportal/leaverequests') + '/test/flp.html#app-preview',
        pages: {
			onTheLeaveRequestsListGenerated: LeaveRequestsListGenerated,
			onTheLeaveRequestsObjectPageGenerated: LeaveRequestsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

