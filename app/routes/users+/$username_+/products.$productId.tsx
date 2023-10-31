import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	type MetaFunction,
} from '@remix-run/react'
import { formatDistanceToNow } from 'date-fns'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	getProductImgSrc,
	invariantResponse,
	useIsPending,
} from '#app/utils/misc.tsx'
import {
	requireUserWithPermission,
	userHasPermission,
} from '#app/utils/permissions.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { type loader as productsLoader } from './products.tsx'

export async function loader({ params }: DataFunctionArgs) {
	const product = await prisma.product.findUnique({
		where: { id: params.productId },
		select: {
			id: true,
			title: true,
			description: true,
			ownerId: true,
			updatedAt: true,
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
	})

	invariantResponse(product, 'Não existe', { status: 404 })

	const date = new Date(product.updatedAt || new Date())
	const timeAgo = formatDistanceToNow(date)

	return json({
		product,
		timeAgo,
	})
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-product'),
	productId: z.string(),
})

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: DeleteFormSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	const { productId } = submission.value

	const product = await prisma.product.findFirst({
		select: { id: true, ownerId: true, owner: { select: { username: true } } },
		where: { id: productId },
	})
	invariantResponse(product, 'Não existe', { status: 404 })

	const isOwner = product.ownerId === userId
	await requireUserWithPermission(
		request,
		isOwner ? `delete:product:own` : `delete:product:any`,
	)

	await prisma.product.delete({ where: { id: product.id } })

	return redirectWithToast(`/users/${product.owner.username}/products`, {
		type: 'success',
		title: 'Successo',
		description: 'Seu produto foi apagado.',
	})
}

export default function ProductRoute() {
	const data = useLoaderData<typeof loader>()
	const user = useOptionalUser()
	const isOwner = user?.id === data.product.ownerId
	const canDelete = userHasPermission(
		user,
		isOwner ? `delete:product:own` : `delete:product:any`,
	)
	const displayBar = canDelete || isOwner

	return (
		<div className="absolute inset-0 flex flex-col px-10">
			<h2 className="mb-2 pt-12 text-h2 lg:mb-6">{data.product.title}</h2>
			<p className="whitespace-break-spaces text-sm md:text-lg">
				{data.product.description}
			</p>
			<div className={`${displayBar ? 'pb-24' : 'pb-12'} overflow-y-auto`}>
				<ul className="flex flex-wrap gap-5 py-5">
					{data.product.images.map(image => (
						<li key={image.id}>
							<a href={getProductImgSrc(image.id)}>
								<img
									src={getProductImgSrc(image.id)}
									alt={image.altText ?? ''}
									className="h-32 w-32 rounded-lg object-cover"
								/>
							</a>
						</li>
					))}
				</ul>
			</div>
			<div className='pb-12 flex gap-12'>
				<ul className="flex flex-wrap gap-5 py-5">
					{data.product.productVariation.map(prVariation => (
						<li key={prVariation.id}>
							<p className="text-sm md:text-lg">{prVariation.productStripeId}</p>
							<p className="text-sm md:text-lg">R$ {prVariation.price/100}</p>
							<p className="text-sm md:text-lg">{prVariation.quantity}</p>
							<p className="text-sm md:text-lg">{prVariation.weight/1000} kg</p>
							<p className="text-sm md:text-lg">{prVariation.width} cm</p>
						</li>
					))}
				</ul>
			</div>
			{displayBar ? (
				<div className={floatingToolbarClassName}>
					<span className="text-sm text-foreground/90 max-[524px]:hidden">
						<Icon name="clock" className="scale-125">
							{data.timeAgo} ago
						</Icon>
					</span>
					<div className="grid flex-1 grid-cols-2 justify-end gap-2 min-[525px]:flex md:gap-4">
						{canDelete ? <DeleteProduct id={data.product.id} /> : null}
						<Button
							asChild
							className="min-[525px]:max-md:aspect-square min-[525px]:max-md:px-0"
						>
							<Link to="edit">
								<Icon name="pencil-1" className="scale-125 max-md:scale-150">
									<span className="max-md:hidden">Editar</span>
								</Icon>
							</Link>
						</Button>
					</div>
				</div>
			) : null}
		</div>
	)
}

export function DeleteProduct({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-product',
		lastSubmission: actionData?.submission,
	})

	return (
		<Form method="POST" {...form.props}>
			<input type="hidden" name="productId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-product"
				variant="destructive"
				status={isPending ? 'pending' : actionData?.status ?? 'idle'}
				disabled={isPending}
				className="w-full max-md:aspect-square max-md:px-0"
			>
				<Icon name="trash" className="scale-125 max-md:scale-150">
					<span className="max-md:hidden">Apagar</span>
				</Icon>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}

export const meta: MetaFunction<
	typeof loader,
	{ 'routes/users+/$username_+/products': typeof productsLoader }
> = ({ data, params, matches }) => {
	const productsMatch = matches.find(
		m => m.id === 'routes/users+/$username_+/products',
	)
	const displayName = productsMatch?.data?.owner.name ?? params.username
	const productTitle = data?.product.title ?? 'Produto'
	const productContentsSummary =
		data && data.product.description.length > 100
			? data?.product.description.slice(0, 97) + '...'
			: 'Sem descrição'
	return [
		{ title: `${productTitle} | ${displayName}'s Produtos | Artesanatos da Zizi` },
		{
			name: 'description',
			content: productContentsSummary,
		},
	]
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>Você não tem permissão para fazer isso</p>,
				404: ({ params }) => (
					<p>Não há produto com esse id "{params.productId}"</p>
				),
			}}
		/>
	)
}
