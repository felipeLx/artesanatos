import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'

test('Users can create notes', async ({ page, login }) => {
	const user = await login()
	await page.goto(`/users/${user.username}/notes`)

	const newNote = createNote()
	await page.getByRole('link', { name: /New Note/i }).click()

	// fill in form and submit
	await page.getByRole('textbox', { name: /title/i }).fill(newNote.title)
	await page.getByRole('textbox', { name: /content/i }).fill(newNote.content)

	await page.getByRole('button', { name: /submit/i }).click()
	await expect(page).toHaveURL(new RegExp(`/users/${user.username}/products/.*`))
})

test('Users can edit notes', async ({ page, login }) => {
	const user = await login()

	const note = await prisma.product.create({
		select: { id: true },
		data: { ...createNote(), ownerId: user.id },
	})
	await page.goto(`/users/${user.username}/products/${note.id}`)

	// edit the note
	await page.getByRole('link', { name: 'Edit', exact: true }).click()
	const updatedProduct = createNote()
	await page.getByRole('textbox', { name: /title/i }).fill(updatedProduct.title)
	await page
		.getByRole('textbox', { name: /content/i })
		.fill(updatedProduct.content)
	await page.getByRole('button', { name: /submit/i }).click()

	await expect(page).toHaveURL(new RegExp(`/users/${user.username}/products/.*`))
	await expect(
		page.getByRole('heading', { name: updatedProduct.title }),
	).toBeVisible()
})

test('Users can delete notes', async ({ page, login }) => {
	const user = await login()

	const note = await prisma.product.create({
		select: { id: true },
		data: { ...createNote(), ownerId: user.id },
	})
	await page.goto(`/users/${user.username}/products/${note.id}`)

	// find links with href prefix
	const noteLinks = page
		.getByRole('main')
		.getByRole('list')
		.getByRole('listitem')
		.getByRole('link')
	const countBefore = await noteLinks.count()
	await page.getByRole('button', { name: /delete/i }).click()
	await expect(
		page.getByText('Your note has been deleted.', { exact: true }),
	).toBeVisible()
	await expect(page).toHaveURL(`/users/${user.username}/notes`)
	const countAfter = await noteLinks.count()
	expect(countAfter).toEqual(countBefore - 1)
})

function createNote() {
	return {
		title: faker.lorem.words(3),
		content: faker.lorem.paragraphs(3),
	}
}
