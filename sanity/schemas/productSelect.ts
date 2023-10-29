export default {
    title: 'Product select',
    name: 'productSelect',
    type: 'object',
    fields: [
      {
        title: 'Product',
        name: 'product',
        type: 'reference',
        to: [{type: 'product'}]
        // ✨ Sanity Studio magically displays a list of active products from the PIM via API integration ✨ 
        // Learn more at https://youtu.be/AaKfuhndEf8
      },
      {
        title: 'Quantity',
        name: 'quantity',
        type: 'number',
        validation: (Rule: { required: () => { (): any; new(): any; positive: { (): { (): any; new(): any; integer: { (): any; new(): any; }; }; new(): any; }; }; }) => Rule.required().positive().integer()
      },
    ]
  }