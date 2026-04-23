/**
 * Rising Sun News - Динамический движок новостей
 * Загружает 9 свежих новостей из Anime News API
 */

class RisingSunNews {
	constructor() {
		this.news = [];
		this.isLoading = false;

		// Настройки API
		this.apiUrl = 'https://aninewsapi.vercel.app/api/news';
		this.apiParams = {
			limit: 9, // Ровно 9 новостей для сетки 3x3
			sort: 'latest'
		};

		// Маппинг источников на страны
		this.sourceCountryMap = {
			'ann': 'japan', 'crunchyroll': 'japan', 'myanimelist': 'japan',
			'animecorner': 'japan', 'anitrendz': 'japan', 'japan': 'japan',
			'korea': 'korea', 'china': 'china'
		};

		// Категории по ключевым словам
		this.categoryKeywords = {
			'anime': ['anime', 'аниме', 'сериал', 'season', 'эпизод'],
			'manga': ['manga', 'манга', 'том', 'volume', 'chapter'],
			'games': ['game', 'игра', 'gaming', 'playstation', 'nintendo'],
			'music': ['music', 'музыка', 'album', 'concert', 'j-pop', 'k-pop'],
			'culture': ['culture', 'культура', 'festival', 'фестиваль'],
			'events': ['event', 'событие', 'release', 'премьера']
		};

		// Отображаемые названия
		this.countries = {
			'japan': { name: 'Япония', flag: '🇯🇵' },
			'korea': { name: 'Корея', flag: '🇰🇷' },
			'china': { name: 'Китай', flag: '🇨🇳' }
		};

		this.categories = {
			'anime': { name: 'Аниме', icon: '🎬' },
			'manga': { name: 'Манга', icon: '📚' },
			'games': { name: 'Игры', icon: '🎮' },
			'music': { name: 'Музыка', icon: '🎵' },
			'culture': { name: 'Культура', icon: '🎎' },
			'events': { name: 'События', icon: '🎪' }
		};

		this.init();
	}

	async init() {
		this.bindEvents();
		await this.loadNews();
		console.log( '📰 Rising Sun News загружен' );
	}

	async loadNews() {
		this.showLoader( true );

		try {
			const url = new URL( this.apiUrl );
			url.searchParams.append( 'limit', this.apiParams.limit );
			url.searchParams.append( 'sort', this.apiParams.sort );

			console.log( '🌐 Загрузка новостей:', url.toString() );

			const response = await fetch( url.toString() );
			if ( !response.ok ) throw new Error( `HTTP error! status: ${response.status}` );

			const data = await response.json();
			this.news = this.transformApiData( data );
			this.news = this.addMockViews( this.news );

			console.log( `✅ Загружено ${this.news.length} новостей` );
			this.render();

		} catch ( error ) {
			console.error( '❌ Ошибка загрузки:', error );
			this.handleLoadError();
		} finally {
			this.showLoader( false );
		}
	}

	transformApiData( apiData ) {
		if ( !Array.isArray( apiData ) ) return this.getFallbackNews();

		return apiData.slice( 0, 9 ).map( ( item, index ) => ( {
			id: index + 1,
			title: this.cleanText( item.title ) || 'Без названия',
			excerpt: this.cleanText( item.excerpt ) || this.cleanText( item.title ) || '',
			image: this.getValidImageUrl( item.image, item.title ),
			country: this.detectCountry( item.source ),
			category: this.detectCategory( item.title, item.excerpt ),
			date: this.parseDate( item.published || item.date ),
			views: 0,
			source: this.cleanText( item.source ) || 'Anime News',
			sourceUrl: item.link || '#'
		} ) ).filter( news => news.title && news.title !== 'Без названия' );
	}

	detectCountry( source ) {
		if ( !source ) return 'japan';
		const sourceLower = source.toLowerCase();
		for ( const [key, country] of Object.entries( this.sourceCountryMap ) ) {
			if ( sourceLower.includes( key ) ) return country;
		}
		return 'japan';
	}

	detectCategory( title, excerpt ) {
		const text = `${title || ''} ${excerpt || ''}`.toLowerCase();
		for ( const [category, keywords] of Object.entries( this.categoryKeywords ) ) {
			for ( const keyword of keywords ) {
				if ( text.includes( keyword ) ) return category;
			}
		}
		return 'anime';
	}

	parseDate( dateStr ) {
		if ( !dateStr ) return new Date().toISOString().split( 'T' )[0];
		try {
			const date = new Date( dateStr );
			if ( !isNaN( date.getTime() ) ) return date.toISOString().split( 'T' )[0];
		} catch ( e ) { }
		return new Date().toISOString().split( 'T' )[0];
	}

	getValidImageUrl( imageUrl, title ) {
		if ( imageUrl && ( imageUrl.startsWith( 'http://' ) || imageUrl.startsWith( 'https://' ) ) ) {
			return imageUrl;
		}
		const placeholders = {
			'anime': 'https://images.unsplash.com/photo-1578632767115-351597cf2f6e?w=600',
			'manga': 'https://images.unsplash.com/photo-1612036782180-95f0b5d5b17a?w=600',
			'games': 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600',
			'music': 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=600',
			'culture': 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600',
			'events': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600'
		};
		const category = this.detectCategory( title, '' );
		return placeholders[category] || placeholders['anime'];
	}

	cleanText( text ) {
		if ( !text ) return '';
		return text.replace( /<[^>]*>/g, '' ).replace( /\s+/g, ' ' ).trim();
	}

	addMockViews( news ) {
		return news.map( item => ( {
			...item,
			views: Math.floor( Math.random() * 50000 ) + 1000
		} ) );
	}

	getFallbackNews() {
		console.log( '📦 Используем резервные новости' );
		return [
			{ id: 1, title: 'Анонсирован новый сезон "Атака Титанов"', excerpt: 'Студия MAPPA объявила дату выхода.', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2f6e?w=600', country: 'japan', category: 'anime', date: new Date().toISOString().split( 'T' )[0], views: 15420, source: 'Anime News Network', sourceUrl: 'https://www.animenewsnetwork.com/' },
			{ id: 2, title: 'Новая манга от автора "Тетради смерти"', excerpt: 'Цугуми Оба и Такэси Обата анонсировали новую мангу.', image: 'https://images.unsplash.com/photo-1612036782180-95f0b5d5b17a?w=600', country: 'japan', category: 'manga', date: new Date().toISOString().split( 'T' )[0], views: 12300, source: 'Shonen Jump', sourceUrl: 'https://www.viz.com/shonenjump' },
			{ id: 3, title: 'BTS анонсировали мировой тур 2026', excerpt: 'Группа BTS объявила о мировом турне.', image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=600', country: 'korea', category: 'music', date: new Date().toISOString().split( 'T' )[0], views: 32450, source: 'K-pop Herald', sourceUrl: '#' },
			{ id: 4, title: 'В Токио открылся музей студии Ghibli', excerpt: 'Новый музей открыл двери в районе Сибуя.', image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=600', country: 'japan', category: 'culture', date: new Date().toISOString().split( 'T' )[0], views: 6700, source: 'Japan Times', sourceUrl: 'https://www.japantimes.co.jp/' },
			{ id: 5, title: 'Корейская RPG "Lies of P" — обновление', excerpt: 'Neowiz выпустили бесплатное дополнение.', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600', country: 'korea', category: 'games', date: new Date().toISOString().split( 'T' )[0], views: 5600, source: 'IGN Korea', sourceUrl: '#' },
			{ id: 6, title: 'Китайская анимация "Нэчжа 2" бьёт рекорды', excerpt: 'Продолжение собрало более $500 млн.', image: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=600', country: 'china', category: 'anime', date: new Date().toISOString().split( 'T' )[0], views: 8900, source: 'CGTN', sourceUrl: '#' },
			{ id: 7, title: 'Фестиваль японской культуры в Москве', excerpt: 'J-Fest пройдёт с 20 по 22 мая.', image: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600', country: 'japan', category: 'events', date: new Date().toISOString().split( 'T' )[0], views: 3400, source: 'J-Fest Official', sourceUrl: '#' },
			{ id: 8, title: 'NewJeans выпустили альбом "Supernatural"', excerpt: 'Клип набрал 50 миллионов просмотров.', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600', country: 'korea', category: 'music', date: new Date().toISOString().split( 'T' )[0], views: 45600, source: 'Billboard Korea', sourceUrl: '#' },
			{ id: 9, title: 'Китайская MMORPG выходит на Запад', excerpt: 'Justice Online получила локализацию.', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600', country: 'china', category: 'games', date: new Date().toISOString().split( 'T' )[0], views: 4100, source: 'MMOCulture', sourceUrl: '#' }
		];
	}

	handleLoadError() {
		this.news = this.getFallbackNews();
		this.render();
		this.showNotification( 'Не удалось загрузить свежие новости. Показаны последние доступные.', 'warning' );
	}

	showNotification( message, type = 'info' ) {
		const notification = document.createElement( 'div' );
		notification.className = `api-notification api-notification-${type}`;
		notification.innerHTML = `
            <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
		document.body.appendChild( notification );
		setTimeout( () => notification.classList.add( 'show' ), 10 );
		notification.querySelector( '.notification-close' ).addEventListener( 'click', () => {
			notification.classList.remove( 'show' );
			setTimeout( () => notification.remove(), 300 );
		} );
		setTimeout( () => {
			notification.classList.remove( 'show' );
			setTimeout( () => notification.remove(), 300 );
		}, 5000 );
	}

	showLoader( show ) {
		const loader = document.getElementById( 'newsLoader' );
		const newsGrid = document.getElementById( 'newsGrid' );
		const emptyState = document.getElementById( 'emptyState' );

		this.isLoading = show;
		if ( loader ) loader.style.display = show ? 'block' : 'none';
		if ( newsGrid && show ) newsGrid.style.display = 'none';
		if ( emptyState && show ) emptyState.style.display = 'none';
	}

	bindEvents() {
		document.getElementById( 'newsSubscribeForm' )?.addEventListener( 'submit', ( e ) => {
			e.preventDefault();
			const email = e.target.querySelector( 'input[type="email"]' ).value;
			if ( email ) {
				console.log( '📧 Подписка:', email );
				this.showNotification( '✅ Спасибо за подписку!', 'success' );
				e.target.reset();
			}
		} );

		document.getElementById( 'refreshEmptyBtn' )?.addEventListener( 'click', async () => {
			await this.loadNews();
		} );
	}

	render() {
		const newsGrid = document.getElementById( 'newsGrid' );
		const emptyState = document.getElementById( 'emptyState' );

		if ( !newsGrid ) return;

		if ( this.news.length === 0 ) {
			newsGrid.style.display = 'none';
			if ( emptyState ) emptyState.style.display = 'block';
			return;
		}

		newsGrid.style.display = 'grid';
		if ( emptyState ) emptyState.style.display = 'none';

		newsGrid.innerHTML = this.news.map( news => this.renderNewsCard( news ) ).join( '' );
	}

	renderNewsCard( news ) {
		const countryData = this.countries[news.country] || this.countries['japan'];
		const categoryData = this.categories[news.category] || this.categories['anime'];
		const formattedDate = this.formatDate( news.date );
		const formattedViews = this.formatViews( news.views );
		const readMoreUrl = this.getValidSourceUrl( news.sourceUrl, news.source );

		return `
            <div class="news-card">
                <div class="news-image">
                    <img src="${news.image}" alt="${this.escapeHtml( news.title )}" loading="lazy"
                         onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2f6e?w=600'">
                    <div class="news-badges">
                        <span class="news-country">${countryData.flag} ${countryData.name}</span>
                        <span class="news-category">${categoryData.icon} ${categoryData.name}</span>
                    </div>
                </div>
                <div class="news-content">
                    <div class="news-meta">
                        <span class="news-date"><i class="far fa-calendar"></i> ${formattedDate}</span>
                        <span class="news-views"><i class="far fa-eye"></i> ${formattedViews}</span>
                    </div>
                    <h3 class="news-title">${this.escapeHtml( news.title )}</h3>
                    <p class="news-excerpt">${this.escapeHtml( news.excerpt )}</p>
                    <div class="news-footer">
                        <span class="news-source"><i class="fas fa-newspaper"></i> ${this.escapeHtml( news.source )}</span>
                        <a href="${readMoreUrl}" class="news-link" target="_blank" rel="noopener noreferrer">
                            Читать <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
	}

	getValidSourceUrl( url, source ) {
		if ( url && url !== '#' && ( url.startsWith( 'http://' ) || url.startsWith( 'https://' ) ) ) {
			return url;
		}
		const sourceUrls = {
			'anime news network': 'https://www.animenewsnetwork.com/',
			'crunchyroll': 'https://www.crunchyroll.com/news',
			'myanimelist': 'https://myanimelist.net/news',
			'shonen jump': 'https://www.viz.com/shonenjump',
			'japan times': 'https://www.japantimes.co.jp/'
		};
		const sourceLower = ( source || '' ).toLowerCase();
		for ( const [key, fallbackUrl] of Object.entries( sourceUrls ) ) {
			if ( sourceLower.includes( key ) ) return fallbackUrl;
		}
		return 'https://www.animenewsnetwork.com/';
	}

	formatDate( dateStr ) {
		if ( !dateStr ) return 'Недавно';
		try {
			const date = new Date( dateStr );
			if ( isNaN( date.getTime() ) ) return 'Недавно';
			return date.toLocaleDateString( 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' } );
		} catch ( e ) {
			return 'Недавно';
		}
	}

	formatViews( views ) {
		if ( !views ) return '0';
		if ( views >= 1000000 ) return ( views / 1000000 ).toFixed( 1 ) + 'M';
		if ( views >= 1000 ) return ( views / 1000 ).toFixed( 1 ) + 'K';
		return views.toString();
	}

	escapeHtml( text ) {
		if ( !text ) return '';
		const div = document.createElement( 'div' );
		div.textContent = text;
		return div.innerHTML;
	}
}

document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.getElementById( 'newsGrid' ) ) {
		window.risingSunNews = new RisingSunNews();
	}
} );