using HrService as service from './hr-service';

/* ---------- Field labels and how foreign keys are displayed ---------- */
annotate service.LeaveRequests with {
    employee       @title : 'Employee'
                   @Common.Text            : employee.name
                   @Common.TextArrangement : #TextOnly;
    leaveType      @title : 'Leave type'
                   @Common.Text            : leaveType.name
                   @Common.TextArrangement : #TextOnly;
    startDate      @title : 'From';
    endDate        @title : 'To';
    days           @title : 'Working days';
    reason         @title : 'Reason';
    status         @title : 'Status';
    managerComment @title : 'Manager comment';
    createdAt      @title : 'Requested on';
};

/* Lets the filter bar offer value help lists for these associations */
annotate service.Employees  with @cds.odata.valuelist;
annotate service.LeaveTypes with @cds.odata.valuelist;

/* ---------- The screens ---------- */
annotate service.LeaveRequests with @(

    UI.HeaderInfo : {
        TypeName       : 'Leave Request',
        TypeNamePlural : 'Leave Requests',
        Title          : { Value : employee.name },
        Description    : { Value : leaveType.name }
    },

    // Fields shown in the filter bar
    UI.SelectionFields : [ employee_ID, leaveType_ID, status, startDate ],

    // Newest request first
    UI.PresentationVariant : {
        SortOrder      : [{ $Type : 'Common.SortOrderType', Property : createdAt, Descending : true }],
        Visualizations : ['@UI.LineItem']
    },

    // Table columns on the list page (plus Approve and Reject in the toolbar)
    UI.LineItem : [
        { $Type : 'UI.DataField', Value : employee_ID },
        { $Type : 'UI.DataField', Value : leaveType_ID },
        { $Type : 'UI.DataField', Value : startDate },
        { $Type : 'UI.DataField', Value : endDate },
        { $Type : 'UI.DataField', Value : days },
        { $Type : 'UI.DataField', Value : status, Criticality : statusCriticality },
        { $Type : 'UI.DataField', Value : createdAt },
        { $Type : 'UI.DataFieldForAction', Action : 'HrService.approve', Label : 'Approve', Criticality : #Positive },
        { $Type : 'UI.DataFieldForAction', Action : 'HrService.reject',  Label : 'Reject',  Criticality : #Negative }
    ],

    // Buttons in the object page header
    UI.Identification : [
        { $Type : 'UI.DataFieldForAction', Action : 'HrService.approve', Label : 'Approve', Criticality : #Positive },
        { $Type : 'UI.DataFieldForAction', Action : 'HrService.reject',  Label : 'Reject',  Criticality : #Negative }
    ],

    // Sections on the object page
    UI.Facets : [
        { $Type : 'UI.ReferenceFacet', Label : 'Request details', Target : '@UI.FieldGroup#Details' },
        { $Type : 'UI.ReferenceFacet', Label : 'Decision',        Target : '@UI.FieldGroup#Decision' }
    ],

    UI.FieldGroup #Details : {
        Data : [
            { $Type : 'UI.DataField', Value : employee_ID },
            { $Type : 'UI.DataField', Value : leaveType_ID },
            { $Type : 'UI.DataField', Value : startDate },
            { $Type : 'UI.DataField', Value : endDate },
            { $Type : 'UI.DataField', Value : days },
            { $Type : 'UI.DataField', Value : reason },
            { $Type : 'UI.DataField', Value : createdAt }
        ]
    },

    UI.FieldGroup #Decision : {
        Data : [
            { $Type : 'UI.DataField', Value : status, Criticality : statusCriticality },
            { $Type : 'UI.DataField', Value : managerComment }
        ]
    }
);