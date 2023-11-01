// import { faker } from '@faker-js/faker'
import { promiseHash } from 'remix-utils/promise'
import { prisma } from '#app/utils/db.server.ts'
import {
	cleanupDb,
	createPassword,
	img,
} from '#tests/db-utils.ts'
// import { insertGitHubUser } from '#tests/mocks/github.ts'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await cleanupDb(prisma)
	console.timeEnd('🧹 Cleaned up the database...')
	console.time('🔑 Created status...')
    const swapPaymentStatus = ['not_paid', 'awaiting', 'captured', 'confirmed', 'canceled', 'difference_refunded', 'partially_refunded', 'refunded', 'requires_action']
    const swapFulfillmentStatus = ['not_fulfilled', 'fulfilled', 'canceled', 'requires_action']
    const orderPaymentStatus = ['authorized', 'pending', 'requires_more', 'error', 'canceled']
    const orderFulfillmentStatus = ['not_fulfilled', 'partially_fulfilled', 'fulfilled', 'canceled', 'requires_action']
    const orderStatus = ['pending', 'completed', 'archived', 'canceled', 'requires_action']

    for (const status of swapPaymentStatus) {
        await prisma.swapPaymentStatus.create({ data: { status } })
    }
    for (const status of swapFulfillmentStatus) {
        await prisma.swapFulfillmentStatus.create({ data: { status } })
    }
    for (const status of orderPaymentStatus) {
        await prisma.orderPaymentStatus.create({ data: { status } })
    }
    for (const status of orderFulfillmentStatus) {
        await prisma.orderFulfillmentStatus.create({ data: { status } })
    }
    for (const status of orderStatus) {
        await prisma.orderStatus.create({ data: { status } })
    }
    console.timeEnd('🔑 Created status...')

	console.time('🔑 Created permissions...')
    
    const entities = ['user', 'note']
	const actions = ['create', 'read', 'update', 'delete']
	const accesses = ['own', 'any'] as const
	for (const entity of entities) {
		for (const action of actions) {
			for (const access of accesses) {
				await prisma.permission.create({ data: { entity, action, access } })
			}
		}
	}
	console.timeEnd('🔑 Created permissions...')

	console.time('👑 Created roles...')
	await prisma.role.create({
		data: {
			name: 'admin',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'any' },
				}),
			},
		},
	})
	await prisma.role.create({
		data: {
			name: 'user',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'own' },
				}),
			},
		},
	})
	console.timeEnd('👑 Created roles...')

	if (process.env.MINIMAL_SEED) {
		console.log('👍 Minimal seed complete')
		console.timeEnd(`🌱 Database has been seeded`)
		return
	}

	console.time(`🐨 Created Options`)
	const productOptions = ['artist', 'catholic', 'lotus', 'flower', 'mirrow', 'doors', 'other']
	
    for (const name of productOptions) {
		await prisma.optionsVariation.create({ 
			data: { 
				name,
			}
		})
    }

	const productColors = ['white','black','yellow','blue','red','green','purple','pink','orange','gray','brown','gold','silver','other']
	const productHexColors = ['#FFFFFF','#000000','#FFFF00','#0000FF','#FF0000','#008000','#800080','#FFC0CB','#FFA500','#808080','#A52A2A','#FFD700','#C0C0C0','other']

    for (const name of productColors) {
		for (const hexCode of productHexColors) {
			await prisma.colorVariation.create({ data: { name, hexCode } })
		}
    }
	console.timeEnd(`👤 Created Options`)

	console.time(`🐨 Created admin user "felps77"`)

	// const githubUser = await insertGitHubUser('MOCK_CODE_GITHUB_KODY')

	const toUploadImages = await promiseHash({
		kodyUser: img({ filepath: './tests/fixtures/images/user/kody.png' }),
		redMandala: img({
			altText: 'Mandalas com tonalidade em vermelho',
			filepath: './tests/fixtures/images/mandalas/13.png',
		}),
        blueAndWhiteMandala: img({
			altText: 'Mandalas com tonalidade em azul e branco',
			filepath: './tests/fixtures/images/mandalas/1.png',
		}),
        lotusMandala: img({
			altText: 'Mandalas com a flor de lotus',
			filepath: './tests/fixtures/images/mandalas/2.png',
		}),
		greenBlueMandala: img({
			altText: 'Mandalas com tonalidade em azul e verde',
			filepath: './tests/fixtures/images/mandalas/3.png',
		}),
        blueGreenMandala: img({
			altText: 'Mandalas com tonalidade em azul e verde',
			filepath: './tests/fixtures/images/mandalas/4.png',
		}),
		catholicMandala: img({
			altText: 'Mandalas com simbologia católica',
			filepath: './tests/fixtures/images/mandalas/5.png',
		}),
        flowersMandala: img({
			altText: 'Mandalas com temas florais',
			filepath: './tests/fixtures/images/mandalas/6.png',
		}),
        blackWhiteMandala: img({
			altText: 'Mandalas com tonalidade em branco e preto',
			filepath: './tests/fixtures/images/mandalas/7.png',
		}),
        pastelMandala: img({
			altText: 'Mandalas com tonalidades em cores pastel',
			filepath: './tests/fixtures/images/mandalas/15.png',
		}),
        mirrowBlueMandala: img({
			altText: 'Mandalas com borda azul e espelho',
			filepath: './tests/fixtures/images/mandalas/17.png',
		}),
        mirrowGreenMandala: img({
			altText: 'Mandalas com borda verde e espelho',
			filepath: './tests/fixtures/images/mandalas/18.png',
		}),
        eyesMandala: img({
			altText: 'Mandalas de porta',
			filepath: './tests/fixtures/images/mandalas/19.png',
		}),
        eyesGroupMandala: img({
			altText: 'Grupo de mandalas de porta',
			filepath: './tests/fixtures/images/mandalas/20.png',
		}),
	})  

	await prisma.user.create({
		select: { id: true },
		data: {
			email: 'felipealisbo@outlook.com',
			username: 'felps77',
			name: 'Felipe',
			image: { create: toUploadImages.kodyUser },
			password: { create: createPassword('18072016') },
			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
			products: {
				create: [
					{
						id: 'd27a197e',
						title: 'Mandalas 60 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.redMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a200e',
                                    productStripeId: 'prod_OtLSfBPEgGjs95',
                                    price: 25080,
                                    quantity: 1,
									weight: 1500,
									height: 3,
									width: 60,
                                },
                            ],
                        }
					},
					{
						id: '414f0c09',
						title: 'Mandalas 12 cm',
						description:
							'Técnica de pontilhismo em pdf. Mandalas com tonalidades em tons de vermelho podendo adicionar outras cores.',
						images: { create: [toUploadImages.pastelMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a201e',
                                    productStripeId: 'prod_OtLx60wue0ScJ6',
                                    price: 6080,
                                    quantity: 1,
									weight: 100,
									height: 3,
									width: 12,
                                },
                            ],
                        }
					},
					{
						id: '260366b1',
						title: 'Mandalas 55 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.blackWhiteMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a202e',
                                    productStripeId: 'prod_OtLWjBkh9lRS75',
                                    price: 24080,
                                    quantity: 1,
									weight: 1300,
									height: 3,
									width: 55,
                                },
                            ],
                        }
					},
					{
						id: 'bb79cf45',
						title: 'Mandalas 50 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.blueAndWhiteMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a203e',
                                    productStripeId: 'prod_OtLZcNMfYvnBLA',
                                    price: 22080,
                                    quantity: 1,
									weight: 1100,
									height: 3,
									width: 50,
                                },
                            ],
                        }
					},
					{
						id: '9f4308be',
						title: 'Mandalas 45 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.blueGreenMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a204e',
                                    productStripeId: 'prod_OtLcdkNLBOvLGU',
                                    price: 21080,
                                    quantity: 1,
									weight: 1000,
									height: 3,
									width: 45,
                                },
                            ],
                        }
					},
					{
						id: '306021fb',
						title: 'Mandalas 40 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.catholicMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a205e',
                                    productStripeId: 'prod_OtLirOc4OimR0w',
                                    price: 18080,
                                    quantity: 1,
									weight: 900,
									height: 3,
									width: 40,
                                },
                            ],
                        }
					},
					{
						id: '16d4912a',
						title: 'Mandalas 35 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.flowersMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a206e',
                                    productStripeId: 'prod_OtLmJ4obuHm1th',
                                    price: 15080,
                                    quantity: 1,
									weight: 800,
									height: 3,
									width: 35,
                                },
                            ],
                        }
					},
					{
						id: '3199199e',
						title: 'Mandalas 30 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.greenBlueMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a207e',
                                    productStripeId: 'prod_OtLpmbqOq0uAuK',
                                    price: 12080,
                                    quantity: 1,
									weight: 700,
									height: 3,
									width: 30,
                                },
                            ],
                        }
					},
					{
						id: '2030ffd3',
						title: 'Mandalas 25 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.lotusMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a208e',
                                    productStripeId: 'prod_OtLsqehyQMGSm9',
                                    price: 10080,
                                    quantity: 1,
									weight: 600,
									height: 3,
									width: 25,
                                },
                            ],
                        }
					},
					{
						id: 'f375a804',
						title: 'Mandalas 20 cm',
						description:
							'Técnica de pontilhismo em pdf. Escolha até 4 cores e outras opções para personalizar sua Mandala. Artistas do Espírito Santo / Brasil. Entrega em até 30 dias.',
						images: { create: [toUploadImages.lotusMandala] },
                        productVariation: {
                            create: [
                                {
                                    id: 'd27a209e',
                                    productStripeId: 'prod_OtLt3Lk9szv1ti',
                                    price: 8080,
                                    quantity: 1,
									weight: 500,
									height: 3,
									width: 20,
                                },
                            ],
                        }
					},
				],
			},
		},
	})
	console.timeEnd(`Created admin user "felps77"`)

	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})