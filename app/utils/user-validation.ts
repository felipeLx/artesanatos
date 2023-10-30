import { z } from 'zod'

export const UsernameSchema = z
	.string({ required_error: 'Usuário é necessário' })
	.min(3, { message: 'Usuário é muito curto' })
	.max(20, { message: 'Usuário é muito longo' })
	.regex(/^[a-zA-Z0-9_]+$/, {
		message: 'Usuário somente por ter letras, números e underscores. ',
	})
	// users can type the username in any case, but we store it in lowercase
	.transform(value => value.toLowerCase())

export const PasswordSchema = z
	.string({ required_error: 'Senha é necessário' })
	.min(6, { message: 'Senha é muito curta' })
	.max(100, { message: 'Senha é muito longa' })
export const NameSchema = z
	.string({ required_error: 'Nome é necessário' })
	.min(3, { message: 'Nome é muito curto' })
	.max(40, { message: 'Nome é muito longo' })
export const EmailSchema = z
	.string({ required_error: 'Email é necessário' })
	.email({ message: 'Email é inválido' })
	// users can type the email in any case, but we store it in lowercase
	.transform(value => value.toLowerCase())

export const PasswordAndConfirmPasswordSchema = z
	.object({ password: PasswordSchema, confirmPassword: PasswordSchema })
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				path: ['confirmPassword'],
				code: 'custom',
				message: 'Deve ser a mesma senha',
			})
		}
	})
