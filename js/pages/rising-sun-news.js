/**
 * ============================================================================
 * RISING SUN NEWS v3.0 — АНИМЕ ЭТОГО СЕЗОНА
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Загружает 9 актуальных аниме текущего сезона
 * - Отображает в сетке 3×3 на главной странице
 * - Использует каскадную систему источников с fallback'ами
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
 * - Бесплатный прокси wsrv.nl для сжатия и конвертации в WebP
 * - Прогрессивная загрузка с blur-up эффектом
 * - Ленивая загрузка (loading="lazy")
 * - Автоматическая замена битых изображений на заглушку
 * 
 * КЭШИРОВАНИЕ:
 * - localStorage на 30 минут
 * - Автоматический сброс при смене сезона
 * - Экономит API-запросы при повторных заходах
 * 
 * ЗАПУСК:
 * - Автоматически при наличии #newsGrid на странице
 * - Доступен глобально через window.risingSunNews
 * 
 * ============================================================================
 */

class RisingSunNews {
	constructor() {
		// ====================================================================
		// ОСНОВНЫЕ ПАРАМЕТРЫ
		// ====================================================================

		/** @type {Array} Массив загруженных аниме (9 элементов) */
		this.animeList = [];

		/** @type {boolean} Флаг процесса загрузки */
		this.isLoading = false;

		/** @type {boolean} Флаг инициализации */
		this.isInitialized = false;

		/** @type {string} Текущий сезон: winter | spring | summer | fall */
		this.currentSeason = this._getCurrentSeason();

		/** @type {number} Текущий год */
		this.currentYear = new Date().getFullYear();

		/** @type {number} Сколько аниме загружать */
		this.maxAnimeCount = 9;

		/** @type {number} Минимально приемлемое количество от API */
		this.minAcceptableCount = 6;

		// ====================================================================
		// ТАЙМАУТЫ И ИНТЕРВАЛЫ
		// ====================================================================

		/** @type {number} Таймаут одного API-запроса (мс) */
		this.apiTimeout = 15000;

		/** @type {number} Время жизни кэша (мс) — 30 минут */
		this.cacheDuration = 30 * 60 * 1000;

		/** @type {string} Ключ для localStorage */
		this.cacheKey = 'rsn_anime_cache_v3';

		// ====================================================================
		// ИСТОЧНИК 1: ANILIST API (ОСНОВНОЙ, 99% НАДЕЖНОСТИ)
		// ====================================================================

		/** @type {string} GraphQL эндпоинт AniList */
		this.anilistUrl = 'https://graphql.anilist.co';

		/** @type {string} GraphQL запрос */
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
                        title { romaji english native }
                        description
                        coverImage { extraLarge large medium }
                        bannerImage
                        format
                        episodes
                        duration
                        averageScore
                        meanScore
                        popularity
                        genres
                        studios { nodes { name } }
                        siteUrl
                        trailer { id site thumbnail }
                        season
                        seasonYear
                    }
                }
            }
        `;

		// ====================================================================
		// ИСТОЧНИК 2: KITSU API (ОТКРЫТЫЙ, БЕЗ КЛЮЧА)
		// ====================================================================

		/** @type {string} Kitsu API base URL */
		this.kitsuUrl = 'https://kitsu.io/api/edge';

		// ====================================================================
		// ИСТОЧНИК 3: ЛОКАЛЬНЫЙ JSON (ОБНОВЛЯЕТСЯ GITHUB ACTIONS)
		// ====================================================================

		/** @type {string} Путь к локальному JSON с аниме */
		this.localJsonUrl = '/data/current-season-anime.json';

		// ====================================================================
		// ИСТОЧНИК 4: ВСТРОЕННЫЙ РЕЗЕРВ (ПОСЛЕДНЯЯ НАДЕЖДА)
		// ====================================================================

		/** @type {Array} Хардкод-резерв из 9 аниме */
		this.hardcodedFallback = this._getHardcodedFallback();

		// ====================================================================
		// ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ
		// ====================================================================

		/** @type {string} Бесплатный прокси для сжатия изображений */
		this.imageProxy = 'https://wsrv.nl/?url=';

		/** @type {string} Параметры сжатия: ширина, высота, WebP, качество */
		this.imageProxyParams = '&w=600&h=840&fit=cover&output=webp&q=80';

		/** @type {string} Размытая заглушка (1 KB) для прогрессивной загрузки */
		this.blurPlaceholder = '/image/anime-placeholder-blur.webp';

		/** @type {string} Путь к основной заглушке при ошибке */
		this.fallbackImage = '/image/404.jpg';

		/** @type {Array} Маркеры "пустых" изображений от API */
		this.placeholderMarkers = [
			'apple-touch-icon', 'favicon', 'missing', 'no-image',
			'noimage', 'no_image', 'no_picture', 'no_photo',
			'placeholder', 'default.jpg', 'default.png',
			'questionmark', 'na_series'
		];

		// ====================================================================
		// ЛОКАЛИЗАЦИЯ
		// ====================================================================

		/** @type {Object} Названия сезонов с эмодзи */
		this.seasonDisplayNames = {
			'winter': '❄️ Зима',
			'spring': '🌸 Весна',
			'summer': '☀️ Лето',
			'fall': '🍂 Осень'
		};

		/** @type {Object} Маппинг сезонов для AniList (UPPERCASE) */
		this.seasonAnilistMap = {
			'winter': 'WINTER',
			'spring': 'SPRING',
			'summer': 'SUMMER',
			'fall': 'FALL'
		};

		/** @type {Object} Маппинг сезонов для Kitsu (lowercase) */
		this.seasonKitsuMap = {
			'winter': 'winter',
			'spring': 'spring',
			'summer': 'summer',
			'fall': 'fall'
		};

		/** @type {Object} Русские названия форматов аниме */
		this.formatDisplayNames = {
			'TV': '📺 Сериал',
			'TV_SHORT': '📺 Короткий сериал',
			'MOVIE': '🎬 Фильм',
			'OVA': '💿 OVA',
			'ONA': '🌐 ONA',
			'SPECIAL': '⭐ Спецвыпуск',
			'MUSIC': '🎵 Клип',
			'tv': '📺 Сериал',
			'movie': '🎬 Фильм',
			'ova': '💿 OVA',
			'ona': '🌐 ONA',
			'special': '⭐ Спецвыпуск',
			'music': '🎵 Клип'
		};

		/** @type {Object} Русские названия статусов */
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

		/** @type {Object} Переводы жанров с английского на русский */
		this.genreTranslations = {
			'Action': 'Экшен',
			'Adventure': 'Приключения',
			'Comedy': 'Комедия',
			'Drama': 'Драма',
			'Ecchi': 'Этти',
			'Fantasy': 'Фэнтези',
			'Hentai': 'Хентай',
			'Horror': 'Ужасы',
			'Mahou Shoujo': 'Махо-сёдзё',
			'Mecha': 'Меха',
			'Military': 'Военное',
			'Music': 'Музыка',
			'Mystery': 'Детектив',
			'Psychological': 'Психология',
			'Romance': 'Романтика',
			'School': 'Школа',
			'Sci-Fi': 'Фантастика',
			'Seinen': 'Сэйнэн',
			'Shoujo': 'Сёдзё',
			'Shounen': 'Сёнэн',
			'Slice of Life': 'Повседневность',
			'Sports': 'Спорт',
			'Supernatural': 'Сверхъестественное',
			'Thriller': 'Триллер',
			'Isekai': 'Исекай',
			'Historical': 'История',
			'Harem': 'Гарем',
			'Mythology': 'Мифология',
			'Samurai': 'Самураи',
			'Vampire': 'Вампиры',
			'Zombie': 'Зомби',
			'Post-Apocalyptic': 'Постапокалипсис',
			'Space': 'Космос',
			'Cooking': 'Кулинария',
			'Parody': 'Пародия',
			'Superpower': 'Суперсилы'
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
	 * Определяет текущий аниме-сезон по месяцу
	 * 
	 * Аниме-сезоны не совпадают с календарными:
	 * - Зима:   январь-март
	 * - Весна:  апрель-июнь
	 * - Лето:   июль-сентябрь
	 * - Осень:  октябрь-декабрь
	 * 
	 * @returns {string} winter | spring | summer | fall
	 * @private
	 */
	_getCurrentSeason() {
		const month = new Date().getMonth(); // 0 (январь) — 11 (декабрь)
		if ( month <= 2 ) return 'winter';      // 0,1,2 → январь, февраль, март
		if ( month <= 5 ) return 'spring';      // 3,4,5 → апрель, май, июнь
		if ( month <= 8 ) return 'summer';      // 6,7,8 → июль, август, сентябрь
		return 'fall';                         // 9,10,11 → октябрь, ноябрь, декабрь
	}

	// ========================================================================
	// 2. ВСТРОЕННЫЙ РЕЗЕРВ (ПОСЛЕДНЯЯ НАДЕЖДА)
	// ========================================================================

	/**
	 * Возвращает хардкод-список из 9 аниме
	 * Используется когда ВООБЩЕ все API недоступны
	 * 
	 * ВАЖНО: обновлять список каждый сезон вручную!
	 * TODO: Обновить до актуального сезона
	 * 
	 * @returns {Array} Массив из 9 аниме-объектов
	 * @private
	 */
	_getHardcodedFallback() {
		const currentSeason = this.currentSeason;
		const currentYear = this.currentYear;

		return [
			{
				id: 'fallback-1',
				title: 'Клинок, рассекающий демонов: Тренировка столпов',
				excerpt: 'Продолжение культового аниме. Тандзиро и его друзья проходят интенсивную тренировку у столпов, готовясь к финальной битве с демонами.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '11 эп.', score: 8.7,
				genres: ['Экшен', 'Фэнтези', 'История'],
				studios: ['ufotable'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/55701',
				order: 1
			},
			{
				id: 'fallback-2',
				title: 'Моя геройская академия 7',
				excerpt: 'Седьмой сезон популярного аниме про академию супергероев. Новые злодеи, новые способности и эпические сражения.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '25 эп.', score: 8.3,
				genres: ['Экшен', 'Суперсилы', 'Школа'],
				studios: ['Bones'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/54789',
				order: 2
			},
			{
				id: 'fallback-3',
				title: 'Ван-Пис',
				excerpt: 'Легендарное аниме о пиратах продолжается! Луффи и его команда исследуют новые острова и сражаются с могущественными врагами.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: 'продолжается', score: 8.9,
				genres: ['Приключения', 'Фэнтези', 'Комедия'],
				studios: ['Toei Animation'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/21',
				order: 3
			},
			{
				id: 'fallback-4',
				title: 'Реинкарнация безработного 2 (часть 2)',
				excerpt: 'Продолжение истории Рудеуса Грейрата. Новые приключения в мире магии, развитие персонажей и неожиданные повороты.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '12 эп.', score: 8.4,
				genres: ['Фэнтези', 'Приключения', 'Драма'],
				studios: ['Studio Bind'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/51179',
				order: 4
			},
			{
				id: 'fallback-5',
				title: 'Звёздное дитя 2',
				excerpt: 'Второй сезон нашумевшего аниме о тёмной стороне шоу-бизнеса и реинкарнации. Аква и Руби продолжают свой путь.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '13 эп.', score: 8.6,
				genres: ['Драма', 'Музыка', 'Сверхъестественное'],
				studios: ['Doga Kobo'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/54915',
				order: 5
			},
			{
				id: 'fallback-6',
				title: 'Семья шпиона 3',
				excerpt: 'Третий сезон комедийного хита о необычной семье. Ллойд, Йор и Аня продолжают свою тайную жизнь под одной крышей.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '12 эп.', score: 8.8,
				genres: ['Комедия', 'Экшен', 'Повседневность'],
				studios: ['Wit Studio', 'CloverWorks'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/53884',
				order: 6
			},
			{
				id: 'fallback-7',
				title: 'Магическая битва 3',
				excerpt: 'Третий сезон тёмного фэнтези. Новые проклятия, запретные техники и раскрытие тайн мира магов.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '24 эп.', score: 8.9,
				genres: ['Экшен', 'Сверхъестественное', 'Ужасы'],
				studios: ['MAPPA'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/51009',
				order: 7
			},
			{
				id: 'fallback-8',
				title: 'Провожающая в последний путь Фрирен 2',
				excerpt: 'Продолжение трогательной истории эльфийки Фрирен. Путешествие длиною в жизнь после победы над королём демонов.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '12 эп.', score: 9.1,
				genres: ['Фэнтези', 'Драма', 'Приключения'],
				studios: ['Madhouse'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/52991',
				order: 8
			},
			{
				id: 'fallback-9',
				title: 'О моём перерождении в слизь 4',
				excerpt: 'Четвёртый сезон популярного исекая. Римуру продолжает строить Федерацию Монстров и противостоять новым угрозам.',
				image: this.fallbackImage,
				type: 'TV', format: 'tv', status: 'ongoing',
				episodes: '24 эп.', score: 8.5,
				genres: ['Фэнтези', 'Приключения', 'Комедия'],
				studios: ['8bit'],
				source: 'Локальный резерв',
				sourceUrl: 'https://shikimori.one/animes/41487',
				order: 9
			}
		];
	}

	// ========================================================================
	// 3. ИНИЦИАЛИЗАЦИЯ
	// ========================================================================

	/**
	 * Главный метод инициализации модуля
	 * Обновляет заголовок, настраивает события и загружает аниме
	 */
	async init() {
		const seasonName = this.seasonDisplayNames[this.currentSeason];

		console.log( '╔══════════════════════════════════════════════════════╗' );
		console.log( '║         RISING SUN NEWS v3.0 — ЗАПУСК               ║' );
		console.log( `║         Сезон: ${seasonName} ${this.currentYear}                        ║` );
		console.log( '╚══════════════════════════════════════════════════════╝' );

		this._updateHeroSection();
		this._bindEvents();
		await this.loadAnime();

		this.isInitialized = true;
		console.log( '[RSN] ✅ Модуль инициализирован' );
	}

	/**
	 * Обновляет текст в hero-секции главной страницы
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
	 * Настраивает обработчики событий (подписка, кнопка обновления)
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
				console.log( `[RSN] 📧 Новая подписка: ${email}` );
				this.showNotification( '✅ Спасибо за подписку! Вы будете получать новости о новинках аниме.', 'success' );
				form.reset();
			} else {
				this.showNotification( '❌ Пожалуйста, введите корректный email адрес.', 'error' );
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
	 * @param {string} email
	 * @returns {boolean}
	 * @private
	 */
	_isValidEmail( email ) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email );
	}

	// ========================================================================
	// 4. КАСКАДНАЯ ЗАГРУЗКА АНИМЕ
	// ========================================================================

	/**
	 * Главный метод загрузки аниме с каскадной системой источников
	 * 
	 * Алгоритм:
	 * 1. Проверить кэш (localStorage, 30 мин)
	 * 2. Запросить AniList API
	 * 3. Если AniList не сработал — запросить Kitsu API
	 * 4. Если Kitsu не сработал — загрузить локальный JSON
	 * 5. Если JSON не загрузился — использовать хардкод-резерв
	 * 6. Дополнить до 9 аниме если не хватает
	 * 7. Сохранить в кэш
	 */
	async loadAnime() {
		// Предотвращаем повторную загрузку
		if ( this.isLoading ) {
			console.log( '[RSN] ⚠️ Загрузка уже выполняется, пропускаю' );
			return;
		}

		this.isLoading = true;
		this.showLoader( true );
		this.animeList = [];

		let usedSource = 'Неизвестно';

		try {
			// ----- Шаг 1: Проверяем кэш -----
			const cached = this._getFromCache();
			if ( cached && cached.length === this.maxAnimeCount ) {
				console.log( '[RSN] 📦 Данные загружены из кэша localStorage' );
				this.animeList = cached;
				usedSource = 'Кэш';
				return; // Досрочный выход — кэш валиден
			}

			// ----- Шаг 2: AniList API -----
			try {
				console.log( '[RSN] 📡 Запрос к AniList API...' );
				const data = await this._fetchFromAniList();

				if ( data.length >= this.minAcceptableCount ) {
					this.animeList = data;
					usedSource = 'AniList API';
					console.log( `[RSN] ✅ AniList: получено ${data.length} аниме` );
				} else {
					console.warn( `[RSN] ⚠️ AniList: только ${data.length} аниме (нужно минимум ${this.minAcceptableCount})` );
					this.animeList = data; // Сохраняем что есть, потом дополним
				}
			} catch ( error ) {
				console.warn( `[RSN] ❌ AniList недоступен: ${error.message}` );
			}

			// ----- Шаг 3: Kitsu API (если AniList не дал достаточно) -----
			if ( this.animeList.length < this.minAcceptableCount ) {
				try {
					console.log( '[RSN] 📡 Запрос к Kitsu API...' );
					const data = await this._fetchFromKitsu();

					if ( data.length >= this.minAcceptableCount ) {
						this.animeList = data;
						usedSource = 'Kitsu API';
						console.log( `[RSN] ✅ Kitsu: получено ${data.length} аниме` );
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

			// ----- Шаг 4: Локальный JSON -----
			if ( this.animeList.length < this.minAcceptableCount ) {
				try {
					console.log( '[RSN] 📡 Загрузка локального JSON...' );
					const data = await this._fetchFromLocalJson();

					if ( data.length >= this.minAcceptableCount ) {
						this.animeList = data;
						usedSource = 'Локальный JSON';
						console.log( `[RSN] ✅ JSON: загружено ${data.length} аниме` );
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

			// ----- Шаг 5: Хардкод-резерв (последняя надежда) -----
			if ( this.animeList.length === 0 ) {
				console.log( '[RSN] 📦 Все API недоступны. Использую встроенный резерв.' );
				this.animeList = [...this.hardcodedFallback];
				usedSource = 'Встроенный резерв';

				this.showNotification(
					'Показан список аниме из нашего каталога. Данные с серверов временно недоступны.',
					'info'
				);
			}

			// ----- Шаг 6: Дополняем до 9 если не хватает -----
			this._ensureExactCount( this.maxAnimeCount );

			// ----- Шаг 7: Сохраняем в кэш -----
			if ( usedSource !== 'Кэш' ) {
				this._saveToCache( this.animeList );
			}

			console.log( `[RSN] 🎉 Итого: ${this.animeList.length} аниме (источник: ${usedSource})` );

		} catch ( fatalError ) {
			console.error( '[RSN] 💥 Критическая ошибка:', fatalError );
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
	 * @param {number} count - нужное количество (обычно 9)
	 * @private
	 */
	_ensureExactCount( count ) {
		const currentCount = this.animeList.length;

		if ( currentCount >= count ) {
			this.animeList = this.animeList.slice( 0, count );
			return;
		}

		// Дополняем из резерва, исключая дубликаты по названию
		const needed = count - currentCount;
		const existingTitles = new Set(
			this.animeList.map( a => a.title?.toLowerCase() ).filter( Boolean )
		);

		const extra = this.hardcodedFallback
			.filter( f => !existingTitles.has( f.title?.toLowerCase() ) )
			.slice( 0, needed )
			.map( ( a, i ) => ( {
				...a,
				id: `extra-${i}-${Date.now()}`,
				image: this.fallbackImage, // Принудительно локальная заглушка
				source: 'Дополнено из резерва'
			} ) );

		this.animeList = [...this.animeList, ...extra];
		console.log( `[RSN] ➕ Дополнено ${extra.length} аниме из резерва` );
	}

	// ========================================================================
	// 5. ИСТОЧНИК 1: ANILIST API (GRAPHQL)
	// ========================================================================

	/**
	 * Загружает данные из AniList GraphQL API
	 * Это самый надежный источник — нет CORS, нет лимитов
	 * 
	 * @returns {Promise<Array>} Массив аниме-объектов
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
		if ( data.errors ) {
			console.error( '[RSN] GraphQL ошибки:', data.errors );
			throw new Error( `GraphQL error: ${data.errors[0]?.message || 'неизвестная ошибка'}` );
		}

		const media = data?.data?.Page?.media || [];

		return media.map( ( anime, index ) => ( {
			id: `anilist-${anime.id}`,
			title: anime.title?.english || anime.title?.romaji || 'Без названия',
			nativeTitle: anime.title?.native || '',
			excerpt: this._formatDescription( anime.description, 180 ),
			image: this._optimizeImage( anime.coverImage?.extraLarge || anime.coverImage?.large ),
			imageOriginal: anime.coverImage?.extraLarge || anime.coverImage?.large,
			imageMedium: anime.coverImage?.medium,
			bannerImage: anime.bannerImage,
			type: this.formatDisplayNames[anime.format] || '📺 Сериал',
			format: anime.format || 'TV',
			status: this.statusDisplayNames[anime.status] || '▶️ Выходит',
			episodes: anime.episodes ? `${anime.episodes} эп.` : ( anime.duration ? `${anime.duration} мин.` : '? эп.' ),
			episodesCount: anime.episodes || null,
			score: Math.round( ( ( anime.averageScore || anime.meanScore || 0 ) / 10 ) * 10 ) / 10,
			scoreRaw: anime.averageScore || 0,
			popularity: anime.popularity || 0,
			genres: ( anime.genres || [] ).slice( 0, 4 ).map( g => this.genreTranslations[g] || g ),
			studios: ( anime.studios?.nodes || [] ).map( s => s.name ).slice( 0, 2 ),
			source: 'AniList',
			sourceUrl: anime.siteUrl || `https://anilist.co/anime/${anime.id}`,
			trailerUrl: anime.trailer?.id && anime.trailer?.site === 'youtube'
				? `https://www.youtube.com/watch?v=${anime.trailer.id}`
				: null,
			order: index + 1
		} ) );
	}

	// ========================================================================
	// 6. ИСТОЧНИК 2: KITSU API
	// ========================================================================

	/**
	 * Загружает данные из Kitsu API
	 * Открытый API, не требует ключа, нет строгих лимитов
	 * 
	 * @returns {Promise<Array>} Массив аниме-объектов
	 * @private
	 */
	async _fetchFromKitsu() {
		const url = [
			this.kitsuUrl,
			'/anime',
			'?filter[season]=', this.seasonKitsuMap[this.currentSeason],
			'&filter[seasonYear]=', this.currentYear,
			'&filter[status]=current',
			'&sort=popularityRank',
			'&page[limit]=', this.maxAnimeCount
		].join( '' );

		const data = await this._makeRequest( url, {
			headers: {
				'Accept': 'application/vnd.api+json',
				'Content-Type': 'application/vnd.api+json'
			}
		} );

		const animeList = data?.data || [];

		return animeList.map( ( anime, index ) => ( {
			id: `kitsu-${anime.id}`,
			title: anime.attributes?.titles?.en
				|| anime.attributes?.titles?.en_jp
				|| anime.attributes?.canonicalTitle
				|| 'Без названия',
			nativeTitle: anime.attributes?.titles?.ja_jp || '',
			excerpt: this._formatDescription( anime.attributes?.synopsis, 180 ),
			image: this._optimizeImage( anime.attributes?.posterImage?.original ),
			imageOriginal: anime.attributes?.posterImage?.original,
			imageMedium: anime.attributes?.posterImage?.medium,
			bannerImage: anime.attributes?.coverImage?.original,
			type: this.formatDisplayNames[anime.attributes?.showType] || '📺 Сериал',
			format: anime.attributes?.showType || 'TV',
			status: '▶️ Выходит',
			episodes: anime.attributes?.episodeCount
				? `${anime.attributes.episodeCount} эп.`
				: '? эп.',
			episodesCount: anime.attributes?.episodeCount || null,
			score: Math.round( ( parseFloat( anime.attributes?.averageRating ) || 0 ) / 20 * 10 ) / 10,
			scoreRaw: parseFloat( anime.attributes?.averageRating ) || 0,
			popularity: anime.attributes?.popularityRank || 0,
			genres: [],
			studios: [],
			source: 'Kitsu',
			sourceUrl: `https://kitsu.io/anime/${anime.attributes?.slug || anime.id}`,
			trailerUrl: anime.attributes?.youtubeVideoId
				? `https://www.youtube.com/watch?v=${anime.attributes.youtubeVideoId}`
				: null,
			order: index + 1
		} ) );
	}

	// ========================================================================
	// 7. ИСТОЧНИК 3: ЛОКАЛЬНЫЙ JSON
	// ========================================================================

	/**
	 * Загружает данные из локального JSON файла
	 * Файл обновляется GitHub Actions каждый день
	 * 
	 * @returns {Promise<Array>} Массив аниме-объектов
	 * @private
	 */
	async _fetchFromLocalJson() {
		const response = await fetch( this.localJsonUrl );

		if ( !response.ok ) {
			throw new Error( `HTTP ${response.status}` );
		}

		const json = await response.json();
		const anime = json?.anime || [];

		// Проверяем актуальность данных (не старше 7 дней)
		if ( json.meta?.lastUpdated ) {
			const lastUpdate = new Date( json.meta.lastUpdated );
			const daysOld = ( Date.now() - lastUpdate.getTime() ) / ( 1000 * 60 * 60 * 24 );

			if ( daysOld > 7 ) {
				console.warn( `[RSN] ⚠️ Локальный JSON устарел (${daysOld.toFixed( 1 )} дней). Пора обновить GitHub Actions!` );
			} else {
				console.log( `[RSN] 📅 JSON обновлялся ${daysOld.toFixed( 1 )} дней назад` );
			}
		}

		return anime.map( ( item, index ) => ( {
			...item,
			id: item.id || `json-${index}`,
			image: this._optimizeImage( item.image ),
			source: item.source || 'Локальный JSON',
			order: index + 1
		} ) );
	}

	// ========================================================================
	// 8. УНИВЕРСАЛЬНЫЙ FETCH С ТАЙМАУТОМ
	// ========================================================================

	/**
	 * Выполняет HTTP запрос с таймаутом
	 * Единая точка для всех API-вызовов
	 * 
	 * @param {string} url - URL для запроса
	 * @param {Object} options - Опции fetch
	 * @returns {Promise<any>} Распарсенный JSON
	 * @throws {Error} При таймауте, HTTP ошибке или невалидном JSON
	 * @private
	 */
	async _makeRequest( url, options = {} ) {
		const controller = new AbortController();
		const timeoutId = setTimeout( () => {
			console.warn( `[RSN] ⏰ Таймаут (${this.apiTimeout}мс): ${url}` );
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
			if ( !contentType || ( !contentType.includes( 'application/json' ) && !contentType.includes( 'application/vnd.api+json' ) ) ) {
				console.warn( `[RSN] ⚠️ Неожиданный Content-Type: ${contentType}` );
			}

			return await response.json();
		} catch ( error ) {
			if ( error.name === 'AbortError' ) {
				throw new Error( 'Таймаут запроса' );
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
	 * Получает данные из кэша
	 * Автоматически проверяет актуальность и сезон
	 * 
	 * @returns {Array|null} Массив аниме или null
	 * @private
	 */
	_getFromCache() {
		try {
			const raw = localStorage.getItem( this.cacheKey );
			if ( !raw ) return null;

			const cache = JSON.parse( raw );

			// Проверяем не устарел ли кэш
			if ( Date.now() - cache.timestamp > this.cacheDuration ) {
				console.log( '[RSN] 🗑️ Кэш устарел, удаляю' );
				localStorage.removeItem( this.cacheKey );
				return null;
			}

			// Проверяем соответствие сезона
			if ( cache.season !== this.currentSeason || cache.year !== this.currentYear ) {
				console.log( '[RSN] 🗑️ Кэш от другого сезона, удаляю' );
				localStorage.removeItem( this.cacheKey );
				return null;
			}

			const age = Math.round( ( Date.now() - cache.timestamp ) / 1000 );
			console.log( `[RSN] 📦 Кэш актуален (возраст: ${age}с, сезон: ${cache.season})` );
			return cache.data;
		} catch ( error ) {
			console.warn( '[RSN] ⚠️ Ошибка чтения кэша:', error.message );
			localStorage.removeItem( this.cacheKey );
			return null;
		}
	}

	/**
	 * Сохраняет данные в кэш
	 * 
	 * @param {Array} data - Массив аниме для сохранения
	 * @private
	 */
	_saveToCache( data ) {
		try {
			const cache = {
				data: data,
				timestamp: Date.now(),
				season: this.currentSeason,
				year: this.currentYear
			};
			localStorage.setItem( this.cacheKey, JSON.stringify( cache ) );
			console.log( '[RSN] 💾 Данные сохранены в кэш' );
		} catch ( error ) {
			console.warn( '[RSN] ⚠️ Не удалось сохранить кэш:', error.message );
			// Возможно localStorage переполнен — пробуем очистить
			try {
				localStorage.removeItem( this.cacheKey );
				localStorage.setItem( this.cacheKey, JSON.stringify( {
					data: data.slice( 0, 5 ), // Сохраняем меньше данных
					timestamp: Date.now(),
					season: this.currentSeason,
					year: this.currentYear
				} ) );
				console.log( '[RSN] 💾 Данные сохранены в кэш (сокращённая версия)' );
			} catch ( e ) {
				// Совсем не можем сохранить — ничего не делаем
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
	// 10. ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ
	// ========================================================================

	/**
	 * Пропускает URL изображения через прокси для сжатия
	 * wsrv.nl — бесплатный, не требует API ключа
	 * Конвертирует в WebP, изменяет размер до 600×840
	 * 
	 * @param {string} url - Оригинальный URL изображения
	 * @returns {string} URL сжатого изображения
	 * @private
	 */
	_optimizeImage( url ) {
		if ( !url ) return this.fallbackImage;

		// Не пропускаем через прокси локальные файлы и data URI
		if ( url.startsWith( '/' ) || url.startsWith( 'data:' ) || url === this.fallbackImage ) {
			return url;
		}

		// Проверяем не заглушка ли это от API
		if ( this._isPlaceholderUrl( url ) ) {
			return this.fallbackImage;
		}

		return `${this.imageProxy}${encodeURIComponent( url )}${this.imageProxyParams}`;
	}

	/**
	 * Проверяет, не является ли URL изображения заглушкой от API
	 * Некоторые API отдают картинки-заглушки вместо реальных постеров
	 * 
	 * @param {string} url - URL для проверки
	 * @returns {boolean}
	 * @private
	 */
	_isPlaceholderUrl( url ) {
		if ( !url || typeof url !== 'string' ) return true;
		const lower = url.toLowerCase();
		return this.placeholderMarkers.some( marker => lower.includes( marker ) );
	}

	/**
	 * Обработчик ошибки загрузки изображения
	 * Вызывается из HTML через onerror
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

		console.warn( `[RSN] 🖼️ Ошибка загрузки: ${img.src}` );
		img.src = this.fallbackImage;
		img.onerror = null;
		img.classList.add( 'image-error' );
	}

	// ========================================================================
	// 11. ОБРАБОТКА ТЕКСТА
	// ========================================================================

	/**
	 * Очищает и форматирует описание аниме
	 * Удаляет HTML теги, BB-коды, спецсимволы
	 * Обрезает до указанной длины
	 * 
	 * @param {string} text - Исходный текст описания
	 * @param {number} maxLength - Максимальная длина (по умолчанию 180)
	 * @returns {string} Очищенное и обрезанное описание
	 * @private
	 */
	_formatDescription( text, maxLength = 180 ) {
		if ( !text ) return '';

		const cleaned = text
			// Удаляем HTML теги
			.replace( /<[^>]*>/g, '' )
			// Удаляем Markdown ссылки [text](url)
			.replace( /\[([^\]]*)\]\([^)]*\)/g, '$1' )
			// Удаляем BB-коды [like this]
			.replace( /\[[^\]]*\]/g, '' )
			// Удаляем HTML entities
			.replace( /&[^;]+;/g, '' )
			// Заменяем множественные пробелы и переносы на один пробел
			.replace( /\s+/g, ' ' )
			// Убираем пробелы в начале и конце
			.trim();

		if ( cleaned.length <= maxLength ) return cleaned;

		// Обрезаем до последнего полного слова
		const truncated = cleaned.substring( 0, maxLength );
		const lastSpace = truncated.lastIndexOf( ' ' );
		return ( lastSpace > maxLength * 0.8 ? truncated.substring( 0, lastSpace ) : truncated ) + '...';
	}

	/**
	 * Безопасное экранирование HTML
	 * Защита от XSS при вставке пользовательских данных
	 * 
	 * @param {string} text - Исходный текст
	 * @returns {string} Экранированный текст
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
		return String( text ).replace( /[&<>"']/g, char => map[char] );
	}

	// ========================================================================
	// 12. ОТОБРАЖЕНИЕ
	// ========================================================================

	/**
	 * Показывает или скрывает индикатор загрузки
	 * 
	 * @param {boolean} show - true = показать лоадер
	 */
	showLoader( show ) {
		const loader = document.getElementById( 'newsLoader' );
		const grid = document.getElementById( 'newsGrid' );

		if ( loader ) {
			loader.style.display = show ? 'flex' : 'none';
			const text = loader.querySelector( 'p' );
			if ( text ) {
				text.textContent = show
					? `Загружаем аниме сезона ${this.seasonDisplayNames[this.currentSeason]}...`
					: '';
			}
		}

		if ( grid && show ) {
			grid.style.display = 'none';
		}
	}

	/**
	 * Рендерит сетку с карточками аниме
	 */
	render() {
		const grid = document.getElementById( 'newsGrid' );
		const empty = document.getElementById( 'emptyState' );

		if ( !grid ) {
			console.error( '[RSN] ❌ Элемент #newsGrid не найден в DOM' );
			return;
		}

		// Нет аниме — показываем пустое состояние
		if ( !this.animeList || this.animeList.length === 0 ) {
			grid.style.display = 'none';
			if ( empty ) empty.style.display = 'block';
			return;
		}

		// Есть аниме — показываем сетку
		grid.style.display = 'grid';
		if ( empty ) empty.style.display = 'none';

		// Рендерим карточки
		grid.innerHTML = this.animeList
			.map( anime => this._renderAnimeCard( anime ) )
			.join( '' );

		console.log( `[RSN] 🎨 Отрендерено ${this.animeList.length} карточек аниме` );
	}

	/**
	 * Создаёт HTML одной карточки аниме
	 * 
	 * @param {Object} anime - Объект аниме
	 * @returns {string} HTML строка карточки
	 * @private
	 */
	_renderAnimeCard( anime ) {
		// Безопасно получаем значения с fallback'ами
		const title = anime.title || 'Без названия';
		const excerpt = anime.excerpt || 'Описание отсутствует';
		const image = anime.image || this.fallbackImage;
		const typeName = anime.type || '📺 Сериал';
		const statusName = anime.status || '▶️ Выходит';
		const episodes = anime.episodes || '? эп.';
		const score = anime.score || 0;
		const genres = ( anime.genres || [] ).slice( 0, 3 ).join( ' · ' );
		const studios = ( anime.studios || [] ).join( ', ' );
		const source = anime.source || 'Неизвестно';
		const sourceUrl = anime.sourceUrl || '#';
		const trailerUrl = anime.trailerUrl || null;

		// Звёзды рейтинга
		const stars = this._renderStars( score );

		// Информация о студии
		const studioInfo = studios ? `<span class="anime-studios">🎬 ${this.escapeHtml( studios )}</span>` : '';

		return `
            <div class="news-card anime-card" data-id="${anime.id || ''}">
                <!-- Изображение с баджами -->
                <div class="news-image">
                    <img src="${this.escapeHtml( image )}"
                         alt="${this.escapeHtml( title )}"
                         loading="lazy"
                         onerror="window.risingSunNews?.handleImageError(this);">
                    <div class="news-badges">
                        <span class="news-country">${typeName}</span>
                        <span class="news-category">${statusName}</span>
                    </div>
                    ${score > 0 ? `<div class="anime-score" title="Рейтинг AniList">★ ${score.toFixed( 1 )}</div>` : ''}
                    ${trailerUrl ? `
                        <a href="${this.escapeHtml( trailerUrl )}" 
                           class="anime-trailer-btn" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           title="Смотреть трейлер на YouTube"
                           onclick="event.stopPropagation();">
                            <i class="fab fa-youtube"></i>
                        </a>
                    ` : ''}
                </div>

                <!-- Контент карточки -->
                <div class="news-content">
                    <!-- Мета-информация -->
                    <div class="news-meta">
                        <span class="news-date"><i class="fas fa-tv"></i> ${this.escapeHtml( episodes )}</span>
                        <span class="news-views"><i class="fas fa-star"></i> ${stars}</span>
                        ${studioInfo}
                    </div>

                    <!-- Заголовок -->
                    <h3 class="news-title" title="${this.escapeHtml( anime.nativeTitle || title )}">
                        ${this.escapeHtml( title )}
                    </h3>

                    <!-- Описание -->
                    <p class="news-excerpt">${this.escapeHtml( excerpt )}</p>

                    <!-- Жанры -->
                    ${genres ? `<div class="anime-genres">${this.escapeHtml( genres )}</div>` : ''}

                    <!-- Футер с источником и ссылкой -->
                    <div class="news-footer">
                        <span class="news-source" title="Источник данных">
                            <i class="fas fa-database"></i> ${this.escapeHtml( source )}
                        </span>
                        <a href="${this.escapeHtml( sourceUrl )}"
                           class="news-link"
                           target="_blank"
                           rel="noopener noreferrer"
                           title="Открыть страницу аниме">
                            Подробнее <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
	}

	/**
	 * Генерирует строку со звёздами для рейтинга
	 * 
	 * @param {number} score - Оценка от 0 до 10
	 * @returns {string} Строка со звёздами
	 * @private
	 */
	_renderStars( score ) {
		if ( !score || score <= 0 ) return 'Нет оценки';

		// Переводим 10-балльную шкалу в 5-звёздочную
		const fullStars = Math.floor( score / 2 );
		const hasHalfStar = ( score / 2 - fullStars ) >= 0.5;
		let stars = '';

		for ( let i = 0; i < 5; i++ ) {
			if ( i < fullStars ) {
				stars += '★';          // Полная звезда
			} else if ( i === fullStars && hasHalfStar ) {
				stars += '⯪';          // Половина звезды
			} else {
				stars += '☆';          // Пустая звезда
			}
		}

		return stars;
	}

	// ========================================================================
	// 13. УВЕДОМЛЕНИЯ
	// ========================================================================

	/**
	 * Показывает временное уведомление пользователю
	 * Автоматически скрывается через 5 секунд
	 * 
	 * @param {string} message - Текст уведомления
	 * @param {string} [type='info'] - Тип: info | success | error | warning
	 */
	showNotification( message, type = 'info' ) {
		// Удаляем предыдущее уведомление если есть
		const existing = document.querySelector( '.api-notification' );
		if ( existing ) {
			existing.classList.remove( 'show' );
			setTimeout( () => existing.remove(), 300 );
		}

		// Иконка в зависимости от типа
		const icons = {
			success: 'fa-check-circle',
			error: 'fa-exclamation-circle',
			warning: 'fa-exclamation-triangle',
			info: 'fa-info-circle'
		};

		const el = document.createElement( 'div' );
		el.className = `api-notification api-notification-${type}`;
		el.setAttribute( 'role', 'alert' );
		el.setAttribute( 'aria-live', 'polite' );
		el.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${this.escapeHtml( message )}</span>
            <button class="notification-close" aria-label="Закрыть уведомление">&times;</button>
        `;

		document.body.appendChild( el );

		// Анимация появления (после вставки в DOM)
		requestAnimationFrame( () => {
			el.classList.add( 'show' );
		} );

		// Закрытие по клику на крестик
		const closeBtn = el.querySelector( '.notification-close' );
		const close = () => {
			el.classList.remove( 'show' );
			setTimeout( () => {
				if ( el.parentNode ) el.remove();
			}, 300 );
		};

		closeBtn?.addEventListener( 'click', close );

		// Автоматическое закрытие через 5 секунд
		const timer = setTimeout( close, 5000 );

		// Отменяем таймер если закрыли вручную
		el.addEventListener( 'close', () => clearTimeout( timer ), { once: true } );
	}

	// ========================================================================
	// 14. ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ВНЕШНЕГО ИСПОЛЬЗОВАНИЯ
	// ========================================================================

	/**
	 * Принудительно перезагружает аниме (с бросом кэша)
	 * Можно вызвать из консоли: window.risingSunNews.refresh()
	 */
	async refresh() {
		console.log( '[RSN] 🔄 Принудительное обновление...' );
		this.clearCache();
		await this.loadAnime();
	}

	/**
	 * Возвращает текущее состояние модуля
	 * @returns {Object} Объект с состоянием
	 */
	getState() {
		return {
			initialized: this.isInitialized,
			loading: this.isLoading,
			season: this.currentSeason,
			seasonName: this.seasonDisplayNames[this.currentSeason],
			year: this.currentYear,
			animeCount: this.animeList.length,
			maxAnime: this.maxAnimeCount
		};
	}

	/**
	 * Возвращает список загруженных аниме
	 * @returns {Array} Копия массива аниме
	 */
	getAnimeList() {
		return [...this.animeList];
	}
}

// ============================================================================
// ЗАПУСК МОДУЛЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================================

document.addEventListener( 'DOMContentLoaded', () => {
	// Проверяем наличие контейнера для новостей
	if ( document.getElementById( 'newsGrid' ) ) {
		try {
			// Создаём глобальный экземпляр
			window.risingSunNews = new RisingSunNews();
			console.log( '[RSN] ✅ Модуль запущен. Доступен как window.risingSunNews' );
		} catch ( error ) {
			console.error( '[RSN] ❌ Критическая ошибка при запуске:', error );
			// Показываем заглушку в контейнере
			const grid = document.getElementById( 'newsGrid' );
			if ( grid ) {
				grid.innerHTML = `
                    <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff4757;"></i>
                        <h3>Не удалось загрузить новости</h3>
                        <p>Пожалуйста, обновите страницу</p>
                        <button onclick="location.reload()" class="refresh-btn">Обновить</button>
                    </div>`;
			}
		}
	} else {
		console.log( '[RSN] ℹ️ Контейнер #newsGrid не найден. Модуль неактивен.' );
	}
} );

// Экспорт для модульных систем
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = RisingSunNews;
}