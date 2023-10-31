import {
	conform,
	list,
	useFieldList,
	useFieldset,
	useForm,
	type FieldConfig,
} from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { createId as cuid } from '@paralleldrive/cuid2'
import { ProductVariation, type Product, type ProductImage } from '@prisma/client'
import {
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
	json,
	unstable_parseMultipartFormData as parseMultipartFormData,
	redirect,
	type DataFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Form, useFetcher } from '@remix-run/react'
import { useRef, useState } from 'react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList, Field, TextareaField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getProductImgSrc } from '#app/utils/misc.tsx'

const titleMinLength = 1
const titleMaxLength = 100
const descriptionMinLength = 1
const descriptionMaxLength = 10000

const MAX_UPLOAD_SIZE = 1024 * 1024 * 3 // 3MB

const ProductVariationFieldsetSchema = z.object({
	id: z.string().optional(),
	productStripeId: z.string().optional(),
	price: z.number().optional(),
	quantity: z.number().optional(),
	weight: z.number().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
})
const ImageFieldsetSchema = z.object({
	id: z.string().optional(),
	file: z
		.instanceof(File)
		.optional()
		.refine(file => {
			return !file || file.size <= MAX_UPLOAD_SIZE
		}, 'Arquivo deve ser menor que 3MB'),
	altText: z.string().optional(),
})

type ImageFieldset = z.infer<typeof ImageFieldsetSchema>

function imageHasFile(
	image: ImageFieldset,
): image is ImageFieldset & { file: NonNullable<ImageFieldset['file']> } {
	return Boolean(image.file?.size && image.file?.size > 0)
}

function imageHasId(
	image: ImageFieldset,
): image is ImageFieldset & { id: NonNullable<ImageFieldset['id']> } {
	return image.id != null
}

const ProductEditorSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(titleMinLength).max(titleMaxLength),
	description: z.string().min(descriptionMinLength).max(descriptionMaxLength),
	images: z.array(ImageFieldsetSchema).max(5).optional(),
})

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)

	const formData = await parseMultipartFormData(
		request,
		createMemoryUploadHandler({ maxPartSize: MAX_UPLOAD_SIZE }),
	)

	const submission = await parse(formData, {
		schema: ProductEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const product = await prisma.product.findUnique({
				select: { id: true },
				where: { id: data.id, ownerId: userId },
			})
			if (!product) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Produto não encontrado',
				})
			}
		}).transform(async ({ images = [], ...data }) => {
			return {
				...data,
				imageUpdates: await Promise.all(
					images.filter(imageHasId).map(async i => {
						if (imageHasFile(i)) {
							return {
								id: i.id,
								altText: i.altText,
								descriptionType: i.file.type,
								blob: Buffer.from(await i.file.arrayBuffer()),
							}
						} else {
							return {
								id: i.id,
								altText: i.altText,
							}
						}
					}),
				),
				newImages: await Promise.all(
					images
						.filter(imageHasFile)
						.filter(i => !i.id)
						.map(async image => {
							return {
								altText: image.altText,
								descriptionType: image.file.type,
								blob: Buffer.from(await image.file.arrayBuffer()),
							}
						}),
				),
			}
		}),
		async: true,
	})

	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}

	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	const {
		id: productId,
		title,
		description,
		productVariation = [],
		newProductVariation = [],
		imageUpdates = [],
		newImages = [],
	} = submission.value

	const updatedProduct = await prisma.product.upsert({
		select: { id: true, owner: { select: { username: true } } },
		where: { id: productId ?? '__new_product__' },
		create: {
			ownerId: userId,
			title,
			description,
			productVariation: { create: newProductVariation },
			images: { create: newImages },
		},
		update: {
			title,
			description,
			productVariation: {
				deleteMany: { id: { notIn: productVariation.map(i => i.id) } },
				updateMany: productVariation.map(updates => ({
					where: { id: updates.id },
					data: { ...updates, id: updates.id },
				})),
				create: newProductVariation,
			},
			images: {
				deleteMany: { id: { notIn: imageUpdates.map(i => i.id) } },
				updateMany: imageUpdates.map(updates => ({
					where: { id: updates.id },
					data: { ...updates, id: updates.blob ? cuid() : updates.id },
				})),
				create: newImages,
			},
		},
	})

	return redirect(
		`/users/${updatedProduct.owner.username}/products/${updatedProduct.id}`,
	)
}

export function ProductEditor({
	product,
}: {
	product?: SerializeFrom<
		Pick<Product, 'id' | 'title' | 'description'> & {
			images: Array<Pick<ProductImage, 'id' | 'altText'>>
		} & {
			productVariation: Array<
				Pick<ProductVariation, 'id' | 'productStripeId' | 'price' | 'quantity' | 'weight' | 'width' | 'height'>
			>
		}
	>
}) {
	const productFetcher = useFetcher<typeof action>()
	const isPending = productFetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: 'product-editor',
		constraint: getFieldsetConstraint(ProductEditorSchema),
		lastSubmission: productFetcher.data?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: ProductEditorSchema })
		},
		defaultValue: {
			title: product?.title ?? '',
			description: product?.description ?? '',
			productVariation: product?.productVariation ?? [{}],
			images: product?.images ?? [{}],
		},
	})
	const imageList = useFieldList(form.ref, fields.images)
	const productVariationList = useFieldList(form.ref, fields.productVariation)
	
	return (
		<div className="absolute inset-0">
			<Form
				method="POST"
				className="flex h-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden px-10 pb-28 pt-12"
				{...form.props}
				encType="multipart/form-data"
			>
				{/*
					This hidden submit button is here to ensure that when the user hits
					"enter" on an input field, the primary form function is submitted
					rather than the first button in the form (which is delete/add image).
				*/}
				<button type="submit" className="hidden" />
				{product ? <input type="hidden" name="id" value={product.id} /> : null}
				<div className="flex flex-col gap-1">
					<Field
						labelProps={{ children: 'Nome do Produto' }}
						inputProps={{
							autoFocus: true,
							...conform.input(fields.title, { ariaAttributes: true }),
						}}
						errors={fields.title.errors}
					/>
					<TextareaField
						labelProps={{ children: 'Descrição' }}
						textareaProps={{
							...conform.textarea(fields.description, { ariaAttributes: true }),
						}}
						errors={fields.description.errors}
					/>
					<div>
						<Label>Imagens</Label>
						<ul className="flex flex-col gap-4">
							{imageList.map((image, index) => (
								<li
									key={image.key}
									className="relative border-b-2 border-muted-foreground"
								>
									<button
										className="absolute right-0 top-0 text-foreground-destructive"
										{...list.remove(fields.images.name, { index })}
									>
										<span aria-hidden>
											<Icon name="cross-1" />
										</span>{' '}
										<span className="sr-only">Remover imagem {index + 1}</span>
									</button>
									<ImageChooser config={image} />
								</li>
							))}
						</ul>
					</div>
					<Button
						className="mt-3"
						{...list.append(fields.images.name, { defaultValue: {} })}
					>
						<span aria-hidden>
							<Icon name="plus">Imagem</Icon>
						</span>{' '}
						<span className="sr-only">Adicionar Imagem</span>
					</Button>
					<div>
						<Label>Variações</Label>
						<ul className="flex flex-col gap-4">
							{imageList.map((productVariation, index) => (
								<li
									key={productVariation.key}
									className="relative border-b-2 border-muted-foreground"
								>
									<button
										className="absolute right-0 top-0 text-foreground-destructive"
										{...list.remove(fields.productVariation.productStripeId, { index })}
									>
										<span aria-hidden>
											<Icon name="cross-1" />
										</span>{' '}
										<span className="sr-only">Remover imagem {index + 1}</span>
									</button>
									<ProductVariationConfig config={productVariation} />
								</li>
							))}
						</ul>
					</div>
					<Button
						className="mt-3"
						{...list.append(fields.productVariation.productStripeId, { defaultValue: {} })}
					>
						<span aria-hidden>
							<Icon name="plus">Variação</Icon>
						</span>{' '}
						<span className="sr-only">Adicionar Variação</span>
					</Button>
				</div>
				
				<ErrorList id={form.errorId} errors={form.errors} />
			</Form>
			<div className={floatingToolbarClassName}>
				<Button form={form.id} variant="destructive" type="reset">
					Reiniciar
				</Button>
				<StatusButton
					form={form.id}
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : 'idle'}
				>
					Enviar
				</StatusButton>
			</div>
		</div>
	)
}

function ProductVariationConfig(config: FieldConfig<z.infer<typeof ProductVariationFieldsetSchema>>) {
	const ref = useRef<HTMLFieldSetElement>(null)
	const fields = useFieldset(ref, config)
	const existingProductVariation = Boolean(fields.id.defaultValue)
	const [productStripeId, setProductStripeId] = useState(fields.productStripeId.defaultValue || '')
	const [price, setPrice] = useState(fields.price.defaultValue || '')
	const [quantity, setQuantity] = useState(fields.quantity.defaultValue || '')
	const [weight, setWeight] = useState(fields.weight.defaultValue || '')
	const [width, setWidth] = useState(fields.width.defaultValue || '')
	const [height, setHeight] = useState(fields.height.defaultValue || '')

	return (
		<fieldset
			ref={ref}
			aria-invalid={Boolean(config.errors?.length) || undefined}
			aria-describedby={config.errors?.length ? config.errorId : undefined}
		>
			<div className="flex gap-3">
				<div className="w-32">
					<div className="relative h-32 w-32">
						<label
							htmlFor={fields.file.id}
							className={cn('group absolute h-32 w-32 rounded-lg', {
								'bg-accent opacity-40 focus-within:opacity-100 hover:opacity-100':
									!previewProductVariation,
								'cursor-pointer focus-within:ring-4': !existingProductVariation,
							})}
						>
							{previewProductVariation ? (
								<div className="relative">
									<img
										src={previewImage}
										alt={altText ?? ''}
										className="h-32 w-32 rounded-lg object-cover"
									/>
									{existingImage ? null : (
										<div className="pointer-events-none absolute -right-0.5 -top-0.5 rotate-12 rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground shadow-md">
											new
										</div>
									)}
								</div>
							) : (
								<div className="flex h-32 w-32 items-center justify-center rounded-lg border border-muted-foreground text-4xl text-muted-foreground">
									<Icon name="plus" />
								</div>
							)}
							{existingImage ? (
								<input
									{...conform.input(fields.id, {
										type: 'hidden',
										ariaAttributes: true,
									})}
								/>
							) : null}
							<input
								aria-label="Image"
								className="absolute left-0 top-0 z-0 h-32 w-32 cursor-pointer opacity-0"
								onChange={event => {
									const file = event.target.files?.[0]

									if (file) {
										const reader = new FileReader()
										reader.onloadend = () => {
											setPreviewImage(reader.result as string)
										}
										reader.readAsDataURL(file)
									} else {
										setPreviewImage(null)
									}
								}}
								accept="image/*"
								{...conform.input(fields.file, {
									type: 'file',
									ariaAttributes: true,
								})}
							/>
						</label>
					</div>
					<div className="min-h-[32px] px-4 pb-3 pt-1">
						<ErrorList id={fields.file.errorId} errors={fields.file.errors} />
					</div>
				</div>
				<div className="flex-1">
					<Label htmlFor={fields.altText.id}>Texto Alt</Label>
					<Textarea
						onChange={e => setAltText(e.currentTarget.value)}
						{...conform.textarea(fields.altText, { ariaAttributes: true })}
					/>
					<div className="min-h-[32px] px-4 pb-3 pt-1">
						<ErrorList
							id={fields.altText.errorId}
							errors={fields.altText.errors}
						/>
					</div>
				</div>
			</div>
			<div className="min-h-[32px] px-4 pb-3 pt-1">
				<ErrorList id={config.errorId} errors={config.errors} />
			</div>
		</fieldset>
	)
}

function ImageChooser({
	config,
}: {
	config: FieldConfig<z.infer<typeof ImageFieldsetSchema>>
}) {
	const ref = useRef<HTMLFieldSetElement>(null)
	const fields = useFieldset(ref, config)
	const existingImage = Boolean(fields.id.defaultValue)
	const [previewImage, setPreviewImage] = useState<string | null>(
		fields.id.defaultValue ? getProductImgSrc(fields.id.defaultValue) : null,
	)
	const [altText, setAltText] = useState(fields.altText.defaultValue ?? '')

	return (
		<fieldset
			ref={ref}
			aria-invalid={Boolean(config.errors?.length) || undefined}
			aria-describedby={config.errors?.length ? config.errorId : undefined}
		>
			<div className="flex gap-3">
				<div className="w-32">
					<div className="relative h-32 w-32">
						<label
							htmlFor={fields.file.id}
							className={cn('group absolute h-32 w-32 rounded-lg', {
								'bg-accent opacity-40 focus-within:opacity-100 hover:opacity-100':
									!previewImage,
								'cursor-pointer focus-within:ring-4': !existingImage,
							})}
						>
							{previewImage ? (
								<div className="relative">
									<img
										src={previewImage}
										alt={altText ?? ''}
										className="h-32 w-32 rounded-lg object-cover"
									/>
									{existingImage ? null : (
										<div className="pointer-events-none absolute -right-0.5 -top-0.5 rotate-12 rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground shadow-md">
											new
										</div>
									)}
								</div>
							) : (
								<div className="flex h-32 w-32 items-center justify-center rounded-lg border border-muted-foreground text-4xl text-muted-foreground">
									<Icon name="plus" />
								</div>
							)}
							{existingImage ? (
								<input
									{...conform.input(fields.id, {
										type: 'hidden',
										ariaAttributes: true,
									})}
								/>
							) : null}
							<input
								aria-label="Image"
								className="absolute left-0 top-0 z-0 h-32 w-32 cursor-pointer opacity-0"
								onChange={event => {
									const file = event.target.files?.[0]

									if (file) {
										const reader = new FileReader()
										reader.onloadend = () => {
											setPreviewImage(reader.result as string)
										}
										reader.readAsDataURL(file)
									} else {
										setPreviewImage(null)
									}
								}}
								accept="image/*"
								{...conform.input(fields.file, {
									type: 'file',
									ariaAttributes: true,
								})}
							/>
						</label>
					</div>
					<div className="min-h-[32px] px-4 pb-3 pt-1">
						<ErrorList id={fields.file.errorId} errors={fields.file.errors} />
					</div>
				</div>
				<div className="flex-1">
					<Label htmlFor={fields.altText.id}>Texto Alt</Label>
					<Textarea
						onChange={e => setAltText(e.currentTarget.value)}
						{...conform.textarea(fields.altText, { ariaAttributes: true })}
					/>
					<div className="min-h-[32px] px-4 pb-3 pt-1">
						<ErrorList
							id={fields.altText.errorId}
							errors={fields.altText.errors}
						/>
					</div>
				</div>
			</div>
			<div className="min-h-[32px] px-4 pb-3 pt-1">
				<ErrorList id={config.errorId} errors={config.errors} />
			</div>
		</fieldset>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>Não existe produto com essa id "{params.productId}"</p>
				),
			}}
		/>
	)
}
