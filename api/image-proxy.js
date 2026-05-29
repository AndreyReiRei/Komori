/**
 * Vercel Edge Function — Прокси для изображений AniList
 * Работает на Vercel, обходит блокировки
 */
export const config = { runtime: 'edge' };

export default async function handler( request ) {
	try {
		const { searchParams } = new URL( request.url );
		const imageUrl = searchParams.get( 'url' );

		if ( !imageUrl ) {
			return new Response( JSON.stringify( { error: 'url required' } ), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			} );
		}

		// Загружаем оригинальное изображение
		const response = await fetch( imageUrl, {
			headers: { 'User-Agent': 'Komori-Proxy/1.0' }
		} );

		if ( !response.ok ) {
			return new Response( JSON.stringify( { error: 'image not found' } ), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			} );
		}

		const buffer = await response.arrayBuffer();
		const contentType = response.headers.get( 'content-type' ) || 'image/jpeg';

		return new Response( buffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
				'Access-Control-Allow-Origin': '*'
			}
		} );
	} catch ( error ) {
		return new Response( JSON.stringify( { error: 'proxy error' } ), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		} );
	}
}
