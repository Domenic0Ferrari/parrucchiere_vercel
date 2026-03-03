import { createClient } from '@supabase/supabase-js'

export default async function TestPage() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		return (
			<div style={{ padding: '20px' }}>
				<h1>Stato Connessione:</h1>
				<p style={{ color: 'red' }}>
					Variabili d’ambiente mancanti. Imposta
					{' '}
					<code>NEXT_PUBLIC_SUPABASE_URL</code>
					{' '}
					e
					{' '}
					<code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
					{' '}
					in
					{' '}
					<code>.env.local</code>
					.
				</p>
			</div>
		)
	}

	const supabase = createClient(supabaseUrl, supabaseAnonKey)

	const { error, count } = await supabase
		.from('test_connection')
		.select('id', { head: true, count: 'exact' })

	const relationMissing =
		error?.code === '42P01' ||
		(typeof error?.message === 'string' &&
			error.message.includes('relation') &&
			error.message.includes('test_connection'))

	return (
		<div style={{ padding: '20px' }}>
			<h1>Stato Connessione:</h1>
			{error && !relationMissing ? (
				<p style={{ color: 'red' }}>Errore: {error.message}</p>
			) : (
				<p style={{ color: 'green' }}>
					Connessione riuscita!
					{' '}
					{relationMissing
						? 'La tabella "test_connection" non esiste: creala per un test completo.'
						: `Righe trovate: ${count ?? 0}`}
				</p>
			)}
		</div>
	)
}
