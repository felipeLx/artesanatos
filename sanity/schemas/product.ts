export default {
    name: 'product',
    title: 'Product',
    type: 'document',
    fields: [
      {
        name: 'name',
        title: 'Name',
        type: 'string',
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
          source: 'name',
          maxLength: 96,
        },
      },
      {
        name: 'price',
        title: 'Price',
        type: 'number',
        validation: (Rule: { required: () => { (): any; new(): any; positive: { (): { (): any; new(): any; precision: { (arg0: number): any; new(): any; }; }; new(): any; }; }; }) => Rule.required().positive().precision(2)
      },
      {
        name: 'weight',
        title: 'Weight',
        type: 'number',
      },
      {
        name: 'width',
        title: 'Width',
        type: 'number',
      },
      {
        name: 'height',
        title: 'Height',
        type: 'number',
      },
      {
        name: 'material',
        title: 'Material',
        type: 'string',
      },
      {
        name: 'createdAt',
        title: 'Created At',
        type: 'datetime',
      },
      {
        name: 'description',
        title: 'Description',
        type: 'text'
      },
      {
        name: 'stripeProductId',
        title: 'Stripe Product Id',
        type: 'string'
      },
      {
        name: 'image',
        title: 'Image',
        type: 'array',
        of: [{type: 'image'}],
        options: {
          hotspot: true,
        },
      }
    ],
}