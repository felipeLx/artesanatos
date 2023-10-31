import { type MetaFunction } from '@remix-run/react'
import { type loader as productsLoader } from './products.tsx'

export default function ProductsIndexRoute() {
	return (
		<div className="container pt-12">
			<p className="text-body-md">Seleciona um produto</p>
		</div>
	)
}

export const meta: MetaFunction<
	null,
	{ 'routes/users+/$username_+/products': typeof productsLoader }
> = ({ params, matches }) => {
	const productsMatch = matches.find(
		m => m.id === 'routes/users+/$username_+/products',
	)
	const displayName = productsMatch?.data?.owner.name ?? params.username
	const productCount = productsMatch?.data?.owner.products.length ?? 0
	const productsText = productCount === 1 ? 'produto' : 'produtos'
	return [
		{ title: `${displayName}'s Produtos | Artesanatos da Zizi` },
		{
			name: 'description',
			description: `Checkout ${displayName}'s ${productCount} ${productsText} na Artesanatos da Zizi`,
		},
	]
}
