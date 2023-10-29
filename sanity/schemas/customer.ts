export default {
    name: 'customer',
    title: 'Customer',
    type: 'document',
    fields: [
        {
            name: 'name',
            title: 'Name',
            type: 'string',
        },
        {
            name: 'email',
            title: 'Email',
            type: 'string',
        },
        {
            name: 'phone',
            title: 'Phone',
            type: 'string',
        },
        {
            name: 'billingAddressId',
            title: 'Billing Address Id',
            type: 'reference',
            to: [{type: 'address'}],
        },
        {
            name: 'passordHash',
            title: 'Password Hash',
            type: 'string',
        },
        {
            name: 'createdAt',
            title: 'Created At',
            type: 'datetime',
        },
        {
            name: 'has_account',
            title: 'Has Account?',
            type: 'boolean',
        }
    ]
}