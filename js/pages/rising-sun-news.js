/**
 * Rising Sun News — Аниме этого сезона
 * Показывает 9 актуальных аниме, выходящих прямо сейчас
 * 
 * ИСТОЧНИК 1: Shikimori API — русскоязычный каталог аниме (ОСНОВНОЙ)
 * ИСТОЧНИК 2: Jikan API v4 — /seasons/now (РЕЗЕРВ)
 * ИСТОЧНИК 3: AniList API — GraphQL (ВТОРОЙ РЕЗЕРВ, не блокируется)
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
		 */
		this.jikanApiUrl = `https://api.jikan.moe/v4/seasons/${this.currentYear}/${this.currentSeason}`;

		/**
		 * ИСТОЧНИК 3 (ВТОРОЙ РЕЗЕРВ): AniList API (GraphQL)
		 * Не блокируется, хороший источник данных
		 */
		this.anilistGraphqlUrl = 'https://graphql.anilist.co';

		this.anilistQuery = `
			query ($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
				Page(perPage: $perPage) {
					media(season: $season, seasonYear: $seasonYear, status: RELEASING, sort: POPULARITY_DESC, type: ANIME) {
						id
						title {
							romaji
							english
							native
						}
						description
						coverImage {
							large
							extraLarge
						}
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

		/** Таймаут запроса - увеличен до 15 секунд */
		this.apiTimeout = 15000;

		// ============================================================
		// ЗАГЛУШКА ДЛЯ ИЗОБРАЖЕНИЙ
		// ============================================================

		/** Путь к локальной заглушке */
		this.fallbackImage = '/image/404.jpg';

		// ============================================================
		// РУССКИЕ НАЗВАНИЯ
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
		// МАРКЕРЫ ЗАГЛУШЕК API
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
			'na_series'
		];

		// ============================================================
		// РЕЗЕРВНЫЕ АНИМЕ (100% ГАРАНТИЯ)
		// ============================================================

		this.fallbackAnime = [
			{
				id: 1,
				title: 'Клинок, рассекающий демонов: Тренировка столпов',
				excerpt: 'Продолжение культового аниме. Тандзиро и его друзья проходят тренировку у столпов, готовясь к финальной битве с демонами.',
				image: this.fallbackImage,
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
				image: this.fallbackImage,
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
				image: this.fallbackImage,
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
				excerpt: 'Продолжение истории Рудеуса Грейрата. Новые приключения, магия и развитие персонажей.',
				image: this.fallbackImage,
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
				excerpt: 'Второй сезон нашумевшего аниме о мире шоу-бизнеса. Аква и Руби продолжают свой путь к славе.',
				image: this.fallbackImage,
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
				image: this.fallbackImage,
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
				image: this.fallbackImage,
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
				image: this.fallbackImage,
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
				excerpt: 'Четвёртый сезон исекая. Римуру продолжает строить свою нацию монстров.',
				image: this.fallbackImage,
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
		console.log( '[RSN] 📡 Резервный источник 1: Jikan API' );
		console.log( '[RSN] 📡 Резервный источник 2: AniList API' );
		console.log( '[RSN] 🖼️ Заглушка:', this.fallbackImage );

		this.updateHeroTitle();
		this.bindEvents();
		await this.loadAnime();
	}

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
	// ====================================================================

	async loadAnime() {
		this.showLoader( true );
		this.animeList = [];

		try {
			// ШАГ 1: Shikimori API (ОСНОВНОЙ)
			console.log( '[RSN] 📡 Попытка 1: Shikimori API' );
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
				// ШАГ 2: Jikan API (РЕЗЕРВ 1)
				console.log( '[RSN] 📡 Попытка 2: Jikan API' );
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

				try {
					// ШАГ 3: AniList API (РЕЗЕРВ 2 - не блокируется)
					console.log( '[RSN] 📡 Попытка 3: AniList API (GraphQL)' );
					this.animeList = await this.fetchFromAniList();

					if ( this.animeList.length >= 6 ) {
						console.log( `[RSN] ✅ AniList: загружено ${this.animeList.length} аниме` );
						this.finalizeList( 'AniList' );
						return;
					}

					console.warn( `[RSN] ⚠️ AniList вернул только ${this.animeList.length} записей` );
					throw new Error( 'Недостаточно данных от AniList' );

				} catch ( anilistError ) {
					console.warn( '[RSN] ❌ AniList недоступен:', anilistError.message );

					// ШАГ 4: Локальные данные (100% ГАРАНТИЯ)
					console.log( '[RSN] 📦 Используем локальный список аниме' );
					this.animeList = [...this.fallbackAnime];

					this.showNotification(
						'Показан список аниме текущего сезона из нашего каталога.',
						'info'
					);
				}
			}
		} finally {
			this.showLoader( false );
			this.render();
		}
	}

	// ====================================================================
	// ИСТОЧНИК 1: SHIKIMORI API
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
					'User-Agent': 'Komori-Store/1.0'
				}
			} );

			if ( !response.ok ) {
				throw new Error( `HTTP ${response.status}` );
			}

			const data = await response.json();

			if ( !Array.isArray( data ) ) {
				throw new Error( 'Неверный формат данных' );
			}

			console.log( `[RSN] Shikimori вернул ${data.length} аниме` );

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
	// ИСТОЧНИК 2: JIKAN API
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

			if ( !response.ok ) {
				throw new Error( `HTTP ${response.status}` );
			}

			const data = await response.json();
			const animeData = data?.data || [];

			console.log( `[RSN] Jikan вернул ${animeData.length} аниме` );

			return animeData.slice( 0, 9 ).map( ( anime, index ) => ( {
				id: index + 1,
				title: anime.title || anime.title_english || 'Без названия',
				excerpt: this.truncateText( anime.synopsis || '', 200 ),
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
	// ИСТОЧНИК 3: ANILIST API (НЕ БЛОКИРУЕТСЯ)
	// ====================================================================

	async fetchFromAniList() {
		console.log( '[RSN] 🌐 AniList GraphQL запрос' );

		const variables = {
			season: this.seasonMap[this.currentSeason],
			seasonYear: this.currentYear,
			perPage: 9
		};

		const controller = new AbortController();
		const timeoutId = setTimeout( () => {
			console.warn( '[RSN] ⏰ Таймаут AniList' );
			controller.abort();
		}, this.apiTimeout );

		try {
			const response = await fetch( this.anilistGraphqlUrl, {
				method: 'POST',
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify( {
					query: this.anilistQuery,
					variables: variables
				} )
			} );

			if ( !response.ok ) {
				throw new Error( `HTTP ${response.status}` );
			}

			const data = await response.json();
			const mediaList = data?.data?.Page?.media || [];

			console.log( `[RSN] AniList вернул ${mediaList.length} аниме` );

			if ( mediaList.length > 0 ) {
				const first = mediaList[0];
				console.log( '[RSN] 📋 Пример из AniList:', {
					title: first.title?.romaji,
					format: first.format,
					status: first.status,
					score: first.averageScore,
					episodes: first.episodes
				} );
			}

			return mediaList.map( ( anime, index ) => ( {
				id: index + 1,
				title: anime.title?.romaji || anime.title?.english || 'Без названия',
				excerpt: this.cleanHtml( anime.description || '' ).substring( 0, 200 ),
				image: this.extractAniListImage( anime.coverImage ),
				type: this.getAniListFormat( anime.format ),
				status: this.getAniListStatus( anime.status ),
				episodes: anime.episodes ? `${anime.episodes} эп.` : '? эп.',
				score: ( anime.averageScore || 0 ) / 10,
				genres: ( anime.genres || [] ).slice( 0, 3 ),
				source: 'AniList',
				sourceUrl: anime.siteUrl || '#'
			} ) );

		} finally {
			clearTimeout( timeoutId );
		}
	}

	// ====================================================================
	// ИЗВЛЕЧЕНИЕ ИЗОБРАЖЕНИЙ
	// ====================================================================

	extractShikimoriImage( anime ) {
		if ( anime.image?.original ) {
			const imgUrl = anime.image.original;
			if ( !this.isApiPlaceholder( imgUrl ) ) {
				return imgUrl.startsWith( 'http' ) ? imgUrl : `https://shikimori.one${imgUrl}`;
			}
		}

		if ( anime.image?.preview ) {
			const imgUrl = anime.image.preview;
			if ( !this.isApiPlaceholder( imgUrl ) ) {
				return imgUrl.startsWith( 'http' ) ? imgUrl : `https://shikimori.one${imgUrl}`;
			}
		}

		return this.fallbackImage;
	}

	extractJikanImage( images ) {
		if ( !images ) return this.fallbackImage;

		const candidates = [
			images.jpg?.large_image_url,
			images.jpg?.image_url,
			images.webp?.large_image_url,
			images.webp?.image_url
		];

		for ( const url of candidates ) {
			if ( url && url.startsWith( 'http' ) && !this.isApiPlaceholder( url ) ) {
				return url;
			}
		}

		return this.fallbackImage;
	}

	extractAniListImage( coverImage ) {
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

	isApiPlaceholder( url ) {
		if ( !url || typeof url !== 'string' ) return true;
		const lowerUrl = url.toLowerCase();

		for ( const marker of this.apiPlaceholderMarkers ) {
			if ( lowerUrl.includes( marker ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Обработчик ошибки загрузки изображения
	 */
	handleImageError( img ) {
		if ( img.src === this.fallbackImage ) {
			return;
		}
		console.warn( '[RSN] 🖼️ Ошибка загрузки изображения, используем заглушку' );
		img.src = this.fallbackImage;
		img.onerror = null;
	}

	getAniListFormat( format ) {
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

	getAniListStatus( status ) {
		const statuses = {
			'RELEASING': 'ongoing',
			'FINISHED': 'complete',
			'NOT_YET_RELEASED': 'upcoming'
		};
		return statuses[status] || 'ongoing';
	}

	// ====================================================================
	// ОБРАБОТКА ТЕКСТА
	// ====================================================================

	extractShikimoriExcerpt( anime ) {
		if ( anime.description ) {
			return this.cleanHtml( anime.description ).substring( 0, 200 );
		}

		const parts = [];
		if ( anime.kind ) parts.push( this.getKindName( anime.kind ) );
		if ( anime.episodes ) parts.push( `${anime.episodes} эп.` );
		if ( anime.score ) parts.push( `★ ${anime.score}` );

		return parts.join( ' · ' ) || 'Новое аниме в каталоге Shikimori';
	}

	cleanHtml( text ) {
		if ( !text ) return '';
		return text
			.replace( /\[[^\]]*\]/g, '' )
			.replace( /<[^>]*>/g, '' )
			.replace( /\s+/g, ' ' )
			.trim();
	}

	truncateText( text, maxLength ) {
		if ( !text || text.length <= maxLength ) return text || '';
		return text.substring( 0, maxLength ).trim() + '...';
	}

	getKindName( kind ) {
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

	// ====================================================================
	// ФИНАЛИЗАЦИЯ СПИСКА
	// ====================================================================

	finalizeList( sourceName ) {
		if ( this.animeList.length < 9 ) {
			const needed = 9 - this.animeList.length;
			console.log( `[RSN] ➕ Дополняем ${needed} аниме из резерва` );

			const existingTitles = new Set( this.animeList.map( a => a.title.toLowerCase() ) );
			const extra = this.fallbackAnime
				.filter( f => !existingTitles.has( f.title.toLowerCase() ) )
				.slice( 0, needed );

			extra.forEach( a => a.image = this.fallbackImage );
			this.animeList = [...this.animeList, ...extra];
		}

		console.log( `[RSN] Итого: ${this.animeList.length} аниме (источник: ${sourceName})` );
		console.log( '[RSN] Первые 3 аниме:', this.animeList.slice( 0, 3 ).map( a => a.title ) );
	}

	// ====================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// ====================================================================

	escapeHtml( text ) {
		if ( !text ) return '';
		const div = document.createElement( 'div' );
		div.textContent = text;
		return div.innerHTML;
	}

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

	renderAnimeCard( anime ) {
		const typeName = this.formatNames[anime.type?.toUpperCase()] || this.typeNames[anime.type] || '📺 Сериал';
		const statusName = this.statusNames[anime.status] || '▶️ Выходит';
		const stars = this.renderStars( anime.score );
		const genres = ( anime.genres || [] ).slice( 0, 3 ).join( ' · ' );

		return `
			<div class="news-card anime-card">
				<div class="news-image">
					<img src="${anime.image}" 
						 alt="${this.escapeHtml( anime.title )}" 
						 loading="lazy"
						 onerror="window.risingSunNews.handleImageError(this);">
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
						<span class="news-source"><i class="fas fa-database"></i> ${anime.source}</span>
						<a href="${anime.sourceUrl}" class="news-link" target="_blank" rel="noopener noreferrer">
							Подробнее <i class="fas fa-arrow-right"></i>
						</a>
					</div>
				</div>
			</div>
		`;
	}

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
		const subscribeForm = document.getElementById( 'newsSubscribeForm' );
		if ( subscribeForm ) {
			subscribeForm.addEventListener( 'submit', ( e ) => {
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
		}

		const refreshBtn = document.getElementById( 'refreshEmptyBtn' );
		if ( refreshBtn ) {
			refreshBtn.addEventListener( 'click', async () => {
				await this.loadAnime();
			} );
		}
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