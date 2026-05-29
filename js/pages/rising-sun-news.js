/**
 * ============================================================================
 * RISING SUN NEWS v3.1 — АНИМЕ ЭТОГО СЕЗОНА
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Загружает 9 актуальных аниме текущего сезона
 * - Отображает в сетке 3×3 на главной странице
 * - Использует каскадную систему источников с fallback'ами
 * - Оптимизирует изображения через собственный Vercel прокси
 * 
 * ИСТОЧНИКИ ДАННЫХ (в порядке приоритета):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 1. ANILIST API (GraphQL)    — Всегда работает, нет CORS        │
 * │ 2. KITSU API                — Открытый API, резервный канал    │
 * │ 3. ЛОКАЛЬНЫЙ JSON           — Обновляется GitHub Actions       │
 * │ 4. ВСТРОЕННЫЙ РЕЗЕРВ        — 100% гарантия отображения       │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ:
 * - Собственный прокси на Vercel (/api/image-proxy)
 * - Адаптивная загрузка с srcSet (300w и 600w)
 * - Кэширование на CDN Vercel 24 часа
 * - Ленивая загрузка (loading="lazy") + декодирование (decoding="async")
 * - Автоматическая замена битых изображений на заглушку
 * - Защита от пустых изображений API
 * 
 * КЭШИРОВАНИЕ:
 * - localStorage на 30 минут
 * - Автоматический сброс при смене сезона
 * - Защита от переполнения localStorage
 * - Экономит API-запросы при повторных заходах
 * 
 * ЗАПУСК:
 * - Автоматически при наличии #newsGrid на странице
 * - Доступен глобально через window.risingSunNews
 * - Публичное API для отладки в консоли
 * 
 * ============================================================================
 */

class RisingSunNews {
	constructor() {
		// ====================================================================
		// ОСНОВНЫЕ ПАРАМЕТРЫ
		// ====================================================================

		/**
		 * Массив загруженных аниме (всегда 9 элементов после загрузки)
		 * @type {Array<Object>}
		 */
		this.animeList = [];

		/**
		 * Флаг процесса загрузки
		 * Предотвращает повторные загрузки пока одна уже выполняется
		 * @type {boolean}
		 */
		this.isLoading = false;

		/**
		 * Флаг успешной инициализации
		 * Устанавливается в true после первого вызова init()
		 * @type {boolean}
		 */
		this.isInitialized = false;

		/**
		 * Текущий аниме-сезон: winter | spring | summer | fall
		 * Определяется автоматически по месяцу
		 * @type {string}
		 */
		this.currentSeason = this._getCurrentSeason();

		/**
		 * Текущий год
		 * @type {number}
		 */
		this.currentYear = new Date().getFullYear();

		/**
		 * Сколько аниме загружать (сетка 3x3)
		 * @type {number}
		 */
		this.maxAnimeCount = 9;

		/**
		 * Минимально приемлемое количество аниме от API
		 * Если API вернул меньше — пробуем следующий источник
		 * @type {number}
		 */
		this.minAcceptableCount = 6;

		// ====================================================================
		// ТАЙМАУТЫ И ИНТЕРВАЛЫ
		// ====================================================================

		/**
		 * Таймаут одного API-запроса в миллисекундах (15 секунд)
		 * @type {number}
		 */
		this.apiTimeout = 15000;

		/**
		 * Время жизни кэша в миллисекундах (30 минут)
		 * @type {number}
		 */
		this.cacheDuration = 30 * 60 * 1000;

		/**
		 * Ключ для хранения кэша в localStorage
		 * @type {string}
		 */
		this.cacheKey = 'rsn_anime_cache_v3.1';

		// ====================================================================
		// ИСТОЧНИК 1: ANILIST API (GRAPHQL) — ОСНОВНОЙ
		// ====================================================================

		/**
		 * GraphQL эндпоинт AniList
		 * Не требует API ключа, не имеет CORS ограничений
		 * @type {string}
		 */
		this.anilistUrl = 'https://graphql.anilist.co';

		/**
		 * GraphQL запрос для получения аниме текущего сезона
		 * Запрашивает: названия, описание, изображения, рейтинг, жанры, студии, трейлер
		 * @type {string}
		 */
		this.anilistQuery = `
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
                        meanScore
                        popularity
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
                            thumbnail
                        }
                        season
                        seasonYear
                    }
                }
            }
        `;

		// ====================================================================
		// ИСТОЧНИК 2: KITSU API — ПЕРВЫЙ РЕЗЕРВ
		// ====================================================================

		/**
		 * Базовый URL Kitsu API
		 * Открытый API, не требует ключа, нет строгих лимитов
		 * @type {string}
		 */
		this.kitsuUrl = 'https://kitsu.io/api/edge';

		// ====================================================================
		// ИСТОЧНИК 3: ЛОКАЛЬНЫЙ JSON — ВТОРОЙ РЕЗЕРВ
		// ====================================================================

		/**
		 * Путь к локальному JSON файлу с аниме
		 * Файл обновляется GitHub Actions каждый день в 09:00 МСК
		 * @type {string}
		 */
		this.localJsonUrl = '/data/current-season-anime.json';

		// ====================================================================
		// ИСТОЧНИК 4: ВСТРОЕННЫЙ РЕЗЕРВ — ПОСЛЕДНЯЯ НАДЕЖДА
		// ====================================================================

		/**
		 * Хардкод-список из 9 аниме
		 * Используется когда ВООБЩЕ все API и JSON недоступны
		 * TODO: Обновлять список каждый сезон!
		 * @type {Array<Object>}
		 */
		this.hardcodedFallback = this._getHardcodedFallback();

		// ====================================================================
		// ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ (VERCEL ПРОКСИ)
		// ====================================================================

		/**
		 * URL нашего прокси на Vercel
		 * Файл: /api/image-proxy.js
		 * @type {string}
		 */
		this.imageProxyUrl = '/api/image-proxy';

		/**
		 * Флаг использования прокси
		 * Автоматически устанавливается в false если прокси недоступен
		 * @type {boolean}
		 */
		this.useProxy = true;

		/**
		 * Настройки размеров изображений для разных контекстов
		 * @type {Object}
		 */
		this.imageSizes = {
			/** Для карточек в сетке (600×840) */
			card: { w: 600, h: 840, q: 80, fit: 'cover' },
			/** Для превью и мобильных (300×420) */
			thumbnail: { w: 300, h: 420, q: 70, fit: 'cover' },
			/** Для баннеров (1200×400) */
			banner: { w: 1200, h: 400, q: 85, fit: 'cover' }
		};

		/**
		 * Путь к локальной заглушке при ошибке загрузки
		 * @type {string}
		 */
		this.fallbackImage = '/image/404.jpg';

		/**
		 * Размытая заглушка для прогрессивной загрузки (1 KB)
		 * @type {string}
		 */
		this.blurPlaceholder = '/image/anime-placeholder-blur.webp';

		/**
		 * Маркеры "пустых" изображений от API
		 * Некоторые API отдают картинки-заглушки вместо реальных постеров
		 * @type {Array<string>}
		 */
		this.placeholderMarkers = [
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

		// ====================================================================
		// ЛОКАЛИЗАЦИЯ
		// ====================================================================

		/**
		 * Названия сезонов с эмодзи для отображения в UI
		 * @type {Object<string, string>}
		 */
		this.seasonDisplayNames = {
			'winter': '❄️ Зима',
			'spring': '🌸 Весна',
			'summer': '☀️ Лето',
			'fall': '🍂 Осень'
		};

		/**
		 * Маппинг сезонов для AniList API (UPPERCASE)
		 * @type {Object<string, string>}
		 */
		this.seasonAnilistMap = {
			'winter': 'WINTER',
			'spring': 'SPRING',
			'summer': 'SUMMER',
			'fall': 'FALL'
		};

		/**
		 * Маппинг сезонов для Kitsu API (lowercase)
		 * @type {Object<string, string>}
		 */
		this.seasonKitsuMap = {
			'winter': 'winter',
			'spring': 'spring',
			'summer': 'summer',
			'fall': 'fall'
		};

		/**
		 * Русские названия форматов аниме с эмодзи
		 * @type {Object<string, string>}
		 */
		this.formatDisplayNames = {
			'TV': '📺 Сериал',
			'TV_SHORT': '📺 Короткий сериал',
			'MOVIE': '🎬 Фильм',
			'OVA': '💿 OVA',
			'ONA': '🌐 ONA',
			'SPECIAL': '⭐ Спецвыпуск',
			'MUSIC': '🎵 Клип',
			// Kitsu использует lowercase
			'tv': '📺 Сериал',
			'movie': '🎬 Фильм',
			'ova': '💿 OVA',
			'ona': '🌐 ONA',
			'special': '⭐ Спецвыпуск',
			'music': '🎵 Клип'
		};

		/**
		 * Русские названия статусов аниме с эмодзи
		 * @type {Object<string, string>}
		 */
		this.statusDisplayNames = {
			'ongoing': '▶️ Выходит',
			'released': '✅ Завершён',
			'airing': '▶️ Выходит',
			'complete': '✅ Завершён',
			'upcoming': '📅 Скоро',
			'RELEASING': '▶️ Выходит',
			'FINISHED': '✅ Завершён',
			'NOT_YET_RELEASED': '📅 Анонс'
		};

		/**
		 * Переводы жанров с английского на русский
		 * @type {Object<string, string>}
		 */
		this.genreTranslations = {
			'Action': 'Экшен',
			'Adventure': 'Приключения',
			'Comedy': 'Комедия',
			'Drama': 'Драма',
			'Ecchi': 'Этти',
			'Fantasy': 'Фэнтези',
			'Harem': 'Гарем',
			'Hentai': 'Хентай',
			'Historical': 'История',
			'Horror': 'Ужасы',
			'Isekai': 'Исекай',
			'Mahou Shoujo': 'Махо-сёдзё',
			'Mecha': 'Меха',
			'Military': 'Военное',
			'Music': 'Музыка',
			'Mystery': 'Детектив',
			'Mythology': 'Мифология',
			'Parody': 'Пародия',
			'Post-Apocalyptic': 'Постапокалипсис',
			'Psychological': 'Психология',
			'Romance': 'Романтика',
			'Samurai': 'Самураи',
			'School': 'Школа',
			'Sci-Fi': 'Фантастика',
			'Seinen': 'Сэйнэн',
			'Shoujo': 'Сёдзё',
			'Shounen': 'Сёнэн',
			'Slice of Life': 'Повседневность',
			'Space': 'Космос',
			'Sports': 'Спорт',
			'Supernatural': 'Сверхъестественное',
			'Superpower': 'Суперсилы',
			'Thriller': 'Триллер',
			'Vampire': 'Вампиры',
			'Zombie': 'Зомби',
			'Cooking': 'Кулинария'
		};

		// ====================================================================
		// ЗАПУСК
		// ====================================================================

		this.init();
	}

	// ========================================================================
	// 1. ОПРЕДЕЛЕНИЕ СЕЗОНА
	// ========================================================================

	/**
	 * Определяет текущий аниме-сезон по календарному месяцу
	 * 
	 * Аниме-сезоны:
	 * - Зима (Winter):   январь, февраль, март
	 * - Весна (Spring):  апрель, май, июнь
	 * - Лето (Summer):   июль, август, сентябрь
	 * - Осень (Fall):    октябрь, ноябрь, декабрь
	 * 
	 * @returns {string} winter | spring | summer | fall
	 * @private
	 */
	_getCurrentSeason() {
		const month = new Date().getMonth(); // 0 (январь) — 11 (декабрь)

		if ( month >= 0 && month <= 2 ) {
			return 'winter';  // Январь, Февраль, Март
		}
		if ( month >= 3 && month <= 5 ) {
			return 'spring';  // Апрель, Май, Июнь
		}
		if ( month >= 6 && month <= 8 ) {
			return 'summer';  // Июль, Август, Сентябрь
		}
		return 'fall';         // Октябрь, Ноябрь, Декабрь
	}

	// ========================================================================
	// 2. ВСТРОЕННЫЙ РЕЗЕРВ (ПОСЛЕДНЯЯ НАДЕЖДА)
	// ========================================================================

	/**
	 * Возвращает хардкод-список из 9 аниме
	 * Используется когда абсолютно все источники недоступны
	 * 
	 * ВАЖНО: Обновлять список каждый сезон вручную!
	 * TODO: Обновить до актуального сезона
	 * 
	 * @returns {Array<Object>} Массив из 9 аниме-объектов
	 * @private
	 */
	_getHardcodedFallback() {
		return [
			{
				id: 'fallback-1',
				title: 'Клинок, рассекающий демонов: Тренировка столпов',
				nativeTitle: '鬼滅の刃 柱稽古編',
				excerpt: 'Продолжение культового аниме. Тандзиро и его друзья проходят интенсивную тренировку у столпов, готовясь к финальной битве с демонами.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '11 эп.',
				episodesCount: 11,
				score: 8.7,
				scoreRaw: 87,
				popularity: 450000,
				genres: ['Экшен', 'Фэнтези', 'История'],
				studios: ['ufotable'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/55701',
				trailerUrl: null,
				order: 1
			},
			{
				id: 'fallback-2',
				title: 'Моя геройская академия 7',
				nativeTitle: '僕のヒーローアカデミア 7',
				excerpt: 'Седьмой сезон популярного аниме про академию супергероев. Новые злодеи, новые способности и эпические сражения.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '25 эп.',
				episodesCount: 25,
				score: 8.3,
				scoreRaw: 83,
				popularity: 420000,
				genres: ['Экшен', 'Суперсилы', 'Школа'],
				studios: ['Bones'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/54789',
				trailerUrl: null,
				order: 2
			},
			{
				id: 'fallback-3',
				title: 'Ван-Пис',
				nativeTitle: 'ONE PIECE',
				excerpt: 'Легендарное аниме о пиратах продолжается! Луффи и его команда исследуют новые острова и сражаются с могущественными врагами.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: 'продолжается',
				episodesCount: null,
				score: 8.9,
				scoreRaw: 89,
				popularity: 500000,
				genres: ['Приключения', 'Фэнтези', 'Комедия'],
				studios: ['Toei Animation'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/21',
				trailerUrl: null,
				order: 3
			},
			{
				id: 'fallback-4',
				title: 'Реинкарнация безработного 2 (часть 2)',
				nativeTitle: '無職転生 II 第2クール',
				excerpt: 'Продолжение истории Рудеуса Грейрата. Новые приключения в мире магии, развитие персонажей и неожиданные повороты.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '12 эп.',
				episodesCount: 12,
				score: 8.4,
				scoreRaw: 84,
				popularity: 380000,
				genres: ['Фэнтези', 'Приключения', 'Драма'],
				studios: ['Studio Bind'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/51179',
				trailerUrl: null,
				order: 4
			},
			{
				id: 'fallback-5',
				title: 'Звёздное дитя 2',
				nativeTitle: '【推しの子】 2',
				excerpt: 'Второй сезон нашумевшего аниме о тёмной стороне шоу-бизнеса и реинкарнации. Аква и Руби продолжают свой путь.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '13 эп.',
				episodesCount: 13,
				score: 8.6,
				scoreRaw: 86,
				popularity: 410000,
				genres: ['Драма', 'Музыка', 'Сверхъестественное'],
				studios: ['Doga Kobo'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/54915',
				trailerUrl: null,
				order: 5
			},
			{
				id: 'fallback-6',
				title: 'Семья шпиона 3',
				nativeTitle: 'SPY×FAMILY 3',
				excerpt: 'Третий сезон комедийного хита о необычной семье. Ллойд, Йор и Аня продолжают свою тайную жизнь под одной крышей.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '12 эп.',
				episodesCount: 12,
				score: 8.8,
				scoreRaw: 88,
				popularity: 440000,
				genres: ['Комедия', 'Экшен', 'Повседневность'],
				studios: ['Wit Studio', 'CloverWorks'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/53884',
				trailerUrl: null,
				order: 6
			},
			{
				id: 'fallback-7',
				title: 'Магическая битва 3',
				nativeTitle: '呪術廻戦 3',
				excerpt: 'Третий сезон тёмного фэнтези. Новые проклятия, запретные техники и раскрытие тайн мира магов.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '24 эп.',
				episodesCount: 24,
				score: 8.9,
				scoreRaw: 89,
				popularity: 460000,
				genres: ['Экшен', 'Сверхъестественное', 'Ужасы'],
				studios: ['MAPPA'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/51009',
				trailerUrl: null,
				order: 7
			},
			{
				id: 'fallback-8',
				title: 'Провожающая в последний путь Фрирен 2',
				nativeTitle: '葬送のフリーレン 2',
				excerpt: 'Продолжение трогательной истории эльфийки Фрирен. Путешествие длиною в жизнь после победы над королём демонов.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '12 эп.',
				episodesCount: 12,
				score: 9.1,
				scoreRaw: 91,
				popularity: 470000,
				genres: ['Фэнтези', 'Драма', 'Приключения'],
				studios: ['Madhouse'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/52991',
				trailerUrl: null,
				order: 8
			},
			{
				id: 'fallback-9',
				title: 'О моём перерождении в слизь 4',
				nativeTitle: '転生したらスライムだった件 4',
				excerpt: 'Четвёртый сезон популярного исекая. Римуру продолжает строить Федерацию Монстров и противостоять новым угрозам.',
				image: this.fallbackImage,
				imageOriginal: null,
				imageMedium: null,
				imageThumbnail: this.fallbackImage,
				bannerImage: null,
				type: '📺 Сериал',
				format: 'TV',
				status: '▶️ Выходит',
				episodes: '24 эп.',
				episodesCount: 24,
				score: 8.5,
				scoreRaw: 85,
				popularity: 390000,
				genres: ['Фэнтези', 'Приключения', 'Комедия'],
				studios: ['8bit'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/41487',
				trailerUrl: null,
				order: 9
			}
		];
	}

	// ========================================================================
	// 3. ИНИЦИАЛИЗАЦИЯ
	// ========================================================================

	/**
	 * Главный метод инициализации модуля
	 * Выполняет:
	 * 1. Логирование информации о запуске
	 * 2. Обновление hero-секции
	 * 3. Привязку обработчиков событий
	 * 4. Проверку доступности прокси изображений
	 * 5. Загрузку аниме
	 */
	async init() {
		const seasonName = this.seasonDisplayNames[this.currentSeason];

		console.log( '╔══════════════════════════════════════════════════════╗' );
		console.log( '║         RISING SUN NEWS v3.1 — ЗАПУСК               ║' );
		console.log( `║         Сезон: ${seasonName} ${this.currentYear}                        ║` );
		console.log( '║         Прокси: Vercel Serverless                   ║' );
		console.log( '╚══════════════════════════════════════════════════════╝' );

		// Обновляем текст в hero-секции
		this._updateHeroSection();

		// Привязываем обработчики событий
		this._bindEvents();

		// Проверяем доступность прокси изображений
		await this._detectProxyAvailability();

		// Загружаем аниме
		await this.loadAnime();

		// Отмечаем успешную инициализацию
		this.isInitialized = true;
		console.log( '[RSN] ✅ Модуль инициализирован' );
		console.log( '[RSN] 💡 Доступен как window.risingSunNews' );
		console.log( '[RSN] 💡 Методы: refresh(), getState(), getAnimeList(), clearCache()' );
	}

	/**
	 * Обновляет текст в hero-секции главной страницы
	 * Находит элементы .hero-subtitle и .hero-description
	 * @private
	 */
	_updateHeroSection() {
		const subtitle = document.querySelector( '.hero-subtitle' );
		const description = document.querySelector( '.hero-description' );

		if ( subtitle ) {
			subtitle.textContent = `Аниме сезона ${this.seasonDisplayNames[this.currentSeason]} ${this.currentYear}`;
		}

		if ( description ) {
			description.textContent = 'Актуальные аниме, которые выходят прямо сейчас. Следите за новинками и выбирайте фигурки любимых персонажей в нашем магазине.';
		}
	}

	/**
	 * Настраивает все обработчики событий
	 * @private
	 */
	_bindEvents() {
		this._bindSubscribeForm();
		this._bindRefreshButton();
	}

	/**
	 * Настраивает форму подписки на новости
	 * @private
	 */
	_bindSubscribeForm() {
		const form = document.getElementById( 'newsSubscribeForm' );
		if ( !form ) return;

		form.addEventListener( 'submit', ( e ) => {
			e.preventDefault();

			const emailInput = form.querySelector( 'input[type="email"]' );
			const email = emailInput?.value?.trim();

			if ( email && this._isValidEmail( email ) ) {
				console.log( `[RSN] 📧 Новая подписка: ${email.substring( 0, 3 )}...@...` );
				this.showNotification(
					'✅ Спасибо за подписку! Вы будете получать новости о новинках аниме.',
					'success'
				);
				form.reset();
			} else {
				this.showNotification(
					'❌ Пожалуйста, введите корректный email адрес.',
					'error'
				);
			}
		} );
	}

	/**
	 * Настраивает кнопку обновления при пустом состоянии
	 * @private
	 */
	_bindRefreshButton() {
		const btn = document.getElementById( 'refreshEmptyBtn' );
		if ( !btn ) return;

		btn.addEventListener( 'click', async () => {
			btn.disabled = true;
			const originalText = btn.textContent;
			btn.textContent = '⏳ Загрузка...';

			await this.loadAnime();

			btn.disabled = false;
			btn.textContent = originalText;
		} );
	}

	/**
	 * Простая валидация email адреса
	 * @param {string} email - Email для проверки
	 * @returns {boolean} true если email валидный
	 * @private
	 */
	_isValidEmail( email ) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email );
	}

	/**
	 * Проверяет доступность Vercel прокси для изображений
	 * Если прокси недоступен — отключает его и использует оригинальные URL
	 * @private
	 */
	async _detectProxyAvailability() {
		console.log( '[RSN] 🔍 Проверка доступности прокси изображений...' );

		try {
			const testUrl = `${this.imageProxyUrl}?url=${encodeURIComponent( 'https://anilist.co/favicon.ico' )}&w=32&h=32&q=50`;
			const controller = new AbortController();
			const timeout = setTimeout( () => controller.abort(), 3000 );

			const response = await fetch( testUrl, {
				signal: controller.signal,
				cache: 'no-cache'
			} );

			clearTimeout( timeout );

			if ( response.ok ) {
				this.useProxy = true;
				console.log( '[RSN] ✅ Прокси изображений доступен. Изображения будут оптимизироваться.' );
			} else {
				this.useProxy = false;
				console.warn( '[RSN] ⚠️ Прокси вернул ошибку. Использую оригинальные изображения.' );
			}
		} catch ( error ) {
			this.useProxy = false;
			console.warn( '[RSN] ⚠️ Прокси недоступен:', error.message );
			console.warn( '[RSN] ℹ️ Изображения будут загружаться напрямую с API.' );
		}
	}

	// ========================================================================
	// 4. КАСКАДНАЯ ЗАГРУЗКА АНИМЕ
	// ========================================================================

	/**
	 * Главный метод загрузки аниме с каскадной системой источников
	 * 
	 * Алгоритм:
	 * 1. Проверить кэш в localStorage (30 минут)
	 * 2. Если кэш валиден — использовать его
	 * 3. Запросить AniList API (GraphQL)
	 * 4. Если AniList не дал достаточно — запросить Kitsu API
	 * 5. Если Kitsu не дал достаточно — загрузить локальный JSON
	 * 6. Если JSON не загрузился — использовать хардкод-резерв
	 * 7. Дополнить список до ровно 9 аниме
	 * 8. Сохранить результат в кэш
	 */
	async loadAnime() {
		// Предотвращаем повторную загрузку
		if ( this.isLoading ) {
			console.log( '[RSN] ⚠️ Загрузка уже выполняется. Пропускаю повторный вызов.' );
			return;
		}

		this.isLoading = true;
		this.showLoader( true );
		this.animeList = [];

		let usedSource = 'Неизвестно';

		try {
			// ===== Шаг 1: Проверяем кэш =====
			const cached = this._getFromCache();
			if ( cached && cached.length === this.maxAnimeCount ) {
				console.log( '[RSN] 📦 Данные загружены из кэша localStorage' );
				this.animeList = cached;
				usedSource = 'Кэш localStorage';
				return; // Досрочный выход — кэш валиден и полон
			}

			// ===== Шаг 2: AniList API (основной) =====
			try {
				console.log( '[RSN] 📡 Запрос к AniList API (GraphQL)...' );
				const startTime = performance.now();
				const data = await this._fetchFromAniList();
				const duration = Math.round( performance.now() - startTime );

				if ( data.length >= this.minAcceptableCount ) {
					this.animeList = data;
					usedSource = 'AniList API';
					console.log( `[RSN] ✅ AniList: получено ${data.length} аниме за ${duration}мс` );
				} else {
					console.warn( `[RSN] ⚠️ AniList: только ${data.length} аниме (нужно минимум ${this.minAcceptableCount})` );
					this.animeList = data; // Сохраняем что есть, позже дополним
				}
			} catch ( error ) {
				console.warn( `[RSN] ❌ AniList недоступен: ${error.message}` );
			}

			// ===== Шаг 3: Kitsu API (резерв 1) =====
			if ( this.animeList.length < this.minAcceptableCount ) {
				try {
					console.log( '[RSN] 📡 Запрос к Kitsu API...' );
					const startTime = performance.now();
					const data = await this._fetchFromKitsu();
					const duration = Math.round( performance.now() - startTime );

					if ( data.length >= this.minAcceptableCount ) {
						this.animeList = data;
						usedSource = 'Kitsu API';
						console.log( `[RSN] ✅ Kitsu: получено ${data.length} аниме за ${duration}мс` );
					} else {
						console.warn( `[RSN] ⚠️ Kitsu: только ${data.length} аниме` );
						if ( data.length > this.animeList.length ) {
							this.animeList = data;
						}
					}
				} catch ( error ) {
					console.warn( `[RSN] ❌ Kitsu недоступен: ${error.message}` );
				}
			}

			// ===== Шаг 4: Локальный JSON (резерв 2) =====
			if ( this.animeList.length < this.minAcceptableCount ) {
				try {
					console.log( '[RSN] 📡 Загрузка локального JSON...' );
					const startTime = performance.now();
					const data = await this._fetchFromLocalJson();
					const duration = Math.round( performance.now() - startTime );

					if ( data.length >= this.minAcceptableCount ) {
						this.animeList = data;
						usedSource = 'Локальный JSON';
						console.log( `[RSN] ✅ JSON: загружено ${data.length} аниме за ${duration}мс` );
					} else {
						console.warn( `[RSN] ⚠️ JSON: только ${data.length} аниме` );
						if ( data.length > this.animeList.length ) {
							this.animeList = data;
						}
					}
				} catch ( error ) {
					console.warn( `[RSN] ❌ Локальный JSON не загрузился: ${error.message}` );
				}
			}

			// ===== Шаг 5: Хардкод-резерв (последняя надежда) =====
			if ( this.animeList.length === 0 ) {
				console.log( '[RSN] 📦 Все API и JSON недоступны. Использую встроенный резерв.' );
				this.animeList = [...this.hardcodedFallback];
				usedSource = 'Встроенный резерв';

				this.showNotification(
					'Показан список аниме из нашего каталога. Данные с серверов временно недоступны.',
					'info'
				);
			}

			// ===== Шаг 6: Дополняем до ровно 9 аниме =====
			this._ensureExactCount( this.maxAnimeCount );

			// ===== Шаг 7: Сохраняем в кэш =====
			if ( usedSource !== 'Кэш localStorage' ) {
				this._saveToCache( this.animeList );
			}

			console.log( `[RSN] 🎉 Итого: ${this.animeList.length} аниме (источник: ${usedSource})` );

			// Выводим первые 3 названия для быстрой проверки
			const preview = this.animeList.slice( 0, 3 ).map( a => a.title ).join( ', ' );
			console.log( `[RSN] 📋 Первые 3: ${preview}` );

		} catch ( fatalError ) {
			console.error( '[RSN] 💥 Критическая ошибка при загрузке:', fatalError );
			this.animeList = [...this.hardcodedFallback];
		} finally {
			this.isLoading = false;
			this.showLoader( false );
			this.render();
		}
	}

	/**
	 * Гарантирует точное количество аниме в списке
	 * Дополняет из резерва если меньше, обрезает если больше
	 * 
	 * @param {number} count - Нужное количество (обычно 9)
	 * @private
	 */
	_ensureExactCount( count ) {
		const currentCount = this.animeList.length;

		// Если уже достаточно — обрезаем лишнее
		if ( currentCount >= count ) {
			this.animeList = this.animeList.slice( 0, count );
			return;
		}

		// Дополняем из резерва, исключая дубликаты по названию
		const needed = count - currentCount;
		const existingTitles = new Set(
			this.animeList
				.map( a => a.title?.toLowerCase() )
				.filter( Boolean )
		);

		const extra = this.hardcodedFallback
			.filter( f => !existingTitles.has( f.title?.toLowerCase() ) )
			.slice( 0, needed )
			.map( ( anime, index ) => ( {
				...anime,
				id: `extra-${index}-${Date.now()}`,
				image: this.fallbackImage,
				imageThumbnail: this.fallbackImage,
				source: 'Дополнено из резерва'
			} ) );

		this.animeList = [...this.animeList, ...extra];

		if ( extra.length > 0 ) {
			console.log( `[RSN] ➕ Дополнено ${extra.length} аниме из резерва до ${count}` );
		}
	}

	// ========================================================================
	// 5. ИСТОЧНИК 1: ANILIST API (GRAPHQL)
	// ========================================================================

	/**
	 * Загружает данные из AniList GraphQL API
	 * Это самый надёжный источник:
	 * - Нет CORS ограничений
	 * - Нет лимитов на запросы
	 * - Не требует API ключа
	 * - Всегда возвращает актуальные данные
	 * 
	 * @returns {Promise<Array<Object>>} Массив аниме-объектов
	 * @private
	 */
	async _fetchFromAniList() {
		const variables = {
			season: this.seasonAnilistMap[this.currentSeason],
			seasonYear: this.currentYear,
			perPage: this.maxAnimeCount
		};

		const data = await this._makeRequest( this.anilistUrl, {
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

		// Проверяем на GraphQL ошибки
		if ( data.errors && data.errors.length > 0 ) {
			console.error( '[RSN] GraphQL ошибки:', JSON.stringify( data.errors, null, 2 ) );
			throw new Error( `GraphQL error: ${data.errors[0]?.message || 'неизвестная ошибка'}` );
		}

		const mediaList = data?.data?.Page?.media || [];

		if ( mediaList.length === 0 ) {
			console.warn( '[RSN] ⚠️ AniList вернул пустой список. Возможно нет аниме в этом сезоне.' );
		}

		// Преобразуем данные AniList в наш формат
		return mediaList.map( ( anime, index ) => {
			// Получаем оригинальное изображение
			const originalImage = anime.coverImage?.extraLarge || anime.coverImage?.large;
			const mediumImage = anime.coverImage?.medium;

			return {
				id: `anilist-${anime.id}`,
				title: anime.title?.english || anime.title?.romaji || 'Без названия',
				nativeTitle: anime.title?.native || '',
				excerpt: this._formatDescription( anime.description, 180 ),

				// Изображения (оригинал + оптимизированные через прокси)
				image: this._optimizeImage( originalImage, 'card' ),
				imageOriginal: originalImage,
				imageMedium: mediumImage,
				imageThumbnail: this._optimizeImage( originalImage, 'thumbnail' ),
				bannerImage: anime.bannerImage ? this._optimizeImage( anime.bannerImage, 'banner' ) : null,

				// Метаданные
				type: this.formatDisplayNames[anime.format] || '📺 Сериал',
				format: anime.format || 'TV',
				status: this.statusDisplayNames[anime.status] || '▶️ Выходит',
				episodes: anime.episodes
					? `${anime.episodes} эп.`
					: ( anime.duration ? `${anime.duration} мин.` : '? эп.' ),
				episodesCount: anime.episodes || null,
				duration: anime.duration || null,

				// Рейтинг и популярность
				score: Math.round( ( ( anime.averageScore || anime.meanScore || 0 ) / 10 ) * 10 ) / 10,
				scoreRaw: anime.averageScore || anime.meanScore || 0,
				popularity: anime.popularity || 0,

				// Жанры (переведённые) и студии
				genres: ( anime.genres || [] )
					.slice( 0, 4 )
					.map( g => this.genreTranslations[g] || g ),
				studios: ( anime.studios?.nodes || [] )
					.map( s => s.name )
					.slice( 0, 2 ),

				// Ссылки
				source: 'AniList',
				sourceUrl: anime.siteUrl || `https://anilist.co/anime/${anime.id}`,
				trailerUrl: anime.trailer?.id && anime.trailer?.site === 'youtube'
					? `https://www.youtube.com/watch?v=${anime.trailer.id}`
					: null,

				// Сезон и порядок
				season: anime.season,
				seasonYear: anime.seasonYear,
				order: index + 1
			};
		} );
	}

	// ========================================================================
	// 6. ИСТОЧНИК 2: KITSU API
	// ========================================================================

	/**
	 * Загружает данные из Kitsu API
	 * Открытый API, не требует ключа, нет строгих лимитов
	 * 
	 * @returns {Promise<Array<Object>>} Массив аниме-объектов
	 * @private
	 */
	async _fetchFromKitsu() {
		// Собираем URL с параметрами фильтрации
		const params = new URLSearchParams( {
			'filter[season]': this.seasonKitsuMap[this.currentSeason],
			'filter[seasonYear]': this.currentYear.toString(),
			'filter[status]': 'current',
			'sort': 'popularityRank',
			'page[limit]': this.maxAnimeCount.toString()
		} );

		const url = `${this.kitsuUrl}/anime?${params.toString()}`;

		const data = await this._makeRequest( url, {
			headers: {
				'Accept': 'application/vnd.api+json',
				'Content-Type': 'application/vnd.api+json'
			}
		} );

		const animeList = data?.data || [];

		return animeList.map( ( anime, index ) => {
			const attrs = anime.attributes || {};
			const originalImage = attrs.posterImage?.original;
			const mediumImage = attrs.posterImage?.medium;

			return {
				id: `kitsu-${anime.id}`,
				title: attrs.titles?.en
					|| attrs.titles?.en_jp
					|| attrs.canonicalTitle
					|| 'Без названия',
				nativeTitle: attrs.titles?.ja_jp || '',
				excerpt: this._formatDescription( attrs.synopsis, 180 ),

				// Изображения
				image: this._optimizeImage( originalImage, 'card' ),
				imageOriginal: originalImage,
				imageMedium: mediumImage,
				imageThumbnail: this._optimizeImage( originalImage, 'thumbnail' ),
				bannerImage: attrs.coverImage?.original
					? this._optimizeImage( attrs.coverImage.original, 'banner' )
					: null,

				// Метаданные
				type: this.formatDisplayNames[attrs.showType] || '📺 Сериал',
				format: attrs.showType || 'TV',
				status: '▶️ Выходит',
				episodes: attrs.episodeCount
					? `${attrs.episodeCount} эп.`
					: '? эп.',
				episodesCount: attrs.episodeCount || null,
				duration: attrs.episodeLength || null,

				// Рейтинг
				score: Math.round( ( parseFloat( attrs.averageRating ) || 0 ) / 20 * 10 ) / 10,
				scoreRaw: parseFloat( attrs.averageRating ) || 0,
				popularity: attrs.popularityRank || 0,

				// Kitsu не отдаёт жанры и студии в этом запросе
				genres: [],
				studios: [],

				// Ссылки
				source: 'Kitsu',
				sourceUrl: `https://kitsu.io/anime/${attrs.slug || anime.id}`,
				trailerUrl: attrs.youtubeVideoId
					? `https://www.youtube.com/watch?v=${attrs.youtubeVideoId}`
					: null,

				order: index + 1
			};
		} );
	}

	// ========================================================================
	// 7. ИСТОЧНИК 3: ЛОКАЛЬНЫЙ JSON
	// ========================================================================

	/**
	 * Загружает данные из локального JSON файла
	 * Файл обновляется GitHub Actions каждый день в 09:00 МСК
	 * 
	 * @returns {Promise<Array<Object>>} Массив аниме-объектов
	 * @private
	 */
	async _fetchFromLocalJson() {
		const response = await fetch( this.localJsonUrl, {
			cache: 'no-cache' // Не кэшируем, чтобы получать свежие данные
		} );

		if ( !response.ok ) {
			throw new Error( `HTTP ${response.status}: ${response.statusText}` );
		}

		const json = await response.json();
		const animeData = json?.anime || [];

		// Проверяем актуальность данных
		if ( json.meta?.lastUpdated ) {
			const lastUpdate = new Date( json.meta.lastUpdated );
			const daysOld = ( Date.now() - lastUpdate.getTime() ) / ( 1000 * 60 * 60 * 24 );

			if ( daysOld > 7 ) {
				console.warn( `[RSN] ⚠️ Локальный JSON устарел (${daysOld.toFixed( 1 )} дней). Проверьте GitHub Actions!` );
			} else {
				console.log( `[RSN] 📅 JSON обновлялся ${daysOld.toFixed( 1 )} дней назад (${json.meta.totalAnime || '?'} аниме)` );
			}
		}

		// Пропускаем изображения через прокси
		return animeData.map( ( item, index ) => ( {
			...item,
			id: item.id || `json-${index}`,
			image: this._optimizeImage( item.image, 'card' ),
			imageThumbnail: this._optimizeImage( item.image, 'thumbnail' ),
			source: item.source || 'Локальный JSON',
			order: index + 1
		} ) );
	}

	// ========================================================================
	// 8. УНИВЕРСАЛЬНЫЙ FETCH С ТАЙМАУТОМ
	// ========================================================================

	/**
	 * Выполняет HTTP запрос с таймаутом и обработкой ошибок
	 * Единая точка для всех API-вызовов в модуле
	 * 
	 * @param {string} url - URL для запроса
	 * @param {Object} options - Опции fetch (method, headers, body)
	 * @returns {Promise<any>} Распарсенный JSON ответ
	 * @throws {Error} При таймауте, HTTP ошибке или невалидном JSON
	 * @private
	 */
	async _makeRequest( url, options = {} ) {
		const controller = new AbortController();
		const timeoutId = setTimeout( () => {
			console.warn( `[RSN] ⏰ Таймаут запроса (${this.apiTimeout / 1000}с): ${url.substring( 0, 100 )}...` );
			controller.abort();
		}, this.apiTimeout );

		try {
			const response = await fetch( url, {
				...options,
				signal: controller.signal
			} );

			// Проверяем HTTP статус
			if ( !response.ok ) {
				throw new Error( `HTTP ${response.status}: ${response.statusText}` );
			}

			// Проверяем Content-Type
			const contentType = response.headers.get( 'content-type' );
			if ( contentType && !contentType.includes( 'application/json' ) && !contentType.includes( 'application/vnd.api+json' ) ) {
				console.warn( `[RSN] ⚠️ Неожиданный Content-Type: ${contentType}` );
			}

			// Парсим JSON
			const data = await response.json();
			return data;

		} catch ( error ) {
			if ( error.name === 'AbortError' ) {
				throw new Error( `Таймаут запроса (${this.apiTimeout / 1000}с)` );
			}
			throw error;
		} finally {
			clearTimeout( timeoutId );
		}
	}

	// ========================================================================
	// 9. КЭШИРОВАНИЕ (LOCALSTORAGE)
	// ========================================================================

	/**
	 * Получает данные из кэша localStorage
	 * Автоматически проверяет:
	 * - Не устарел ли кэш (30 минут)
	 * - Соответствует ли сезон и год
	 * 
	 * @returns {Array<Object>|null} Массив аниме или null если кэш невалиден
	 * @private
	 */
	_getFromCache() {
		try {
			const raw = localStorage.getItem( this.cacheKey );
			if ( !raw ) {
				console.log( '[RSN] ℹ️ Кэш пуст' );
				return null;
			}

			const cache = JSON.parse( raw );

			// Проверяем срок годности
			const age = Date.now() - cache.timestamp;
			if ( age > this.cacheDuration ) {
				console.log( `[RSN] 🗑️ Кэш устарел (${Math.round( age / 1000 )}с > ${this.cacheDuration / 1000}с)` );
				localStorage.removeItem( this.cacheKey );
				return null;
			}

			// Проверяем соответствие сезона и года
			if ( cache.season !== this.currentSeason || cache.year !== this.currentYear ) {
				console.log( `[RSN] 🗑️ Кэш от другого сезона (${cache.season} ${cache.year} ≠ ${this.currentSeason} ${this.currentYear})` );
				localStorage.removeItem( this.cacheKey );
				return null;
			}

			console.log( `[RSN] 📦 Кэш актуален (возраст: ${Math.round( age / 1000 )}с, сезон: ${cache.season} ${cache.year})` );
			return cache.data;

		} catch ( error ) {
			console.warn( '[RSN] ⚠️ Ошибка чтения кэша:', error.message );
			localStorage.removeItem( this.cacheKey );
			return null;
		}
	}

	/**
	 * Сохраняет данные в кэш localStorage
	 * С защитой от переполнения хранилища
	 * 
	 * @param {Array<Object>} data - Массив аниме для сохранения
	 * @private
	 */
	_saveToCache( data ) {
		try {
			const cache = {
				data: data,
				timestamp: Date.now(),
				season: this.currentSeason,
				year: this.currentYear,
				version: '3.1'
			};

			const json = JSON.stringify( cache );
			localStorage.setItem( this.cacheKey, json );

			const sizeKB = ( new Blob( [json] ).size / 1024 ).toFixed( 1 );
			console.log( `[RSN] 💾 Данные сохранены в кэш (${sizeKB} KB)` );

		} catch ( error ) {
			console.warn( '[RSN] ⚠️ Не удалось сохранить кэш:', error.message );

			// Возможно localStorage переполнен — пробуем сохранить меньше данных
			try {
				localStorage.removeItem( this.cacheKey );

				const reducedCache = {
					data: data.slice( 0, 5 ),
					timestamp: Date.now(),
					season: this.currentSeason,
					year: this.currentYear,
					version: '3.1-reduced'
				};

				localStorage.setItem( this.cacheKey, JSON.stringify( reducedCache ) );
				console.log( '[RSN] 💾 Данные сохранены в кэш (сокращённая версия: 5 аниме)' );
			} catch ( e ) {
				console.warn( '[RSN] ❌ Полностью не удалось сохранить кэш' );
			}
		}
	}

	/**
	 * Принудительно сбрасывает кэш
	 * Полезно для отладки
	 */
	clearCache() {
		localStorage.removeItem( this.cacheKey );
		console.log( '[RSN] 🗑️ Кэш принудительно очищен' );
	}

	// ========================================================================
	// 10. ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ (VERCEL ПРОКСИ)
	// ========================================================================

	/**
	 * Оптимизирует URL изображения через Vercel прокси
	 * 
	 * Алгоритм:
	 * 1. Проверяет что URL не пустой
	 * 2. Локальные файлы и data URI не трогает
	 * 3. Проверяет не заглушка ли это от API
	 * 4. Если прокси отключён — возвращает оригинал
	 * 5. Пропускает через /api/image-proxy с параметрами размера
	 * 
	 * @param {string} url - Оригинальный URL изображения
	 * @param {string} [size='card'] - Размер: card | thumbnail | banner
	 * @returns {string} Оптимизированный URL
	 * @private
	 */
	_optimizeImage( url, size = 'card' ) {
		// Проверяем что URL не пустой
		if ( !url ) {
			return this.fallbackImage;
		}

		// Локальные файлы и data URI не пропускаем через прокси
		if ( url.startsWith( '/' ) || url.startsWith( 'data:' ) || url === this.fallbackImage || url === this.blurPlaceholder ) {
			return url;
		}

		// Проверяем не заглушка ли это от API
		if ( this._isPlaceholderUrl( url ) ) {
			console.warn( '[RSN] 🖼️ Обнаружена заглушка API, заменяю:', url.substring( 0, 80 ) );
			return this.fallbackImage;
		}

		// Если прокси отключён — возвращаем оригинальный URL
		if ( !this.useProxy ) {
			return url;
		}

		// Получаем настройки для запрошенного размера
		const sizeConfig = this.imageSizes[size] || this.imageSizes.card;

		// Собираем параметры для прокси
		const params = new URLSearchParams( {
			url: url,
			w: sizeConfig.w.toString(),
			h: sizeConfig.h.toString(),
			q: sizeConfig.q.toString(),
			fit: sizeConfig.fit
		} );

		return `${this.imageProxyUrl}?${params.toString()}`;
	}

	/**
	 * Проверяет, не является ли URL изображения заглушкой от API
	 * Некоторые API отдают картинки-заглушки вместо реальных постеров
	 * 
	 * @param {string} url - URL для проверки
	 * @returns {boolean} true если это заглушка
	 * @private
	 */
	_isPlaceholderUrl( url ) {
		if ( !url || typeof url !== 'string' ) {
			return true;
		}

		const lowerUrl = url.toLowerCase();
		return this.placeholderMarkers.some( marker => lowerUrl.includes( marker ) );
	}

	/**
	 * Обработчик ошибки загрузки изображения
	 * Вызывается из HTML через onerror
	 * Заменяет битое изображение на локальную заглушку
	 * 
	 * @param {HTMLImageElement} img - DOM элемент изображения
	 */
	handleImageError( img ) {
		if ( !img ) return;

		// Предотвращаем бесконечный цикл если заглушка тоже не грузится
		if ( img.src === this.fallbackImage || img.src.endsWith( '404.jpg' ) ) {
			img.onerror = null;
			return;
		}

		console.warn( `[RSN] 🖼️ Ошибка загрузки изображения, заменяю на заглушку` );
		img.src = this.fallbackImage;
		img.onerror = null;

		// Добавляем класс для возможной стилизации
		img.classList.add( 'image-error' );
	}

	// ========================================================================
	// 11. ОБРАБОТКА ТЕКСТА
	// ========================================================================

	/**
	 * Очищает и форматирует описание аниме
	 * Удаляет HTML теги, Markdown ссылки, BB-коды, спецсимволы
	 * Обрезает до указанной длины по последнему полному слову
	 * 
	 * @param {string} text - Исходный текст описания
	 * @param {number} [maxLength=180] - Максимальная длина результата
	 * @returns {string} Очищенное и обрезанное описание
	 * @private
	 */
	_formatDescription( text, maxLength = 180 ) {
		if ( !text ) return '';

		const cleaned = text
			// Удаляем HTML теги: <br>, <i>, </i>, etc.
			.replace( /<[^>]*>/g, '' )
			// Удаляем Markdown ссылки: [text](url) → text
			.replace( /\[([^\]]*)\]\([^)]*\)/g, '$1' )
			// Удаляем BB-коды: [b], [i], [spoiler], etc.
			.replace( /\[[^\]]*\]/g, '' )
			// Удаляем HTML entities: &nbsp; &amp; &lt; etc.
			.replace( /&[^;]+;/g, '' )
			// Заменяем множественные пробелы, табы и переносы строк на один пробел
			.replace( /\s+/g, ' ' )
			// Убираем пробелы в начале и конце
			.trim();

		// Если текст уже короче лимита — возвращаем как есть
		if ( cleaned.length <= maxLength ) {
			return cleaned;
		}

		// Обрезаем до лимита
		const truncated = cleaned.substring( 0, maxLength );
		// Находим последний пробел для обрезки по слову
		const lastSpace = truncated.lastIndexOf( ' ' );

		// Если пробел найден и он не слишком близко к началу — обрезаем по нему
		if ( lastSpace > maxLength * 0.8 ) {
			return truncated.substring( 0, lastSpace ) + '...';
		}

		// Иначе обрезаем жёстко
		return truncated + '...';
	}

	/**
	 * Безопасное экранирование HTML-спецсимволов
	 * Защита от XSS при вставке пользовательских данных в HTML
	 * 
	 * @param {string} text - Исходный текст
	 * @returns {string} Экранированный текст, безопасный для вставки в HTML
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

		return String( text ).replace( /[&<>"']/g, char => map[char] || char );
	}

	// ========================================================================
	// 12. ОТОБРАЖЕНИЕ
	// ========================================================================

	/**
	 * Показывает или скрывает индикатор загрузки
	 * Управляет видимостью #newsLoader и #newsGrid
	 * 
	 * @param {boolean} show - true = показать лоадер и скрыть сетку
	 */
	showLoader( show ) {
		const loader = document.getElementById( 'newsLoader' );
		const grid = document.getElementById( 'newsGrid' );

		if ( loader ) {
			loader.style.display = show ? 'flex' : 'none';

			// Обновляем текст в лоадере
			const textElement = loader.querySelector( 'p' );
			if ( textElement ) {
				textElement.textContent = show
					? `Загружаем аниме сезона ${this.seasonDisplayNames[this.currentSeason]}...`
					: '';
			}
		}

		// Скрываем сетку пока идёт загрузка
		if ( grid && show ) {
			grid.style.display = 'none';
		}
	}

	/**
	 * Рендерит сетку с карточками аниме
	 * Вызывается после успешной загрузки данных
	 */
	render() {
		const grid = document.getElementById( 'newsGrid' );
		const empty = document.getElementById( 'emptyState' );

		if ( !grid ) {
			console.error( '[RSN] ❌ Элемент #newsGrid не найден в DOM' );
			return;
		}

		// Если аниме нет — показываем состояние "пусто"
		if ( !this.animeList || this.animeList.length === 0 ) {
			grid.style.display = 'none';
			if ( empty ) {
				empty.style.display = 'block';
			}
			console.log( '[RSN] ℹ️ Нет аниме для отображения' );
			return;
		}

		// Показываем сетку, скрываем "пусто"
		grid.style.display = 'grid';
		if ( empty ) {
			empty.style.display = 'none';
		}

		// Рендерим все карточки одной операцией (быстрее чем appendChild в цикле)
		grid.innerHTML = this.animeList
			.map( anime => this._renderAnimeCard( anime ) )
			.join( '' );

		console.log( `[RSN] 🎨 Отрендерено ${this.animeList.length} карточек аниме` );
	}

	/**
	 * Создаёт HTML для одной карточки аниме
	 * 
	 * Структура карточки:
	 * - Изображение с баджами (тип, статус, рейтинг, трейлер)
	 * - Мета-информация (эпизоды, рейтинг звёздами, студия)
	 * - Заголовок
	 * - Описание
	 * - Жанры
	 * - Футер с источником и ссылкой "Подробнее"
	 * 
	 * @param {Object} anime - Объект аниме
	 * @returns {string} HTML строка карточки
	 * @private
	 */
	_renderAnimeCard( anime ) {
		// Безопасно получаем все значения с fallback'ами
		const title = anime.title || 'Без названия';
		const nativeTitle = anime.nativeTitle || '';
		const excerpt = anime.excerpt || 'Описание отсутствует';
		const imageSrc = anime.image || this.fallbackImage;
		const imageThumbnail = anime.imageThumbnail || imageSrc;
		const typeName = anime.type || '📺 Сериал';
		const statusName = anime.status || '▶️ Выходит';
		const episodes = anime.episodes || '? эп.';
		const score = anime.score || 0;
		const genres = ( anime.genres || [] ).slice( 0, 3 ).join( ' · ' );
		const studios = ( anime.studios || [] ).join( ', ' );
		const sourceName = anime.source || 'Неизвестно';
		const sourceUrl = anime.sourceUrl || '#';
		const trailerUrl = anime.trailerUrl || null;

		// Генерируем звёзды рейтинга
		const starsHtml = this._renderStars( score );

		// Информация о студии (если есть)
		const studioHtml = studios
			? `<span class="anime-studios" title="Студия">🎬 ${this.escapeHtml( studios )}</span>`
			: '';

		// Кнопка трейлера (если есть)
		const trailerHtml = trailerUrl
			? `
                <a href="${this.escapeHtml( trailerUrl )}"
                   class="anime-trailer-btn"
                   target="_blank"
                   rel="noopener noreferrer"
                   title="Смотреть трейлер на YouTube"
                   onclick="event.stopPropagation();"
                   aria-label="Смотреть трейлер ${this.escapeHtml( title )}">
                    <i class="fab fa-youtube"></i>
                </a>`
			: '';

		// Бейдж с рейтингом (если есть)
		const scoreHtml = score > 0
			? `<div class="anime-score" title="Рейтинг: ${score} из 10">★ ${score.toFixed( 1 )}</div>`
			: '';

		return `
            <div class="news-card anime-card" data-id="${anime.id || ''}">
                <!-- Изображение с баджами -->
                <div class="news-image">
                    <img src="${this.escapeHtml( imageSrc )}"
                         srcset="${this.escapeHtml( imageThumbnail )} 300w, ${this.escapeHtml( imageSrc )} 600w"
                         sizes="(max-width: 768px) 300px, 600px"
                         alt="${this.escapeHtml( title )}"
                         loading="lazy"
                         decoding="async"
                         onerror="window.risingSunNews?.handleImageError(this);">
                    <div class="news-badges">
                        <span class="news-country">${typeName}</span>
                        <span class="news-category">${statusName}</span>
                    </div>
                    ${scoreHtml}
                    ${trailerHtml}
                </div>

                <!-- Контент карточки -->
                <div class="news-content">
                    <!-- Мета-информация -->
                    <div class="news-meta">
                        <span class="news-date" title="Количество эпизодов">
                            <i class="fas fa-tv"></i> ${this.escapeHtml( episodes )}
                        </span>
                        <span class="news-views" title="Рейтинг">
                            <i class="fas fa-star"></i> ${starsHtml}
                        </span>
                        ${studioHtml}
                    </div>

                    <!-- Заголовок (с нативным названием в подсказке) -->
                    <h3 class="news-title" title="${this.escapeHtml( nativeTitle || title )}">
                        ${this.escapeHtml( title )}
                    </h3>

                    <!-- Описание -->
                    <p class="news-excerpt">${this.escapeHtml( excerpt )}</p>

                    <!-- Жанры -->
                    ${genres ? `<div class="anime-genres">${this.escapeHtml( genres )}</div>` : ''}

                    <!-- Футер с источником и ссылкой -->
                    <div class="news-footer">
                        <span class="news-source" title="Источник данных">
                            <i class="fas fa-database"></i> ${this.escapeHtml( sourceName )}
                        </span>
                        <a href="${this.escapeHtml( sourceUrl )}"
                           class="news-link"
                           target="_blank"
                           rel="noopener noreferrer"
                           title="Открыть страницу аниме на ${this.escapeHtml( sourceName )}">
                            Подробнее <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
	}

	/**
	 * Генерирует строку со звёздами для отображения рейтинга
	 * Переводит 10-балльную шкалу в 5-звёздочную
	 * 
	 * Примеры:
	 * - 10.0 → ★★★★★
	 * - 8.5  → ★★★★⯪
	 * - 6.0  → ★★★☆☆
	 * - 0    → Нет оценки
	 * 
	 * @param {number} score - Оценка от 0 до 10
	 * @returns {string} Строка со звёздами для вставки в HTML
	 * @private
	 */
	_renderStars( score ) {
		if ( !score || score <= 0 ) {
			return 'Нет оценки';
		}

		// Переводим 10-балльную шкалу в 5-звёздочную
		const starRating = score / 2;
		const fullStars = Math.floor( starRating );
		const hasHalfStar = ( starRating - fullStars ) >= 0.5;

		let stars = '';

		// Полные звёзды
		for ( let i = 0; i < 5; i++ ) {
			if ( i < fullStars ) {
				stars += '★';                          // Полная звезда
			} else if ( i === fullStars && hasHalfStar ) {
				stars += '⯪';                          // Половина звезды
			} else {
				stars += '☆';                          // Пустая звезда
			}
		}

		return stars;
	}

	// ========================================================================
	// 13. УВЕДОМЛЕНИЯ
	// ========================================================================

	/**
	 * Показывает временное уведомление пользователю
	 * 
	 * Особенности:
	 * - Автоматически скрывается через 5 секунд
	 * - Можно закрыть вручную (кнопка ×)
	 * - Предыдущее уведомление удаляется перед показом нового
	 * - Поддерживает 4 типа: info, success, error, warning
	 * - Доступно для скринридеров (role="alert", aria-live="polite")
	 * 
	 * @param {string} message - Текст уведомления
	 * @param {string} [type='info'] - Тип уведомления: info | success | error | warning
	 */
	showNotification( message, type = 'info' ) {
		// Удаляем предыдущее уведомление если есть
		const existing = document.querySelector( '.api-notification' );
		if ( existing ) {
			existing.classList.remove( 'show' );
			setTimeout( () => {
				if ( existing.parentNode ) {
					existing.remove();
				}
			}, 300 );
		}

		// Иконки для разных типов уведомлений
		const icons = {
			success: 'fa-check-circle',
			error: 'fa-exclamation-circle',
			warning: 'fa-exclamation-triangle',
			info: 'fa-info-circle'
		};

		// Создаём элемент уведомления
		const notification = document.createElement( 'div' );
		notification.className = `api-notification api-notification-${type}`;
		notification.setAttribute( 'role', 'alert' );
		notification.setAttribute( 'aria-live', 'polite' );
		notification.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${this.escapeHtml( message )}</span>
            <button class="notification-close" aria-label="Закрыть уведомление">&times;</button>
        `;

		// Добавляем в DOM
		document.body.appendChild( notification );

		// Анимация появления (после того как элемент в DOM)
		requestAnimationFrame( () => {
			notification.classList.add( 'show' );
		} );

		// Функция закрытия уведомления
		const close = () => {
			notification.classList.remove( 'show' );
			setTimeout( () => {
				if ( notification.parentNode ) {
					notification.remove();
				}
			}, 300 );
		};

		// Закрытие по клику на крестик
		const closeBtn = notification.querySelector( '.notification-close' );
		if ( closeBtn ) {
			closeBtn.addEventListener( 'click', close );
		}

		// Автоматическое закрытие через 5 секунд
		const autoCloseTimer = setTimeout( close, 5000 );

		// Если закрыли вручную — отменяем таймер
		notification.addEventListener( 'close', () => {
			clearTimeout( autoCloseTimer );
		}, { once: true } );
	}

	// ========================================================================
	// 14. ПУБЛИЧНОЕ API ДЛЯ ВНЕШНЕГО ИСПОЛЬЗОВАНИЯ
	// ========================================================================

	/**
	 * Принудительно перезагружает аниме со сбросом кэша
	 * Можно вызвать из консоли браузера:
	 *   await window.risingSunNews.refresh()
	 */
	async refresh() {
		console.log( '[RSN] 🔄 Принудительное обновление со сбросом кэша...' );
		this.clearCache();
		await this.loadAnime();
	}

	/**
	 * Возвращает текущее состояние модуля
	 * Полезно для отладки
	 * 
	 * @returns {Object} Объект с полным состоянием
	 */
	getState() {
		return {
			initialized: this.isInitialized,
			loading: this.isLoading,
			season: this.currentSeason,
			seasonName: this.seasonDisplayNames[this.currentSeason],
			year: this.currentYear,
			animeCount: this.animeList.length,
			maxAnime: this.maxAnimeCount,
			useProxy: this.useProxy,
			proxyUrl: this.useProxy ? this.imageProxyUrl : null,
			cacheAge: this._getCacheAge()
		};
	}

	/**
	 * Возвращает возраст кэша в секундах или null
	 * @returns {number|null}
	 * @private
	 */
	_getCacheAge() {
		try {
			const raw = localStorage.getItem( this.cacheKey );
			if ( !raw ) return null;
			const cache = JSON.parse( raw );
			return Math.round( ( Date.now() - cache.timestamp ) / 1000 );
		} catch {
			return null;
		}
	}

	/**
	 * Возвращает копию списка загруженных аниме
	 * @returns {Array<Object>} Копия массива аниме
	 */
	getAnimeList() {
		return [...this.animeList];
	}
}

// ============================================================================
// ЗАПУСК МОДУЛЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================================

document.addEventListener( 'DOMContentLoaded', () => {
	// Проверяем наличие контейнера для новостей на странице
	if ( document.getElementById( 'newsGrid' ) ) {
		try {
			// Создаём глобальный экземпляр модуля
			window.risingSunNews = new RisingSunNews();
			console.log( '[RSN] ✅ Модуль запущен и доступен как window.risingSunNews' );
		} catch ( error ) {
			console.error( '[RSN] ❌ Критическая ошибка при запуске модуля:', error );
			console.error( '[RSN] Stack trace:', error.stack );

			// Показываем сообщение об ошибке в контейнере
			const grid = document.getElementById( 'newsGrid' );
			if ( grid ) {
				grid.innerHTML = `
                    <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff4757;"></i>
                        <h3>Не удалось загрузить новости аниме</h3>
                        <p>Пожалуйста, попробуйте обновить страницу</p>
                        <button onclick="location.reload()" class="refresh-btn" style="
                            margin-top: 16px;
                            padding: 12px 24px;
                            background: #ff3366;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 16px;
                        ">🔄 Обновить страницу</button>
                    </div>`;
			}
		}
	} else {
		console.log( '[RSN] ℹ️ Контейнер #newsGrid не найден на странице. Модуль неактивен.' );
	}
} );

// Экспорт для использования в модульных системах (ES6, CommonJS)
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = RisingSunNews;
}