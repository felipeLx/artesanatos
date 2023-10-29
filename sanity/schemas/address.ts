export default {
    name: 'address',
    title: 'Address',
    type: 'document',
    fields: [
        {
            name: 'first_name',
            title: 'First Name',
            type: 'string',
        },
        {
            name: 'last_name',
            title: 'Last Name',
            type: 'string',
        },
        {
            name: 'company',
            title: 'Company',
            type: 'string',
        },
        {
            name: 'address_1',
            title: 'Address 1',
            type: 'string',
        },
        {
            name: 'address_2',
            title: 'Address 2',
            type: 'string',
        },
        {
            name: 'city',
            title: 'City',
            type: 'string',
        },
        {
            name: 'country_code',
            title: 'Country Code',
            type: 'string',
        },
        {
            name: 'province',
            title: 'Province',
            type: 'string',
        },
        {
            name: 'postal_code',
            title: 'Postal Code',
            type: 'string',
        },
        {
            name: 'phone',
            title: 'Phone',
            type: 'string',
        },
        {
            name: 'created_at',
            title: 'Created At',
            type: 'datetime',
        },
        {
            name: 'customer_id',
            title: 'Customer Id',
            type: 'reference',
            to: [{type: 'customer'}],
        }
    ]
}