#!/usr/bin/env node

/**
 * ============================================================================
 * СКРИПТ ОБНОВЛЕНИЯ АНИМЕ-НОВОСТЕЙ
 * ============================================================================
 * 
 * Запускается GitHub Actions каждый день.
 * Получает данные из AniList API и сохраняет в JSON файл.
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   node update-anime-json.js              # Автоопределение сезона
 *   SEASON_OVERRIDE=spring node script.js  # Принудительный сезон
 * 
 * ВЫХОДНОЙ ФАЙЛ:
 *   data/current-season-anime.json
 * 
 * ============================================================================
 */

const fs = require( 'fs' );
const path = require( 'path' );

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

const CONFIG = {
	// AniList API (не блокируется, нет CORS)
	apiUrl: 'https://graphql.anilist.co',

	// Сколько аниме загружать
	maxAnime: 9,

	// Путь к выходному файлу
	outputPath: path.join( __dirname, '../../data/current-season-anime.json' ),

	// Минимальный рейтинг для включения в список
	minScore: 50, // AniList score (0-100)

	// Таймаут запроса
	timeout: 15000
};

// ============================================================================
// ОПРЕДЕЛЕНИЕ СЕЗОНА
// ============================================================================

function getCurrentSeason() {
	// Можно переопределить через переменную окружения
	if ( process.env.SEASON_OVERRIDE && process.env.SEASON_OVERRIDE !== 'auto' ) {
		return process.env.SEASON_OVERRIDE;
	}

	const month = new Date().getMonth(); // 0-11
	if ( month >= 0 && month <= 2 ) return 'winter';
	if ( month >= 3 && month <= 5 ) return 'spring';
	if ( month >= 6 && month <= 8 ) return 'summer';
	return 'fall';
}

function getSeasonDisplayName( season ) {
	const names = {
		'winter': '❄️ Зима',
		'spring': '🌸 Весна',
		'summer': '☀️ Лето',
		'fall': '🍂 Осень'
	};
	return names[season] || season;
}

// ============================================================================
// ЗАПРОС К ANILIST API
// ============================================================================

async function fetchAnimeData( season, year ) {
	console.log( `📡 Запрос к AniList API: сезон ${season} ${year}` );

	const query = `
        query ($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
            Page(perPage: $perPage) {
                media(
                    season: $season
                    seasonYear: $seasonYear
                    status: RELEASING
                    sort: POPULARITY_DESC
                    type: ANIME
                    countryOfOrigin: JP
                ) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    coverImage {
                        extraLarge
                        large
                        medium
                    }
                    bannerImage
                    format
                    episodes
                    duration
                    averageScore
                    popularity
                    meanScore
                    genres
                    studios {
                        nodes {
                            name
                        }
                    }
                    siteUrl
                    trailer {
                        id
                        site
                    }
                    season
                    seasonYear
                }
            }
        }
    `;

	const variables = {
		season: season.toUpperCase(),
		seasonYear: year,
		perPage: CONFIG.maxAnime
	};

	const controller = new AbortController();
	const timeout = setTimeout( () => controller.abort(), CONFIG.timeout );

	try {
		const response = await fetch( CONFIG.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify( { query, variables } ),
			signal: controller.signal
		} );

		if ( !response.ok ) {
			throw new Error( `HTTP ${response.status}: ${response.statusText}` );
		}

		const data = await response.json();

		if ( data.errors ) {
			console.error( '❌ GraphQL ошибки:', JSON.stringify( data.errors, null, 2 ) );
			throw new Error( 'GraphQL query failed' );
		}

		const media = data?.data?.Page?.media || [];
		console.log( `✅ Получено ${media.length} аниме из AniList` );

		return media;
	} finally {
		clearTimeout( timeout );
	}
}

// ============================================================================
// ОБРАБОТКА И ФОРМАТИРОВАНИЕ ДАННЫХ
// ============================================================================

function cleanDescription( text, maxLength = 200 ) {
	if ( !text ) return '';

	return text
		// Удаляем HTML теги
		.replace( /<[^>]*>/g, '' )
		// Удаляем Markdown ссылки
		.replace( /\[([^\]]*)\]\([^)]*\)/g, '$1' )
		// Удаляем специальные символы
		.replace( /&[^;]+;/g, '' )
		// Заменяем множественные пробелы и переносы строк
		.replace( /\s+/g, ' ' )
		// Обрезаем до нужной длины
		.substring( 0, maxLength )
		.trim() + ( text.length > maxLength ? '...' : '' );
}

function formatAnimeData( anime, index ) {
	const title = anime.title?.english || anime.title?.romaji || 'Без названия';
	const nativeTitle = anime.title?.native || '';
	const description = cleanDescription( anime.description, 200 );
	const score = ( anime.averageScore || anime.meanScore || 0 ) / 10;
	const episodes = anime.episodes
		? `${anime.episodes} эп.`
		: ( anime.duration ? `${anime.duration} мин.` : '? эп.' );

	// Фильтруем и переводим жанры
	const genreTranslations = {
		'Action': 'Экшен',
		'Adventure': 'Приключения',
		'Comedy': 'Комедия',
		'Drama': 'Драма',
		'Fantasy': 'Фэнтези',
		'Horror': 'Ужасы',
		'Mystery': 'Детектив',
		'Romance': 'Романтика',
		'Sci-Fi': 'Фантастика',
		'Slice of Life': 'Повседневность',
		'Sports': 'Спорт',
		'Supernatural': 'Сверхъестественное',
		'Thriller': 'Триллер',
		'Mecha': 'Меха',
		'Music': 'Музыка',
		'Psychological': 'Психология',
		'Historical': 'История',
		'Military': 'Военное',
		'School': 'Школа',
		'Isekai': 'Исекай',
		'Seinen': 'Сэйнэн',
		'Shounen': 'Сёнэн',
		'Shoujo': 'Сёдзё'
	};

	const genres = ( anime.genres || [] )
		.slice( 0, 4 )
		.map( g => genreTranslations[g] || g );

	const studios = ( anime.studios?.nodes || [] )
		.slice( 0, 2 )
		.map( s => s.name );

	// Форматируем тип аниме
	const formatMap = {
		'TV': '📺 Сериал',
		'TV_SHORT': '📺 Короткий сериал',
		'MOVIE': '🎬 Фильм',
		'OVA': '💿 OVA',
		'ONA': '🌐 ONA',
		'SPECIAL': '⭐ Спецвыпуск',
		'MUSIC': '🎵 Клип'
	};

	return {
		id: `anilist-${anime.id}`,
		title: title,
		nativeTitle: nativeTitle,
		excerpt: description || `${genres.slice( 0, 2 ).join( ' · ' )} · ${studios.join( ', ' ) || 'Новое аниме'}`,

		// Изображения в разных размерах
		image: anime.coverImage?.extraLarge || anime.coverImage?.large,
		imageMedium: anime.coverImage?.medium,
		bannerImage: anime.bannerImage,

		// Метаданные
		type: formatMap[anime.format] || '📺 Сериал',
		format: anime.format || 'TV',
		status: '▶️ Выходит',
		episodes: episodes,
		episodesCount: anime.episodes || null,
		duration: anime.duration || null,

		// Рейтинг и популярность
		score: Math.round( score * 10 ) / 10,
		scoreRaw: anime.averageScore || 0,
		popularity: anime.popularity || 0,

		// Жанры и студии
		genres: genres,
		studios: studios,

		// Ссылки
		source: 'AniList',
		sourceUrl: anime.siteUrl || `https://anilist.co/anime/${anime.id}`,
		trailerUrl: anime.trailer?.id && anime.trailer?.site === 'youtube'
			? `https://www.youtube.com/watch?v=${anime.trailer.id}`
			: null,

		// Сезон
		season: anime.season,
		seasonYear: anime.seasonYear,

		// Порядковый номер
		order: index + 1
	};
}

// ============================================================================
// СОХРАНЕНИЕ В JSON
// ============================================================================

function ensureDirectoryExists( filePath ) {
	const dir = path.dirname( filePath );
	if ( !fs.existsSync( dir ) ) {
		fs.mkdirSync( dir, { recursive: true } );
		console.log( `📁 Создана директория: ${dir}` );
	}
}

function saveToJson( data, outputPath ) {
	const jsonData = {
		// Метаданные файла
		meta: {
			lastUpdated: new Date().toISOString(),
			season: data.season,
			seasonName: getSeasonDisplayName( data.season ),
			year: data.year,
			totalAnime: data.anime.length,
			source: 'AniList API',
			generator: 'GitHub Actions (update-anime-news.yml)',
			version: '2.0'
		},
		// Данные аниме
		anime: data.anime,
		// Информация для отладки
		debug: {
			fetchDuration: data.fetchDuration,
			timestamp: Date.now(),
			nextUpdate: new Date( Date.now() + 24 * 60 * 60 * 1000 ).toISOString()
		}
	};

	ensureDirectoryExists( outputPath );
	fs.writeFileSync( outputPath, JSON.stringify( jsonData, null, 2 ), 'utf-8' );

	const fileSize = ( fs.statSync( outputPath ).size / 1024 ).toFixed( 1 );
	console.log( `💾 Сохранено в: ${outputPath}` );
	console.log( `📊 Размер файла: ${fileSize} KB` );
	console.log( `📊 Количество аниме: ${data.anime.length}` );
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================================

async function main() {
	console.log( '🚀 Запуск обновления аниме-новостей' );
	console.log( `📅 Дата: ${new Date().toISOString()}` );

	const season = getCurrentSeason();
	const year = new Date().getFullYear();

	console.log( `🎯 Сезон: ${getSeasonDisplayName( season )} ${year}` );

	const startTime = Date.now();

	try {
		// Загружаем данные из AniList
		const rawData = await fetchAnimeData( season, year );

		// Фильтруем по минимальному рейтингу
		const filteredData = rawData.filter(
			anime => ( anime.averageScore || anime.meanScore || 0 ) >= CONFIG.minScore
		);

		console.log( `🔍 После фильтрации (score ≥ ${CONFIG.minScore}): ${filteredData.length} аниме` );

		// Форматируем данные
		const formattedAnime = filteredData.map( ( anime, index ) =>
			formatAnimeData( anime, index )
		);

		// Если данных меньше чем нужно - логируем предупреждение
		if ( formattedAnime.length < CONFIG.maxAnime ) {
			console.warn( `⚠️ Получено только ${formattedAnime.length} из ${CONFIG.maxAnime} аниме` );
		}

		// Готовим финальный объект
		const output = {
			season: season,
			year: year,
			anime: formattedAnime.slice( 0, CONFIG.maxAnime ),
			fetchDuration: Date.now() - startTime
		};

		// Сохраняем в файл
		saveToJson( output, CONFIG.outputPath );

		// Выводим сводку
		console.log( '\n📋 Сводка загруженных аниме:' );
		formattedAnime.slice( 0, CONFIG.maxAnime ).forEach( ( anime, i ) => {
			console.log( `  ${i + 1}. ${anime.title} (★ ${anime.score})` );
			console.log( `     ${anime.genres.join( ' · ' )}` );
		} );

		console.log( `\n⏱️ Выполнено за ${Date.now() - startTime}ms` );
		console.log( '✅ Обновление успешно завершено!' );

	} catch ( error ) {
		console.error( '❌ Критическая ошибка:', error.message );
		console.error( error.stack );
		process.exit( 1 );
	}
}

// ============================================================================
// ЗАПУСК
// ============================================================================

// Обработка необработанных ошибок
process.on( 'unhandledRejection', ( error ) => {
	console.error( '❌ Необработанная ошибка:', error );
	process.exit( 1 );
} );

// Запуск
main();