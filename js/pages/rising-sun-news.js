/**
 * ============================================================================
 * RISING SUN NEWS - АНИМЕ ЭТОГО СЕЗОНА (ИСПРАВЛЕННАЯ ВЕРСИЯ)
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Загружает 9 актуальных аниме текущего сезона
 * - Использует каскадную систему источников (Shikimori → Jikan → AniList → Локально)
 * - Отображает в сетке 3x3 на главной странице
 * 
 * ИСТОЧНИКИ ДАННЫХ:
 * 1. Shikimori API — русскоязычный каталог (ОСНОВНОЙ, может блокировать CORS)
 * 2. Jikan API v4 — /seasons/now (РЕЗЕРВ 1, имеет лимиты)
 * 3. AniList API — GraphQL (РЕЗЕРВ 2, самый надежный)
 * 4. Локальный список — (ГАРАНТИРОВАННЫЙ РЕЗЕРВ)
 * 
 * ОСОБЕННОСТИ:
 * - Каскадная загрузка: если один источник не сработал, пробуется следующий
 * - Защита от битых изображений с системой заглушек
 * - Автоматическое определение текущего сезона
 * - Очистка HTML-тегов от описаний
 * - Система уведомлений для пользователя
 * 
 * ============================================================================
 */

class RisingSunNews {
	constructor() {
		/** @type {Array} Массив загруженных аниме */
		this.animeList = [];

		/** @type {boolean} Флаг процесса загрузки */
		this.isLoading = false;

		/** @type {string} Текущий сезон (winter/spring/summer/fall) */
		this.currentSeason = this._getCurrentSeason();

		/** @type {number} Текущий год */
		this.currentYear = new Date().getFullYear();

		/** @type {number} Максимальное количество аниме для отображения */
		this.maxAnimeCount = 9;

		// ============================================================
		// НАСТРОЙКИ API
		// ============================================================

		/** @type {number} Таймаут запроса в миллисекундах */
		this.apiTimeout = 15000;

		/** @type {Object} Заголовки для API запросов */
		this.apiHeaders = {
			'Accept': 'application/json',
			'User-Agent': 'Komori-Store/2.0 (anime news widget)'
		};

		// ============================================================
		// ИСТОЧНИК 1: SHIKIMORI API (ОСНОВНОЙ)
		// ============================================================
		this.shikimoriApiUrl = 'https://shikimori.one/api/animes';
		this.shikimoriParams = {
			order: 'popularity',
			limit: 9,
			status: 'ongoing',
			censored: 'false'
		};

		// ============================================================
		// ИСТОЧНИК 2: JIKAN API v4 (РЕЗЕРВ 1)
		// ============================================================
		this.jikanApiUrl = `https://api.jikan.moe/v4/seasons/${this.currentYear}/${this.currentSeason}`;

		// ============================================================
		// ИСТОЧНИК 3: ANILIST API (РЕЗЕРВ 2 - САМЫЙ НАДЕЖНЫЙ)
		// ============================================================
		this.anilistGraphqlUrl = 'https://graphql.anilist.co';
		this.anilistQuery = `
            query ($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
                Page(perPage: $perPage) {
                    media(
                        season: $season, 
                        seasonYear: $seasonYear, 
                        status: RELEASING, 
                        sort: POPULARITY_DESC, 
                        type: ANIME
                    ) {
                        id
                        title { romaji english native }
                        description
                        coverImage { large extraLarge }
                        format
                        status
                        episodes
                        averageScore
                        genres
                        siteUrl
                    }
                }
            }
        `;

		// ============================================================
		// ЛОКАЛИЗАЦИЯ
		// ============================================================
		this.seasonNames = {
			'winter': '❄️ Зима',
			'spring': '🌸 Весна',
			'summer': '☀️ Лето',
			'fall': '🍂 Осень'
		};

		this.seasonMap = {
			'winter': 'WINTER',
			'spring': 'SPRING',
			'summer': 'SUMMER',
			'fall': 'FALL'
		};

		this.formatNames = {
			'TV': '📺 Сериал',
			'TV_SHORT': '📺 Короткий сериал',
			'MOVIE': '🎬 Фильм',
			'OVA': '💿 OVA',
			'ONA': '🌐 ONA',
			'SPECIAL': '⭐ Спецвыпуск',
			'MUSIC': '🎵 Клип'
		};

		this.statusNames = {
			'ongoing': '▶️ Выходит',
			'released': '✅ Завершён',
			'anons': '📅 Анонс',
			'airing': '▶️ Выходит',
			'complete': '✅ Завершён',
			'upcoming': '📅 Скоро',
			'RELEASING': '▶️ Выходит',
			'FINISHED': '✅ Завершён',
			'NOT_YET_RELEASED': '📅 Скоро'
		};

		// ============================================================
		// ЗАГЛУШКИ
		// ============================================================

		/** @type {string} Путь к локальной заглушке для изображений */
		this.fallbackImage = '/image/404.jpg';

		/** @type {Array} Маркеры заглушек API (битые изображения) */
		this.apiPlaceholderMarkers = [
			'apple-touch-icon',
			'favicon',
			'missing',
			'no-image',
			'noimage',
			'no_image',
			'no_picture',
			'no_photo',
			'placeholder',
			'default.jpg',
			'default.png',
			'questionmark',
			'na_series'
		];

		// ============================================================
		// ЛОКАЛЬНЫЙ РЕЗЕРВ (100% ГАРАНТИЯ)
		// Обновлять каждый сезон!
		// ============================================================
		this.fallbackAnime = this._getFallbackAnime();

		// ============================================================
		// ЗАПУСК
		// ============================================================
		this.init();
	}

	// ====================================================================
	// ОПРЕДЕЛЕНИЕ СЕЗОНА
	// ====================================================================

	/**
	 * Определяет текущий сезон по месяцу
	 * @returns {string} winter | spring | summer | fall
	 * @private
	 */
	_getCurrentSeason() {
		const month = new Date().getMonth(); // 0-11
		if ( month >= 0 && month <= 2 ) return 'winter';  // Янв-Мар
		if ( month >= 3 && month <= 5 ) return 'spring';   // Апр-Июн
		if ( month >= 6 && month <= 8 ) return 'summer';   // Июл-Сен
		return 'fall';                                     // Окт-Дек
	}

	/**
	 * Возвращает актуальный список резервных аниме
	 * ВАЖНО: Обновлять каждый сезон!
	 * @returns {Array} Массив из 9 аниме
	 * @private
	 */
	_getFallbackAnime() {
		const season = this.currentSeason;
		const year = this.currentYear;

		// TODO: Обновлять список каждый сезон
		return [
			{
				id: 1,
				title: 'Клинок, рассекающий демонов: Тренировка столпов',
				excerpt: 'Продолжение культового аниме. Тандзиро и его друзья проходят тренировку у столпов.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '11 эп.',
				score: 8.7,
				genres: ['Экшен', 'Фэнтези', 'Исторический'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/55701'
			},
			{
				id: 2,
				title: 'Моя геройская академия 7',
				excerpt: 'Седьмой сезон популярного аниме про академию героев.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '25 эп.',
				score: 8.3,
				genres: ['Экшен', 'Суперсилы', 'Школа'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/54789'
			},
			{
				id: 3,
				title: 'Ван-Пис',
				excerpt: 'Легендарное аниме продолжается. Луффи и его команда в новых приключениях.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: 'продолжается',
				score: 8.9,
				genres: ['Приключения', 'Фэнтези', 'Комедия'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/21'
			},
			{
				id: 4,
				title: 'Реинкарнация безработного 2 (часть 2)',
				excerpt: 'Продолжение истории Рудеуса Грейрата в мире магии.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '12 эп.',
				score: 8.4,
				genres: ['Фэнтези', 'Приключения', 'Драма'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/51179'
			},
			{
				id: 5,
				title: 'Звёздное дитя 2',
				excerpt: 'Второй сезон аниме о мире шоу-бизнеса и реинкарнации.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '13 эп.',
				score: 8.6,
				genres: ['Драма', 'Музыка', 'Сверхъестественное'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/54915'
			},
			{
				id: 6,
				title: 'Семья шпиона 3',
				excerpt: 'Третий сезон комедийного хита о шпионской семье.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '12 эп.',
				score: 8.8,
				genres: ['Комедия', 'Экшен', 'Повседневность'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/53884'
			},
			{
				id: 7,
				title: 'Магическая битва 3',
				excerpt: 'Третий сезон тёмного фэнтези о магах и проклятиях.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '24 эп.',
				score: 8.9,
				genres: ['Экшен', 'Сверхъестественное', 'Ужасы'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/51009'
			},
			{
				id: 8,
				title: 'Провожающая в последний путь Фрирен 2',
				excerpt: 'Продолжение истории эльфийки Фрирен после победы над демоном.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '12 эп.',
				score: 9.1,
				genres: ['Фэнтези', 'Драма', 'Приключения'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/52991'
			},
			{
				id: 9,
				title: 'О моём перерождении в слизь 4',
				excerpt: 'Четвёртый сезон исекая о Римуру и нации монстров.',
				image: this.fallbackImage,
				type: 'tv',
				status: 'ongoing',
				episodes: '24 эп.',
				score: 8.5,
				genres: ['Фэнтези', 'Приключения', 'Комедия'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/41487'
			}
		];
	}

	// ====================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// ====================================================================

	/**
	 * Инициализирует модуль
	 * Обновляет заголовок, привязывает события и загружает аниме
	 */
	async init() {
		const seasonName = this.seasonNames[this.currentSeason];
		console.log( `[RSN] 🚀 Загрузка аниме сезона ${seasonName} ${this.currentYear}` );
		console.log( '[RSN] 📡 Источники: Shikimori → Jikan → AniList → Локально' );

		this._updateHeroTitle();
		this._bindEvents();
		await this.loadAnime();
	}

	/**
	 * Обновляет заголовок и описание в hero-секции
	 * @private
	 */
	_updateHeroTitle() {
		const subtitle = document.querySelector( '.hero-subtitle' );
		const description = document.querySelector( '.hero-description' );

		if ( subtitle ) {
			subtitle.textContent = `Аниме сезона ${this.seasonNames[this.currentSeason]} ${this.currentYear}`;
		}
		if ( description ) {
			description.textContent = 'Актуальные аниме, которые выходят прямо сейчас. Следите за новинками и выбирайте фигурки любимых персонажей в нашем магазине.';
		}
	}

	/**
	 * Привязывает обработчики событий
	 * @private
	 */
	_bindEvents() {
		// Форма подписки
		const subscribeForm = document.getElementById( 'newsSubscribeForm' );
		if ( subscribeForm ) {
			subscribeForm.addEventListener( 'submit', ( e ) => {
				e.preventDefault();
				const emailInput = e.target.querySelector( 'input[type="email"]' );
				const email = emailInput?.value?.trim();

				if ( email && this._isValidEmail( email ) ) {
					console.log( '[RSN] 📧 Подписка:', email );
					this.showNotification(
						'✅ Спасибо за подписку! Вы будете получать новости о новинках аниме.',
						'success'
					);
					e.target.reset();
				} else {
					this.showNotification(
						'❌ Пожалуйста, введите корректный email адрес.',
						'error'
					);
				}
			} );
		}

		// Кнопка обновления при пустом состоянии
		const refreshBtn = document.getElementById( 'refreshEmptyBtn' );
		if ( refreshBtn ) {
			refreshBtn.addEventListener( 'click', async () => {
				refreshBtn.disabled = true;
				refreshBtn.textContent = 'Загрузка...';
				await this.loadAnime();
				refreshBtn.disabled = false;
				refreshBtn.textContent = 'Обновить';
			} );
		}
	}

	/**
	 * Простая валидация email
	 * @param {string} email 
	 * @returns {boolean}
	 * @private
	 */
	_isValidEmail( email ) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email );
	}

	// ====================================================================
	// ЗАГРУЗКА АНИМЕ (КАСКАДНАЯ СИСТЕМА)
	// ====================================================================

	/**
	 * Загружает аниме используя каскадную систему источников
	 * Порядок: Shikimori → Jikan → AniList → Локальный резерв
	 */
	async loadAnime() {
		this.showLoader( true );
		this.animeList = [];

		// Определяем источники в порядке приоритета
		const sources = [
			{ name: 'Shikimori', fn: () => this._fetchFromShikimori(), minCount: 6 },
			{ name: 'Jikan', fn: () => this._fetchFromJikan(), minCount: 6 },
			{ name: 'AniList', fn: () => this._fetchFromAniList(), minCount: 6 }
		];

		let usedSource = null;

		// Пробуем каждый источник по очереди
		for ( const source of sources ) {
			try {
				console.log( `[RSN] 📡 Попытка загрузки через ${source.name}...` );
				const data = await source.fn();

				if ( data.length >= source.minCount ) {
					this.animeList = data;
					usedSource = source.name;
					console.log( `[RSN] ✅ ${source.name}: загружено ${data.length} аниме` );
					break;
				}

				console.warn( `[RSN] ⚠️ ${source.name}: только ${data.length} записей (нужно минимум ${source.minCount})` );
			} catch ( error ) {
				console.warn( `[RSN] ❌ ${source.name} недоступен:`, error.message );
			}
		}

		// Если ни один API не сработал - используем локальный резерв
		if ( this.animeList.length === 0 ) {
			console.log( '[RSN] 📦 Используем локальный список аниме' );
			this.animeList = [...this.fallbackAnime];
			usedSource = 'Локально';

			this.showNotification(
				'Показан список аниме текущего сезона из нашего каталога. Данные API временно недоступны.',
				'info'
			);
		}

		// Дополняем до 9 если нужно
		this._ensureNineAnime( usedSource );

		// Скрываем лоадер и рендерим
		this.showLoader( false );
		this.render();

		console.log( `[RSN] 🎉 Итого: ${this.animeList.length} аниме (источник: ${usedSource})` );
	}

	/**
	 * Гарантирует что в списке ровно 9 аниме
	 * Дополняет из резерва если не хватает
	 * @param {string} sourceName - название использованного источника
	 * @private
	 */
	_ensureNineAnime( sourceName ) {
		const currentCount = this.animeList.length;

		if ( currentCount >= this.maxAnimeCount ) {
			// Обрезаем до 9 если больше
			this.animeList = this.animeList.slice( 0, this.maxAnimeCount );
			return;
		}

		// Дополняем из резерва
		const needed = this.maxAnimeCount - currentCount;
		console.log( `[RSN] ➕ Дополняем ${needed} аниме из локального резерва` );

		// Исключаем дубликаты по названию
		const existingTitles = new Set(
			this.animeList.map( a => a.title.toLowerCase() )
		);

		const extra = this.fallbackAnime
			.filter( f => !existingTitles.has( f.title.toLowerCase() ) )
			.slice( 0, needed )
			.map( a => ( { ...a, image: this.fallbackImage } ) ); // Принудительно используем заглушку

		this.animeList = [...this.animeList, ...extra];
	}

	// ====================================================================
	// ИСТОЧНИК 1: SHIKIMORI API
	// ====================================================================

	/**
	 * Загружает данные из Shikimori API
	 * @returns {Promise<Array>} Массив аниме
	 * @private
	 */
	async _fetchFromShikimori() {
		const url = new URL( this.shikimoriApiUrl );
		Object.entries( this.shikimoriParams ).forEach( ( [key, value] ) => {
			url.searchParams.append( key, value );
		} );

		console.log( '[RSN] 🌐 Shikimori URL:', url.toString() );

		const data = await this._fetchWithTimeout( url.toString(), {
			headers: this.apiHeaders
		} );

		if ( !Array.isArray( data ) ) {
			throw new Error( 'Неверный формат данных от Shikimori' );
		}

		return data.slice( 0, this.maxAnimeCount ).map( ( anime, index ) => ( {
			id: index + 1,
			title: anime.russian || anime.name || 'Без названия',
			excerpt: this._extractShikimoriExcerpt( anime ),
			image: this._extractShikimoriImage( anime ),
			type: anime.kind || 'tv',
			status: anime.status || 'ongoing',
			episodes: anime.episodes ? `${anime.episodes} эп.` : '? эп.',
			score: parseFloat( anime.score ) || 0,
			genres: ( anime.genres || [] ).map( g => g.russian || g.name ).slice( 0, 3 ),
			source: 'Shikimori',
			sourceUrl: `https://shikimori.one${anime.url || '/animes'}`
		} ) );
	}

	// ====================================================================
	// ИСТОЧНИК 2: JIKAN API v4
	// ====================================================================

	/**
	 * Загружает данные из Jikan API (MyAnimeList)
	 * @returns {Promise<Array>} Массив аниме
	 * @private
	 */
	async _fetchFromJikan() {
		console.log( '[RSN] 🌐 Jikan URL:', this.jikanApiUrl );

		const data = await this._fetchWithTimeout( this.jikanApiUrl, {
			headers: { 'Accept': 'application/json' }
		} );

		const animeData = data?.data || [];

		if ( !Array.isArray( animeData ) ) {
			throw new Error( 'Неверный формат данных от Jikan' );
		}

		return animeData.slice( 0, this.maxAnimeCount ).map( ( anime, index ) => ( {
			id: index + 1,
			title: anime.title || anime.title_english || 'Без названия',
			excerpt: this._truncateText( anime.synopsis || '', 200 ),
			image: this._extractJikanImage( anime.images ),
			type: anime.type || 'tv',
			status: anime.status || 'airing',
			episodes: anime.episodes ? `${anime.episodes} эп.` : '? эп.',
			score: anime.score || 0,
			genres: ( anime.genres || [] ).map( g => g.name ).slice( 0, 3 ),
			source: 'MyAnimeList',
			sourceUrl: anime.url || '#'
		} ) );
	}

	// ====================================================================
	// ИСТОЧНИК 3: ANILIST API (GRAPHQL)
	// ====================================================================

	/**
	 * Загружает данные из AniList GraphQL API
	 * Самый надежный источник, не блокируется
	 * @returns {Promise<Array>} Массив аниме
	 * @private
	 */
	async _fetchFromAniList() {
		console.log( '[RSN] 🌐 AniList GraphQL запрос' );

		const variables = {
			season: this.seasonMap[this.currentSeason],
			seasonYear: this.currentYear,
			perPage: this.maxAnimeCount
		};

		const data = await this._fetchWithTimeout( this.anilistGraphqlUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify( {
				query: this.anilistQuery,
				variables: variables
			} )
		} );

		const mediaList = data?.data?.Page?.media || [];

		if ( !Array.isArray( mediaList ) ) {
			throw new Error( 'Неверный формат данных от AniList' );
		}

		return mediaList.map( ( anime, index ) => ( {
			id: index + 1,
			title: anime.title?.romaji || anime.title?.english || 'Без названия',
			excerpt: this._cleanHtml( anime.description || '' ).substring( 0, 200 ),
			image: this._extractAniListImage( anime.coverImage ),
			type: this._getAniListFormat( anime.format ),
			status: this._getAniListStatus( anime.status ),
			episodes: anime.episodes ? `${anime.episodes} эп.` : '? эп.',
			score: ( anime.averageScore || 0 ) / 10, // AniList возвращает score 0-100
			genres: ( anime.genres || [] ).slice( 0, 3 ),
			source: 'AniList',
			sourceUrl: anime.siteUrl || '#'
		} ) );
	}

	// ====================================================================
	// УНИВЕРСАЛЬНЫЙ FETCH С ТАЙМАУТОМ
	// ====================================================================

	/**
	 * Выполняет fetch запрос с таймаутом и обработкой ошибок
	 * @param {string} url - URL для запроса
	 * @param {Object} options - опции fetch
	 * @returns {Promise<any>} Распарсенный JSON
	 * @private
	 */
	async _fetchWithTimeout( url, options = {} ) {
		const controller = new AbortController();
		const timeoutId = setTimeout( () => {
			console.warn( `[RSN] ⏰ Таймаут запроса (${this.apiTimeout}мс): ${url}` );
			controller.abort();
		}, this.apiTimeout );

		try {
			const response = await fetch( url, {
				...options,
				signal: controller.signal
			} );

			if ( !response.ok ) {
				throw new Error( `HTTP ${response.status}: ${response.statusText}` );
			}

			// Проверяем Content-Type чтобы избежать ошибок парсинга
			const contentType = response.headers.get( 'content-type' );
			if ( !contentType || !contentType.includes( 'application/json' ) ) {
				throw new Error( `Неверный Content-Type: ${contentType}` );
			}

			const data = await response.json();
			return data;
		} catch ( error ) {
			if ( error.name === 'AbortError' ) {
				throw new Error( 'Таймаут запроса' );
			}
			throw error;
		} finally {
			clearTimeout( timeoutId );
		}
	}

	// ====================================================================
	// ИЗВЛЕЧЕНИЕ ИЗОБРАЖЕНИЙ
	// ====================================================================

	/**
	 * Извлекает URL изображения из данных Shikimori
	 * @param {Object} anime - объект аниме
	 * @returns {string} URL изображения
	 * @private
	 */
	_extractShikimoriImage( anime ) {
		const candidates = [
			anime.image?.original,
			anime.image?.preview
		];

		for ( const imgUrl of candidates ) {
			if ( imgUrl && !this._isApiPlaceholder( imgUrl ) ) {
				return imgUrl.startsWith( 'http' ) ? imgUrl : `https://shikimori.one${imgUrl}`;
			}
		}

		return this.fallbackImage;
	}

	/**
	 * Извлекает URL изображения из данных Jikan
	 * @param {Object} images - объект с изображениями
	 * @returns {string} URL изображения
	 * @private
	 */
	_extractJikanImage( images ) {
		if ( !images ) return this.fallbackImage;

		const candidates = [
			images.jpg?.large_image_url,
			images.jpg?.image_url,
			images.webp?.large_image_url,
			images.webp?.image_url
		];

		for ( const url of candidates ) {
			if ( url && url.startsWith( 'http' ) && !this._isApiPlaceholder( url ) ) {
				return url;
			}
		}

		return this.fallbackImage;
	}

	/**
	 * Извлекает URL изображения из данных AniList
	 * @param {Object} coverImage - объект с изображениями
	 * @returns {string} URL изображения
	 * @private
	 */
	_extractAniListImage( coverImage ) {
		if ( !coverImage ) return this.fallbackImage;

		const candidates = [
			coverImage.extraLarge,
			coverImage.large
		];

		for ( const url of candidates ) {
			if ( url && url.startsWith( 'http' ) ) {
				return url;
			}
		}

		return this.fallbackImage;
	}

	/**
	 * Проверяет, является ли URL заглушкой API
	 * @param {string} url - URL для проверки
	 * @returns {boolean}
	 * @private
	 */
	_isApiPlaceholder( url ) {
		if ( !url || typeof url !== 'string' ) return true;

		const lowerUrl = url.toLowerCase();
		return this.apiPlaceholderMarkers.some( marker => lowerUrl.includes( marker ) );
	}

	// ====================================================================
	// ОБРАБОТКА ТЕКСТА
	// ====================================================================

	/**
	 * Извлекает описание из данных Shikimori
	 * @param {Object} anime - объект аниме
	 * @returns {string} Описание
	 * @private
	 */
	_extractShikimoriExcerpt( anime ) {
		if ( anime.description ) {
			return this._cleanHtml( anime.description ).substring( 0, 200 );
		}

		const parts = [];
		if ( anime.kind ) parts.push( this._getKindName( anime.kind ) );
		if ( anime.episodes ) parts.push( `${anime.episodes} эп.` );
		if ( anime.score ) parts.push( `★ ${anime.score}` );

		return parts.join( ' · ' ) || 'Новое аниме в каталоге Shikimori';
	}

	/**
	 * Удаляет HTML-теги и BB-коды из текста
	 * @param {string} text - исходный текст
	 * @returns {string} Очищенный текст
	 * @private
	 */
	_cleanHtml( text ) {
		if ( !text ) return '';
		return text
			.replace( /\[[^\]]*\]/g, '' )  // Удаляем BB-коды [like this]
			.replace( /<[^>]*>/g, '' )     // Удаляем HTML-теги
			.replace( /&[^;]+;/g, '' )     // Удаляем HTML-entities
			.replace( /\s+/g, ' ' )        // Схлопываем пробелы
			.trim();
	}

	/**
	 * Обрезает текст до указанной длины
	 * @param {string} text - исходный текст
	 * @param {number} maxLength - максимальная длина
	 * @returns {string} Обрезанный текст
	 * @private
	 */
	_truncateText( text, maxLength ) {
		if ( !text || text.length <= maxLength ) return text || '';
		return text.substring( 0, maxLength ).trim() + '...';
	}

	/**
	 * Возвращает русское название типа аниме
	 * @param {string} kind - тип из API
	 * @returns {string} Русское название
	 * @private
	 */
	_getKindName( kind ) {
		const kinds = {
			'tv': 'Сериал',
			'movie': 'Фильм',
			'ova': 'OVA',
			'ona': 'ONA',
			'special': 'Спецвыпуск',
			'music': 'Клип'
		};
		return kinds[kind] || kind || 'Аниме';
	}

	/**
	 * Преобразует формат AniList в наш формат
	 * @param {string} format - формат из AniList
	 * @returns {string} Наш формат
	 * @private
	 */
	_getAniListFormat( format ) {
		const formats = {
			'TV': 'tv',
			'TV_SHORT': 'tv',
			'MOVIE': 'movie',
			'OVA': 'ova',
			'ONA': 'ona',
			'SPECIAL': 'special',
			'MUSIC': 'music'
		};
		return formats[format] || 'tv';
	}

	/**
	 * Преобразует статус AniList в наш формат
	 * @param {string} status - статус из AniList
	 * @returns {string} Наш статус
	 * @private
	 */
	_getAniListStatus( status ) {
		const statuses = {
			'RELEASING': 'ongoing',
			'FINISHED': 'complete',
			'NOT_YET_RELEASED': 'upcoming'
		};
		return statuses[status] || 'ongoing';
	}

	// ====================================================================
	// БЕЗОПАСНОСТЬ
	// ====================================================================

	/**
	 * Экранирует HTML-спецсимволы
	 * @param {string} text - исходный текст
	 * @returns {string} Безопасный HTML
	 */
	escapeHtml( text ) {
		if ( !text ) return '';
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.replace( /[&<>"']/g, char => map[char] || char );
	}

	// ====================================================================
	// ОТОБРАЖЕНИЕ
	// ====================================================================

	/**
	 * Показывает или скрывает лоадер
	 * @param {boolean} show - показать/скрыть
	 */
	showLoader( show ) {
		this.isLoading = show;
		const loader = document.getElementById( 'newsLoader' );
		const grid = document.getElementById( 'newsGrid' );

		if ( loader ) {
			loader.style.display = show ? 'flex' : 'none';
			const text = loader.querySelector( 'p' );
			if ( text ) {
				text.textContent = `Загружаем аниме сезона ${this.seasonNames[this.currentSeason]}...`;
			}
		}

		if ( grid && show ) {
			grid.style.display = 'none';
		}
	}

	/**
	 * Рендерит сетку с аниме
	 */
	render() {
		const grid = document.getElementById( 'newsGrid' );
		const empty = document.getElementById( 'emptyState' );

		if ( !grid ) {
			console.error( '[RSN] ❌ Элемент #newsGrid не найден в DOM' );
			return;
		}

		// Если нет аниме - показываем пустое состояние
		if ( !this.animeList.length ) {
			grid.style.display = 'none';
			if ( empty ) empty.style.display = 'block';
			return;
		}

		// Показываем сетку
		grid.style.display = 'grid';
		if ( empty ) empty.style.display = 'none';

		// Рендерим карточки
		grid.innerHTML = this.animeList
			.map( anime => this._renderAnimeCard( anime ) )
			.join( '' );

		console.log( `[RSN] 🎨 Отрендерено ${this.animeList.length} карточек аниме` );
	}

	/**
	 * Создает HTML одной карточки аниме
	 * @param {Object} anime - объект аниме
	 * @returns {string} HTML-строка
	 * @private
	 */
	_renderAnimeCard( anime ) {
		// Исправлено: убрано обращение к несуществующему this.typeNames
		const typeName = this.formatNames[anime.type?.toUpperCase()] ||
			this._getKindName( anime.type ) ||
			'📺 Сериал';
		const statusName = this.statusNames[anime.status] || '▶️ Выходит';
		const stars = this._renderStars( anime.score );
		const genres = ( anime.genres || [] ).slice( 0, 3 ).join( ' · ' );

		return `
            <div class="news-card anime-card">
                <div class="news-image">
                    <img src="${this.escapeHtml( anime.image )}" 
                        alt="${this.escapeHtml( anime.title )}" 
                        loading="lazy"
                        onerror="window.risingSunNews?.handleImageError(this);">
                    <div class="news-badges">
                        <span class="news-country">${typeName}</span>
                        <span class="news-category">${statusName}</span>
                    </div>
                    ${anime.score > 0 ? `
                        <div class="anime-score">★ ${anime.score.toFixed( 1 )}</div>
                    ` : ''}
                </div>
                <div class="news-content">
                    <div class="news-meta">
                        <span class="news-date"><i class="fas fa-tv"></i> ${this.escapeHtml( anime.episodes )}</span>
                        <span class="news-views"><i class="fas fa-star"></i> ${stars}</span>
                    </div>
                    <h3 class="news-title">${this.escapeHtml( anime.title )}</h3>
                    <p class="news-excerpt">${this.escapeHtml( anime.excerpt )}</p>
                    <div class="anime-genres">${this.escapeHtml( genres )}</div>
                    <div class="news-footer">
                        <span class="news-source"><i class="fas fa-database"></i> ${this.escapeHtml( anime.source )}</span>
                        <a href="${this.escapeHtml( anime.sourceUrl )}" 
							class="news-link" 
							target="_blank" 
							rel="noopener noreferrer">
                            Подробнее <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
	}

	/**
	 * Генерирует HTML-звезды для рейтинга
	 * @param {number} score - оценка (0-10)
	 * @returns {string} HTML со звездами
	 * @private
	 */
	_renderStars( score ) {
		if ( !score || score === 0 ) return 'Нет оценки';

		const fullStars = Math.floor( score / 2 );
		const halfStar = ( score / 2 - fullStars ) >= 0.5;
		let stars = '';

		for ( let i = 0; i < 5; i++ ) {
			if ( i < fullStars ) stars += '★';
			else if ( i === fullStars && halfStar ) stars += '⯪';
			else stars += '☆';
		}

		return stars;
	}

	/**
	 * Обработчик ошибки загрузки изображения
	 * @param {HTMLImageElement} img - элемент изображения
	 */
	handleImageError( img ) {
		if ( !img || img.src === this.fallbackImage ) return;

		console.warn( '[RSN] 🖼️ Ошибка загрузки изображения, заменяю на заглушку' );
		img.src = this.fallbackImage;
		img.onerror = null; // Предотвращаем бесконечный цикл
	}

	// ====================================================================
	// УВЕДОМЛЕНИЯ
	// ====================================================================

	/**
	 * Показывает уведомление пользователю
	 * @param {string} message - текст уведомления
	 * @param {string} type - тип (info/success/error/warning)
	 */
	showNotification( message, type = 'info' ) {
		// Удаляем предыдущее уведомление если есть
		const existing = document.querySelector( '.api-notification' );
		if ( existing ) {
			existing.remove();
		}

		const el = document.createElement( 'div' );
		el.className = `api-notification api-notification-${type}`;
		el.setAttribute( 'role', 'alert' );
		el.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${this.escapeHtml( message )}</span>
            <button class="notification-close" aria-label="Закрыть уведомление">&times;</button>
        `;

		document.body.appendChild( el );

		// Анимация появления
		requestAnimationFrame( () => {
			el.classList.add( 'show' );
		} );

		// Обработчик закрытия
		const closeBtn = el.querySelector( '.notification-close' );
		const closeNotification = () => {
			el.classList.remove( 'show' );
			setTimeout( () => {
				if ( el.parentNode ) {
					el.remove();
				}
			}, 300 );
		};

		if ( closeBtn ) {
			closeBtn.addEventListener( 'click', closeNotification );
		}

		// Автоматическое скрытие через 5 секунд
		const autoHideTimeout = setTimeout( closeNotification, 5000 );

		// Очищаем таймаут при ручном закрытии
		el.addEventListener( 'close', () => {
			clearTimeout( autoHideTimeout );
		} );
	}
}

// ====================================================================
// ЗАПУСК МОДУЛЯ
// ====================================================================

/**
 * Инициализация при загрузке DOM
 */
document.addEventListener( 'DOMContentLoaded', () => {
	// Проверяем наличие контейнера для новостей
	if ( document.getElementById( 'newsGrid' ) ) {
		try {
			window.risingSunNews = new RisingSunNews();
			console.log( '✅ RisingSunNews: модуль запущен' );
		} catch ( error ) {
			console.error( '❌ RisingSunNews: ошибка при запуске:', error );
		}
	} else {
		console.log( 'ℹ️ RisingSunNews: контейнер #newsGrid не найден, модуль неактивен' );
	}
} );

// Экспорт для модульных систем
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = RisingSunNews;
}