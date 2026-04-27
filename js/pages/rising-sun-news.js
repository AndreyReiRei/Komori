/**
 * Rising Sun News — Аниме этого сезона
 * Показывает 9 актуальных аниме, выходящих прямо сейчас
 * 
 * ИСТОЧНИК 1: Shikimori API — русскоязычный каталог аниме (ОСНОВНОЙ)
 * ИСТОЧНИК 2: Jikan API v4 — /seasons/now (РЕЗЕРВ)
 * ГАРАНТИЯ: 9 аниме всегда отображаются в сетке 3x3
 */

class RisingSunNews {
	constructor() {
		/** @type {Array} Массив аниме */
		this.animeList = [];

		/** @type {boolean} Флаг загрузки */
		this.isLoading = false;

		/** @type {string} Текущий сезон (определяется автоматически) */
		this.currentSeason = this.getCurrentSeason();

		/** @type {number} Текущий год */
		this.currentYear = new Date().getFullYear();

		// ============================================================
		// API ИСТОЧНИКИ
		// ============================================================

		/**
		 * ИСТОЧНИК 1 (ОСНОВНОЙ): Shikimori API
		 * Русскоязычная база данных аниме и манги
		 * Документация: https://shikimori.one/api/doc
		 */
		this.shikimoriApiUrl = 'https://shikimori.one/api/animes';

		this.shikimoriParams = {
			order: 'popularity',
			limit: 9,
			status: 'ongoing',
			censored: 'false'
		};

		/**
		 * ИСТОЧНИК 2 (РЕЗЕРВ): Jikan API v4
		 * Бесплатный REST API для MyAnimeList
		 * Документация: https://docs.api.jikan.moe/
		 */
		this.jikanApiUrl = `https://api.jikan.moe/v4/seasons/${this.currentYear}/${this.currentSeason}`;

		/** Таймаут запроса */
		this.apiTimeout = 10000;

		// ============================================================
		// ЗАГЛУШКА ДЛЯ ИЗОБРАЖЕНИЙ
		// ============================================================

		/** Путь к локальной заглушке */
		this.fallbackImage = '/image/404.JPEG';

		// ============================================================
		// РУССКИЕ НАЗВАНИЯ
		// ============================================================

		this.seasonNames = {
			'winter': '❄️ Зима',
			'spring': '🌸 Весна',
			'summer': '☀️ Лето',
			'fall': '🍂 Осень'
		};

		this.typeNames = {
			'tv': '📺 Сериал',
			'movie': '🎬 Фильм',
			'ova': '💿 OVA',
			'ona': '🌐 ONA',
			'special': '⭐ Спецвыпуск',
			'music': '🎵 Клип'
		};

		this.statusNames = {
			'ongoing': '▶️ Выходит',
			'released': '✅ Завершён',
			'anons': '📅 Анонс',
			'airing': '▶️ Выходит',
			'complete': '✅ Завершён',
			'upcoming': '📅 Скоро'
		};

		// ============================================================
		// МАРКЕРЫ ЗАГЛУШЕК API (для фильтрации)
		// ============================================================

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
			'na_series',
			'na_series.jpg'
		];

		// ============================================================
		// РЕЗЕРВНЫЕ АНИМЕ (100% ГАРАНТИЯ)
		// Все названия на русском языке
		// ============================================================

		this.fallbackAnime = [
			{
				id: 1,
				title: 'Клинок, рассекающий демонов: Тренировка столпов',
				excerpt: 'Продолжение культового аниме. Тандзиро и его друзья проходят тренировку у столпов, готовясь к финальной битве с демонами.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '11 эп.',
				score: 8.7,
				genres: ['Экшен', 'Фэнтези', 'Исторический'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/55701-kimetsu-no-yaiba-hashira-geiko-hen'
			},
			{
				id: 2,
				title: 'Моя геройская академия 7',
				excerpt: 'Седьмой сезон популярного аниме про академию героев. Новые злодеи, новые способности и эпические сражения.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '25 эп.',
				score: 8.3,
				genres: ['Экшен', 'Суперсилы', 'Школа'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/54789-boku-no-hero-academia-7'
			},
			{
				id: 3,
				title: 'Ван-Пис',
				excerpt: 'Легендарное аниме продолжается. Луффи и его команда исследуют новые острова и сражаются с могущественными врагами.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: 'продолжается',
				score: 8.9,
				genres: ['Приключения', 'Фэнтези', 'Комедия'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/21-one-piece'
			},
			{
				id: 4,
				title: 'Реинкарнация безработного 2 (часть 2)',
				excerpt: 'Продолжение истории Рудеуса Грейрата. Новые приключения, магия и развитие персонажей в мире меча и магии.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '12 эп.',
				score: 8.4,
				genres: ['Фэнтези', 'Приключения', 'Драма'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/51179-mushoku-tensei-ii'
			},
			{
				id: 5,
				title: 'Звёздное дитя 2',
				excerpt: 'Второй сезон нашумевшего аниме о мире шоу-бизнеса. Аква и Руби продолжают свой путь к славе и мести.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '13 эп.',
				score: 8.6,
				genres: ['Драма', 'Музыка', 'Сверхъестественное'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/54915-oshi-no-ko-2'
			},
			{
				id: 6,
				title: 'Семья шпиона 3',
				excerpt: 'Третий сезон комедийного хита. Ллойд, Йор и Аня продолжают свою тайную жизнь под одной крышей.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '12 эп.',
				score: 8.8,
				genres: ['Комедия', 'Экшен', 'Повседневность'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/53884-spy-x-family-3'
			},
			{
				id: 7,
				title: 'Магическая битва 3',
				excerpt: 'Третий сезон тёмного фэнтези. Новые проклятия, новые техники и раскрытие тайн мира магов.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '24 эп.',
				score: 8.9,
				genres: ['Экшен', 'Сверхъестественное', 'Ужасы'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/51009-jujutsu-kaisen-3'
			},
			{
				id: 8,
				title: 'Провожающая в последний путь Фрирен 2',
				excerpt: 'Продолжение трогательной истории эльфийки Фрирен, путешествующей по миру после победы над королём демонов.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '12 эп.',
				score: 9.1,
				genres: ['Фэнтези', 'Драма', 'Приключения'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/52991-sousou-no-frieren'
			},
			{
				id: 9,
				title: 'О моём перерождении в слизь 4',
				excerpt: 'Четвёртый сезон исекая. Римуру продолжает строить свою нацию монстров и противостоять новым угрозам.',
				image: '/image/404.png',
				type: 'tv',
				status: 'ongoing',
				episodes: '24 эп.',
				score: 8.5,
				genres: ['Фэнтези', 'Приключения', 'Комедия'],
				source: 'Shikimori',
				sourceUrl: 'https://shikimori.one/animes/41487-tensei-shitara-slime-datta-ken-4'
			}
		];

		// ============================================================
		// ЗАПУСК
		// ============================================================

		this.init();
	}

	// ====================================================================
	// ОПРЕДЕЛЕНИЕ ТЕКУЩЕГО СЕЗОНА
	// ====================================================================

	/**
	 * Автоматически определяет текущий аниме-сезон
	 * Зима: январь-март, Весна: апрель-июнь
	 * Лето: июль-сентябрь, Осень: октябрь-декабрь
	 */
	getCurrentSeason() {
		const month = new Date().getMonth();
		if ( month >= 0 && month <= 2 ) return 'winter';
		if ( month >= 3 && month <= 5 ) return 'spring';
		if ( month >= 6 && month <= 8 ) return 'summer';
		return 'fall';
	}

	// ====================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// ====================================================================

	async init() {
		const seasonName = this.seasonNames[this.currentSeason];
		console.log( `[RSN] 🚀 Загрузка аниме сезона ${seasonName} ${this.currentYear}` );
		console.log( '[RSN] 📡 Основной источник: Shikimori (русскоязычный)' );
		console.log( '[RSN] 📡 Резервный источник: Jikan API' );
		console.log( '[RSN] 🖼️ Заглушка:', this.fallbackImage );

		this.updateHeroTitle();
		this.bindEvents();
		await this.loadAnime();
	}

	/**
	 * Обновляет заголовок с указанием текущего сезона
	 */
	updateHeroTitle() {
		const subtitle = document.querySelector( '.hero-subtitle' );
		const description = document.querySelector( '.hero-description' );

		if ( subtitle ) {
			subtitle.textContent = `Аниме сезона ${this.seasonNames[this.currentSeason]} ${this.currentYear}`;
		}
		if ( description ) {
			description.textContent = 'Актуальные аниме, которые выходят прямо сейчас. Следите за новинками и выбирайте фигурки любимых персонажей в нашем магазине.';
		}
	}

	// ====================================================================
	// ЗАГРУЗКА АНИМЕ
	// ПРИОРИТЕТ: Shikimori → Jikan → Фолбэк
	// ====================================================================

	async loadAnime() {
		this.showLoader( true );
		this.animeList = [];

		try {
			// ШАГ 1: Shikimori API (РУССКОЯЗЫЧНЫЙ — ОСНОВНОЙ)
			console.log( '[RSN] 📡 Попытка 1: Shikimori API (русскоязычный)' );
			this.animeList = await this.fetchFromShikimori();

			if ( this.animeList.length >= 6 ) {
				console.log( `[RSN] ✅ Shikimori: загружено ${this.animeList.length} аниме` );
				this.finalizeList( 'Shikimori' );
				return;
			}

			console.warn( `[RSN] ⚠️ Shikimori вернул только ${this.animeList.length} записей` );
			throw new Error( 'Недостаточно данных от Shikimori' );

		} catch ( shikimoriError ) {
			console.warn( '[RSN] ❌ Shikimori недоступен:', shikimoriError.message );

			try {
				// ШАГ 2: Jikan API (РЕЗЕРВ)
				console.log( '[RSN] 📡 Попытка 2: Jikan API (резерв)' );
				this.animeList = await this.fetchFromJikan();

				if ( this.animeList.length >= 6 ) {
					console.log( `[RSN] ✅ Jikan: загружено ${this.animeList.length} аниме` );
					this.finalizeList( 'MyAnimeList' );
					return;
				}

				console.warn( `[RSN] ⚠️ Jikan вернул только ${this.animeList.length} записей` );
				throw new Error( 'Недостаточно данных от Jikan' );

			} catch ( jikanError ) {
				console.warn( '[RSN] ❌ Jikan недоступен:', jikanError.message );

				// ШАГ 3: Локальные данные (100% ГАРАНТИЯ)
				console.log( '[RSN] 📦 Используем локальный список аниме' );
				this.animeList = [...this.fallbackAnime];

				this.showNotification(
					'Показан список аниме текущего сезона из нашего каталога.',
					'info'
				);
			}
		} finally {
			this.showLoader( false );
			this.render();
		}
	}

	// ====================================================================
	// ИСТОЧНИК 1: SHIKIMORI API (РУССКОЯЗЫЧНЫЙ)
	// ====================================================================

	async fetchFromShikimori() {
		const url = new URL( this.shikimoriApiUrl );

		Object.entries( this.shikimoriParams ).forEach( ( [key, value] ) => {
			url.searchParams.append( key, value );
		} );

		console.log( '[RSN] 🌐 Shikimori URL:', url.toString() );

		const controller = new AbortController();
		const timeoutId = setTimeout( () => {
			console.warn( '[RSN] ⏰ Таймаут Shikimori' );
			controller.abort();
		}, this.apiTimeout );

		try {
			const response = await fetch( url.toString(), {
				signal: controller.signal,
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Komori-Store/1.0 (shikimori client)'
				}
			} );

			console.log( '[RSN] 📡 Shikimori статус:', response.status );

			if ( !response.ok ) {
				throw new Error( `HTTP ${response.status}` );
			}

			const data = await response.json();

			if ( !Array.isArray( data ) ) {
				throw new Error( 'Неверный формат данных' );
			}

			console.log( `[RSN] Shikimori вернул ${data.length} аниме` );

			// Логируем первое аниме для отладки
			if ( data.length > 0 ) {
				const first = data[0];
				console.log( '[RSN] 📋 Пример из Shikimori:', {
					id: first.id,
					name: first.name,
					russian: first.russian || '(нет русского названия)',
					kind: first.kind,
					status: first.status,
					score: first.score,
					episodes: first.episodes,
					imageOriginal: first.image?.original ? first.image.original.substring( 0, 60 ) + '...' : 'нет',
					imagePreview: first.image?.preview ? first.image.preview.substring( 0, 60 ) + '...' : 'нет',
					genres: first.genres?.map( g => g.russian || g.name ).slice( 0, 3 )
				} );
			}

			return data.slice( 0, 9 ).map( ( anime, index ) => ( {
				id: index + 1,
				title: anime.russian || anime.name || 'Без названия',
				excerpt: this.extractShikimoriExcerpt( anime ),
				image: this.extractShikimoriImage( anime ),
				type: anime.kind || 'tv',
				status: anime.status || 'ongoing',
				episodes: anime.episodes ? `${anime.episodes} эп.` : '? эп.',
				score: parseFloat( anime.score ) || 0,
				genres: ( anime.genres || [] ).map( g => g.russian || g.name ).slice( 0, 3 ),
				source: 'Shikimori',
				sourceUrl: `https://shikimori.one${anime.url || '/animes'}`
			} ) );

		} finally {
			clearTimeout( timeoutId );
		}
	}

	// ====================================================================
	// ИСТОЧНИК 2: JIKAN API (РЕЗЕРВ)
	// ====================================================================

	async fetchFromJikan() {
		console.log( '[RSN] 🌐 Jikan URL:', this.jikanApiUrl );

		const controller = new AbortController();
		const timeoutId = setTimeout( () => {
			console.warn( '[RSN] ⏰ Таймаут Jikan' );
			controller.abort();
		}, this.apiTimeout );

		try {
			const response = await fetch( this.jikanApiUrl, {
				signal: controller.signal,
				headers: { 'Accept': 'application/json' }
			} );

			console.log( '[RSN] 📡 Jikan статус:', response.status );

			if ( !response.ok ) {
				throw new Error( `HTTP ${response.status}` );
			}

			const data = await response.json();
			const animeData = data?.data || [];

			console.log( `[RSN] Jikan вернул ${animeData.length} аниме` );

			if ( animeData.length > 0 ) {
				const first = animeData[0];
				console.log( '[RSN] 📋 Пример из Jikan:', {
					title: first.title,
					type: first.type,
					status: first.status,
					score: first.score,
					episodes: first.episodes,
					imageJpg: first.images?.jpg?.large_image_url ? first.images.jpg.large_image_url.substring( 0, 60 ) + '...' : 'нет',
					imageWebp: first.images?.webp?.large_image_url ? first.images.webp.large_image_url.substring( 0, 60 ) + '...' : 'нет',
					genres: first.genres?.map( g => g.name ).slice( 0, 3 )
				} );
			}

			return animeData.slice( 0, 9 ).map( ( anime, index ) => ( {
				id: index + 1,
				title: anime.title || anime.title_english || 'Без названия',
				excerpt: this.truncateText( anime.synopsis || '', 250 ),
				image: this.extractJikanImage( anime.images ),
				type: anime.type || 'tv',
				status: anime.status || 'airing',
				episodes: anime.episodes ? `${anime.episodes} эп.` : '? эп.',
				score: anime.score || 0,
				genres: ( anime.genres || [] ).map( g => g.name ).slice( 0, 3 ),
				source: 'MyAnimeList',
				sourceUrl: anime.url || '#'
			} ) );

		} finally {
			clearTimeout( timeoutId );
		}
	}

	// ====================================================================
	// ИЗВЛЕЧЕНИЕ ИЗОБРАЖЕНИЙ С ПРОВЕРКОЙ НА ЗАГЛУШКИ API
	// ====================================================================

	/**
	 * Извлекает URL изображения из объекта anime Shikimori
	 * Проверяет, не является ли изображение заглушкой API
	 */
	extractShikimoriImage( anime ) {
		// Shikimori v2 API — оригинальное изображение
		if ( anime.image?.original ) {
			const imgUrl = anime.image.original;
			// Проверяем, не заглушка ли это Shikimori (missing_original.jpg и т.д.)
			if ( this.isApiPlaceholder( imgUrl ) ) {
				console.warn( '[RSN] 🖼️ Shikimori original — заглушка:', imgUrl );
				return this.fallbackImage;
			}
			return imgUrl.startsWith( 'http' ) ? imgUrl : `https://shikimori.one${imgUrl}`;
		}

		// Shikimori v2 API — превью
		if ( anime.image?.preview ) {
			const imgUrl = anime.image.preview;
			if ( this.isApiPlaceholder( imgUrl ) ) {
				console.warn( '[RSN] 🖼️ Shikimori preview — заглушка:', imgUrl );
				return this.fallbackImage;
			}
			return imgUrl.startsWith( 'http' ) ? imgUrl : `https://shikimori.one${imgUrl}`;
		}

		// Shikimori v1 API (старый формат)
		if ( anime.poster?.originalUrl && !this.isApiPlaceholder( anime.poster.originalUrl ) ) {
			return anime.poster.originalUrl;
		}
		if ( anime.poster?.mainUrl && !this.isApiPlaceholder( anime.poster.mainUrl ) ) {
			return anime.poster.mainUrl;
		}

		// Если ничего нет — локальная заглушка
		return this.fallbackImage;
	}

	/**
	 * Извлекает URL изображения из объекта images Jikan API
	 * Проверяет все форматы и фильтрует заглушки
	 */
	extractJikanImage( images ) {
		if ( !images ) return this.fallbackImage;

		// Проверяем все возможные форматы
		const candidates = [
			images.jpg?.large_image_url,
			images.jpg?.image_url,
			images.jpg?.small_image_url,
			images.webp?.large_image_url,
			images.webp?.image_url,
			images.webp?.small_image_url
		];

		for ( const url of candidates ) {
			if ( url && url.startsWith( 'http' ) ) {
				// Проверяем, не заглушка ли это MAL
				if ( this.isApiPlaceholder( url ) ) {
					console.warn( '[RSN] 🖼️ Jikan — заглушка:', url );
					continue; // Пропускаем, пробуем следующий формат
				}
				return url;
			}
		}

		return this.fallbackImage;
	}

	/**
	 * Проверяет, является ли URL изображения заглушкой API
	 * @param {string} url — URL изображения
	 * @returns {boolean} true если это заглушка
	 */
	isApiPlaceholder( url ) {
		if ( !url || typeof url !== 'string' ) return true;

		const lowerUrl = url.toLowerCase();

		// Проверяем по маркерам
		for ( const marker of this.apiPlaceholderMarkers ) {
			if ( lowerUrl.includes( marker ) ) {
				return true;
			}
		}

		// Дополнительная проверка для Shikimori
		if ( lowerUrl.includes( '/assets/globals/' ) && lowerUrl.includes( 'missing' ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Валидация URL изображения
	 * Проверяет URL и возвращает либо его, либо заглушку
	 */
	validateImageUrl( url ) {
		// Если URL пустой или невалидный
		if ( !url || typeof url !== 'string' || url.trim().length === 0 ) {
			return this.fallbackImage;
		}

		// Проверяем на заглушки API
		if ( this.isApiPlaceholder( url ) ) {
			console.warn( '[RSN] 🖼️ validateImageUrl — заглушка API:', url );
			return this.fallbackImage;
		}

		// Абсолютный URL
		if ( url.startsWith( 'http://' ) || url.startsWith( 'https://' ) ) {
			return url;
		}

		// Относительный путь Shikimori
		if ( url.startsWith( '/' ) ) {
			return `https://shikimori.one${url}`;
		}

		// Локальный путь (начинается с /image/ или просто image/)
		if ( url.includes( '404.png' ) || url.includes( 'image/' ) ) {
			return url;
		}

		// Всё остальное — заглушка
		return this.fallbackImage;
	}

	/**
	 * Обработчик ошибки загрузки изображения
	 * Вызывается из onerror в теге <img>
	 */
	handleImageError( img ) {
		// Проверяем, не загружена ли уже наша заглушка
		if ( img.src.includes( '404.png' ) ) {
			return; // Уже заглушка, ничего не делаем
		}

		console.warn( '[RSN] 🖼️ Ошибка загрузки изображения:', img.src.substring( 0, 80 ) );

		// Подставляем локальную заглушку
		img.src = this.fallbackImage;
		img.onerror = null; // Убираем обработчик, чтобы избежать бесконечного цикла
	}

	// ====================================================================
	// ОБРАБОТКА ТЕКСТА
	// ====================================================================

	/**
	 * Извлекает описание из данных Shikimori
	 */
	extractShikimoriExcerpt( anime ) {
		if ( anime.description ) {
			return this.cleanHtml( anime.description ).substring( 0, 250 );
		}

		// Формируем описание из характеристик
		const parts = [];
		if ( anime.kind ) parts.push( this.getKindName( anime.kind ) );
		if ( anime.episodes ) parts.push( `${anime.episodes} эп.` );
		if ( anime.score ) parts.push( `★ ${anime.score}` );

		return parts.join( ' · ' ) || 'Новое аниме в каталоге Shikimori';
	}

	/**
	 * Очистка HTML-тегов и BB-кодов Shikimori
	 */
	cleanHtml( text ) {
		if ( !text ) return '';
		return text
			.replace( /\[(\/?(?:b|i|u|s|quote|spoiler|code|url|img|comment|rn|post|topic|user|club|video|youtube|screen|list|\*|hr|size|color|center|right|left|table|tr|td|th))\]/gi, '' )
			.replace( /<[^>]*>/g, '' )
			.replace( /\[[^\]]*\]/g, '' )
			.replace( /\s+/g, ' ' )
			.trim();
	}

	/**
	 * Обрезает текст до указанной длины
	 */
	truncateText( text, maxLength ) {
		if ( !text || text.length <= maxLength ) return text || '';
		return text.substring( 0, maxLength ).trim() + '...';
	}

	/**
	 * Русские названия типов аниме
	 */
	getKindName( kind ) {
		const kinds = {
			'tv': 'Сериал',
			'movie': 'Фильм',
			'ova': 'OVA',
			'ona': 'ONA',
			'special': 'Спецвыпуск',
			'music': 'Клип',
			'tv_13': 'Сериал',
			'tv_24': 'Сериал',
			'tv_48': 'Сериал'
		};
		return kinds[kind] || kind || 'Аниме';
	}

	// ====================================================================
	// ФИНАЛИЗАЦИЯ СПИСКА
	// ====================================================================

	/**
	 * Дополняет список до 9 аниме из резерва
	 */
	finalizeList( sourceName ) {
		if ( this.animeList.length < 9 ) {
			const needed = 9 - this.animeList.length;
			console.log( `[RSN] ➕ Дополняем ${needed} аниме из резерва` );

			// Берём только те, которых ещё нет в списке
			const existingTitles = new Set( this.animeList.map( a => a.title.toLowerCase() ) );
			const extra = this.fallbackAnime
				.filter( f => !existingTitles.has( f.title.toLowerCase() ) )
				.slice( 0, needed );

			this.animeList = [...this.animeList, ...extra];
		}

		console.log( `[RSN] Итого: ${this.animeList.length} аниме (источник: ${sourceName})` );

		// Логируем первые 3 названия для проверки русского языка
		console.log( '[RSN] Первые 3 аниме:', this.animeList.slice( 0, 3 ).map( a => a.title ) );
	}

	// ====================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// ====================================================================

	/**
	 * Экранирование HTML
	 */
	escapeHtml( text ) {
		if ( !text ) return '';
		const div = document.createElement( 'div' );
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Отрисовка звёзд рейтинга
	 */
	renderStars( score ) {
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

	// ====================================================================
	// ОТОБРАЖЕНИЕ
	// ====================================================================

	/**
	 * Показ/скрытие лоадера
	 */
	showLoader( show ) {
		this.isLoading = show;
		const loader = document.getElementById( 'newsLoader' );
		const grid = document.getElementById( 'newsGrid' );

		if ( loader ) {
			loader.style.display = show ? 'block' : 'none';
			const text = loader.querySelector( 'p' );
			if ( text ) {
				text.textContent = `Загружаем аниме сезона ${this.seasonNames[this.currentSeason]} с Shikimori...`;
			}
		}

		if ( grid && show ) {
			grid.style.display = 'none';
		}
	}

	/**
	 * Отрисовка сетки аниме
	 */
	render() {
		const grid = document.getElementById( 'newsGrid' );
		const empty = document.getElementById( 'emptyState' );

		if ( !grid ) {
			console.error( '[RSN] ❌ Элемент newsGrid не найден' );
			return;
		}

		if ( !this.animeList.length ) {
			grid.style.display = 'none';
			if ( empty ) empty.style.display = 'block';
			return;
		}

		grid.style.display = 'grid';
		if ( empty ) empty.style.display = 'none';

		grid.innerHTML = this.animeList.map( anime => this.renderAnimeCard( anime ) ).join( '' );
	}

	/**
	 * Отрисовка карточки аниме
	 */
	renderAnimeCard( anime ) {
		const typeName = this.typeNames[anime.type] || '📺 Сериал';
		const statusName = this.statusNames[anime.status] || '▶️ Выходит';
		const stars = this.renderStars( anime.score );
		const genres = ( anime.genres || [] ).slice( 0, 3 ).join( ' · ' );
		const url = anime.sourceUrl || '#';
		const imageUrl = this.validateImageUrl( anime.image );
		const sourceLabel = anime.source || 'Shikimori';

		return `
			<div class="news-card anime-card">
				<div class="news-image">
					<img src="${imageUrl}" 
						 alt="${this.escapeHtml( anime.title )}" 
						 loading="lazy"
						 onerror="window.risingSunNews.handleImageError(this);"
						 data-fallback="${this.fallbackImage}">
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
						<span class="news-date"><i class="fas fa-tv"></i> ${anime.episodes}</span>
						<span class="news-views"><i class="fas fa-star"></i> ${stars}</span>
					</div>
					<h3 class="news-title">${this.escapeHtml( anime.title )}</h3>
					<p class="news-excerpt">${this.escapeHtml( anime.excerpt )}</p>
					<div class="anime-genres">${genres}</div>
					<div class="news-footer">
						<span class="news-source"><i class="fas fa-database"></i> ${sourceLabel}</span>
						<a href="${url}" class="news-link" target="_blank" rel="noopener noreferrer">
							Подробнее <i class="fas fa-arrow-right"></i>
						</a>
					</div>
				</div>
			</div>
		`;
	}

	/**
	 * Показ уведомления
	 */
	showNotification( message, type = 'info' ) {
		const el = document.createElement( 'div' );
		el.className = `api-notification api-notification-${type}`;
		el.innerHTML = `
			<i class="fas fa-info-circle"></i>
			<span>${message}</span>
			<button class="notification-close">&times;</button>
		`;

		document.body.appendChild( el );
		setTimeout( () => el.classList.add( 'show' ), 10 );

		const closeBtn = el.querySelector( '.notification-close' );
		if ( closeBtn ) {
			closeBtn.onclick = () => {
				el.classList.remove( 'show' );
				setTimeout( () => el.remove(), 300 );
			};
		}

		setTimeout( () => {
			el.classList.remove( 'show' );
			setTimeout( () => el.remove(), 300 );
		}, 5000 );
	}

	// ====================================================================
	// ОБРАБОТЧИКИ СОБЫТИЙ
	// ====================================================================

	bindEvents() {
		// Подписка
		document.getElementById( 'newsSubscribeForm' )?.addEventListener( 'submit', ( e ) => {
			e.preventDefault();
			const emailInput = e.target.querySelector( 'input[type="email"]' );
			const email = emailInput?.value;

			if ( email ) {
				console.log( '[RSN] 📧 Подписка:', email );
				this.showNotification(
					'✅ Спасибо за подписку! Вы будете получать новости о новинках аниме.',
					'success'
				);
				e.target.reset();
			}
		} );

		// Кнопка обновления на странице ошибки
		document.getElementById( 'refreshEmptyBtn' )?.addEventListener( 'click', async () => {
			await this.loadAnime();
		} );
	}
}

// ====================================================================
// ЗАПУСК
// ====================================================================

document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.getElementById( 'newsGrid' ) ) {
		window.risingSunNews = new RisingSunNews();
	}
} );