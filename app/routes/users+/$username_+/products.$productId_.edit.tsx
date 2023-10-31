import { json, type DataFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { ProductEditor, action } from './__product-editor.tsx'

export { action }

export async function loader({ params, request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const product = await prisma.product.findFirst({
		select: {
			id: true,
			title: true,
			description: true,
			images: {
				select: {
					id: true,
					altText: true,
				},
			},
			productVariation: {
				select: {
					id: true,
					productStripeId: true,
					price: true,
					quantity: true,
					weight: true,
					width: true,
					height: true,
				},
			}
		},
		where: {
			id: params.productId,
			ownerId: userId,
		},
	})
	invariantResponse(product, 'Não existe', { status: 404 })
	return json({ product: product })
}

export default function ProductEdit() {
	const data = useLoaderData<typeof loader>()

	return <ProductEditor product={data.product} />
}
