/**
 * ============================================================================
 * СКРИПТ ДЛЯ ГОРИЗОНТАЛЬНОГО СКРОЛЛ-АККОРДЕОНА ТОВАРОВ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Отображает товары с пометками "Новинка", "Хит", "Скидка" в горизонтальном скролле
 * - Обеспечивает автоматическую прокрутку с навигационной полоской
 * - Поддерживает ручное переключение слайдов (клик по сегментам, скролл мышью)
 * 
 * ВАЖНО: Этот скрипт НЕ добавляет обработчики для кнопок "В корзину" и "Избранное"!
 * Они обрабатываются в других файлах (catalog.js, cart-favorites.js)
 * 
 * ============================================================================
 */

( function () {
	'use strict';

	// =========================================================================
	// 1. КОНФИГУРАЦИЯ АККОРДЕОНА
	// =========================================================================

	const CONFIG = {
		/** Интервал автоматической прокрутки (мс) */
		autoScrollInterval: 5000,

		/** Интервал прокрутки при наведении на товар (мс) */
		hoverScrollInterval: 8000,

		/** Длительность анимации прокрутки (мс) */
		transitionDuration: 600,

		/** Зацикленная прокрутка (после последнего слайда - первый) */
		loopScroll: true,

		/** Максимальное количество товаров в аккордеоне */
		maxTotalProducts: 26,

		/** Максимум товаров из одной категории */
		maxPerCategory: 2
	};

	// =========================================================================
	// 2. ПОЛУЧЕНИЕ И ОБРАБОТКА ТОВАРОВ
	// =========================================================================

	/** Кэш товаров для оптимизации */
	let cachedProducts = null;

	/** Хэш состава товаров (для отслеживания изменений) */
	let productsHash = null;

	/** Порядок товаров, сохраненный пользователем */
	let savedOrder = null;

	/**
	 * Вычисляет хэш состава товаров
	 * @param {Array} products - массив товаров
	 * @returns {string} хэш-строка для сравнения
	 */
	function getProductsHash( products ) {
		const ids = products.map( p => p.id ).join( ',' );
		return `${products.length}_${ids}`;
	}

	/**
	 * Сохраняет порядок товаров в localStorage
	 * @param {Array} products - массив товаров
	 */
	function saveProductsOrder( products ) {
		const order = products.map( p => p.id );
		localStorage.setItem( 'komori_accordion_order', JSON.stringify( order ) );
	}

	/**
	 * Загружает сохраненный порядок товаров
	 * @returns {Array|null} массив ID товаров или null
	 */
	function loadProductsOrder() {
		const saved = localStorage.getItem( 'komori_accordion_order' );
		if ( saved ) {
			try {
				return JSON.parse( saved );
			} catch ( e ) {
				console.warn( 'Ошибка загрузки порядка товаров:', e );
				return null;
			}
		}
		return null;
	}

	/**
	 * Применяет сохраненный порядок к товарам
	 * @param {Array} products - массив товаров
	 * @returns {Array} отсортированный массив
	 */
	function applySavedOrder( products ) {
		const savedOrderIds = loadProductsOrder();

		if ( !savedOrderIds || savedOrderIds.length !== products.length ) {
			const shuffled = shuffleArray( [...products] );
			saveProductsOrder( shuffled );
			return shuffled;
		}

		const orderedProducts = [];
		for ( const id of savedOrderIds ) {
			const product = products.find( p => p.id == id );
			if ( product ) orderedProducts.push( product );
		}

		for ( const product of products ) {
			if ( !orderedProducts.includes( product ) ) {
				orderedProducts.push( product );
			}
		}

		return orderedProducts;
	}

	/**
	 * Перемешивает массив (рандомизация)
	 * @param {Array} array - исходный массив
	 * @returns {Array} перемешанный массив
	 */
	function shuffleArray( array ) {
		const shuffled = [...array];
		for ( let i = shuffled.length - 1; i > 0; i-- ) {
			const j = Math.floor( Math.random() * ( i + 1 ) );
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	/**
	 * Вычисляет приоритет товара для отбора в аккордеон
	 * @param {Object} product - товар
	 * @returns {number} приоритет (чем выше, тем важнее)
	 */
	function getProductPriority( product ) {
		let priority = 0;
		if ( product.isHit ) priority += 3;
		if ( product.isNew ) priority += 2;
		if ( product.oldPrice && product.oldPrice > product.price ) priority += 1;
		return priority;
	}

	/**
	 * Получает товары для аккордеона (Новинки, Хиты, Скидки)
	 * @returns {Array} отфильтрованный и отсортированный массив товаров
	 */
	function getAccordionProducts() {
		const allProducts = store.products || [];
		const availableProducts = allProducts.filter( p =>
			p.status === 'in-stock' && p.quantity > 0
		);

		const productsByCategory = {};
		availableProducts.forEach( product => {
			const category = product.category;
			if ( !productsByCategory[category] ) {
				productsByCategory[category] = [];
			}
			productsByCategory[category].push( product );
		} );

		const selectedProducts = [];

		const categoryOrder = [
			'figures', 'tea', 'sweets', 'manga', 'clothing',
			'tableware', 'games', 'stationery', 'cosmetics',
			'decor', 'anime', 'music', 'other'
		];

		for ( const category of categoryOrder ) {
			if ( selectedProducts.length >= CONFIG.maxTotalProducts ) break;

			const categoryProducts = productsByCategory[category] || [];
			if ( categoryProducts.length === 0 ) continue;

			const sorted = [...categoryProducts].sort( ( a, b ) => {
				return getProductPriority( b ) - getProductPriority( a );
			} );

			const takeCount = Math.min( CONFIG.maxPerCategory, sorted.length );
			for ( let i = 0; i < takeCount; i++ ) {
				if ( selectedProducts.length >= CONFIG.maxTotalProducts ) break;
				selectedProducts.push( sorted[i] );
			}
		}

		const newHash = getProductsHash( selectedProducts );
		if ( cachedProducts && productsHash === newHash ) {
			return cachedProducts;
		}

		productsHash = newHash;
		const orderedProducts = applySavedOrder( selectedProducts );
		cachedProducts = orderedProducts;

		return orderedProducts;
	}

	/**
	 * Экранирует HTML для безопасности
	 * @param {string} str - исходная строка
	 * @returns {string} экранированная строка
	 */
	function escapeHtml( str ) {
		if ( !str ) return '';
		return str
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' );
	}

	// =========================================================================
	// 3. СОЗДАНИЕ КАРТОЧЕК ТОВАРОВ (БЕЗ ОБРАБОТЧИКОВ!)
	// =========================================================================

	/**
	 * Создает карточку товара (без привязки событий к кнопкам!)
	 * @param {Object} product - объект товара
	 * @returns {HTMLElement} DOM-элемент карточки
	 */
	function createProductCard( product ) {
		const card = document.createElement( 'div' );
		card.className = 'product-card';
		card.dataset.id = product.id;

		// Формируем бейджи
		let badges = '';
		if ( product.isNew ) {
			badges += '<span class="product-badge new">Новинка</span>';
		}
		if ( product.isHit ) {
			badges += '<span class="product-badge hit">Хит</span>';
		}
		if ( product.oldPrice && product.oldPrice > product.price ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) {
				badges += `<span class="product-badge sale">-${discount}%</span>`;
			}
		}

		card.innerHTML = `
			<div class="product-image">
				<img src="${API.getSafeImageUrl( product.image )}" 
					 alt="${escapeHtml( product.name )}" 
					 loading="lazy"
					 onerror="this.src='${API.getFallbackSvg( product.name )}'">
				${badges ? `<div class="product-badges">${badges}</div>` : ''}
			</div>
			<div class="product-content">
				<h3 class="product-title">${escapeHtml( product.name )}</h3>
				<p class="product-description">${escapeHtml( product.description || '' )}</p>
				<div class="product-meta">
					<span class="product-price">${API.formatPrice( product.price )}</span>
					${product.oldPrice ? `<span class="product-old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
				</div>
				<div class="product-actions">
					<button class="product-btn add-to-cart" data-id="${product.id}">
						<i class="fas fa-shopping-cart"></i> В корзину
					</button>
					<button class="favorite-btn" data-id="${product.id}">
						<i class="fas fa-heart"></i>
					</button>
				</div>
			</div>
		`;

		return card;
	}

	/**
	 * Рендерит товары в аккордеон (только при изменении состава)
	 * @param {boolean} preserveScroll - сохранять ли позицию скролла
	 */
	function renderAccordionProducts( preserveScroll = false ) {
		const container = document.getElementById( 'productsScroll' );
		if ( !container ) return;

		let savedScrollLeft = 0;
		if ( preserveScroll && container ) {
			savedScrollLeft = container.scrollLeft;
		}

		container.innerHTML = '';

		const products = getAccordionProducts();

		if ( products.length === 0 ) {
			container.innerHTML = '<div class="no-products">Товары скоро появятся</div>';
			return;
		}

		products.forEach( product => {
			container.appendChild( createProductCard( product ) );
		} );

		if ( typeof productsUpdateNavigation === 'function' ) {
			productsUpdateNavigation();
		}

		if ( preserveScroll && container && savedScrollLeft > 0 ) {
			setTimeout( () => {
				if ( savedScrollLeft <= container.scrollWidth - container.clientWidth ) {
					container.scrollLeft = savedScrollLeft;
				}
				if ( typeof productsUpdateCurrentIndex === 'function' ) {
					productsUpdateCurrentIndex();
				}
			}, 50 );
		}
	}

	// =========================================================================
	// 4. АККОРДЕОН: НАВИГАЦИЯ И ПРОКРУТКА
	// =========================================================================

	/** DOM-элементы */
	const productsScroll = document.getElementById( 'productsScroll' );
	const navbarTrack = document.querySelector( '.navbar-track' );

	if ( !productsScroll ) {
		console.error( '❌ Элемент productsScroll не найден' );
		return;
	}

	/** Состояние аккордеона */
	let productsCurrentIndex = 0;
	let productsAutoScrollTimer = null;
	let productsIsScrolling = false;
	let productsIsHovering = false;
	let productsCardWidth = 0;
	let productsTotalItems = 0;
	let productsVisibleItems = 0;
	let productsMaxIndex = 0;
	let productsSegments = [];
	let productsHoverTimer = null;

	/**
	 * Обновляет измерения (ширина карточек, количество видимых товаров)
	 */
	function productsUpdateMeasurements() {
		const cards = productsScroll.querySelectorAll( '.product-card' );
		if ( cards.length === 0 ) return;

		const card = cards[0];
		const style = window.getComputedStyle( productsScroll );
		const gap = parseInt( style.gap ) || 30;

		productsCardWidth = card.offsetWidth + gap;
		productsTotalItems = cards.length;
		productsVisibleItems = Math.floor( productsScroll.clientWidth / productsCardWidth );
		productsMaxIndex = Math.max( 0, productsTotalItems - productsVisibleItems );
	}

	/**
	 * Создает сегменты навигационной полоски
	 */
	function productsCreateNavbarSegments() {
		if ( !navbarTrack ) return;

		productsUpdateMeasurements();
		navbarTrack.innerHTML = '';
		productsSegments = [];

		const segmentCount = Math.max( 1, productsMaxIndex + 1 );

		for ( let i = 0; i < segmentCount; i++ ) {
			const segment = document.createElement( 'div' );
			segment.className = 'navbar-segment';
			segment.dataset.index = i;

			segment.addEventListener( 'click', function ( e ) {
				e.stopPropagation();
				productsScrollToIndex( parseInt( this.dataset.index ) );
			} );

			navbarTrack.appendChild( segment );
			productsSegments.push( segment );
		}

		productsUpdateActiveSegment();
	}

	/**
	 * Обновляет активный сегмент навигации
	 */
	function productsUpdateActiveSegment() {
		if ( productsSegments.length === 0 ) return;

		productsSegments.forEach( segment => {
			segment.classList.remove( 'active' );
			segment.style.animation = '';
		} );

		if ( productsSegments[productsCurrentIndex] ) {
			productsSegments[productsCurrentIndex].classList.add( 'active' );
		}
	}

	/**
	 * Обновляет текущий индекс на основе позиции скролла
	 */
	function productsUpdateCurrentIndex() {
		if ( productsIsScrolling ) return;

		productsUpdateMeasurements();

		if ( productsCardWidth === 0 || productsMaxIndex === 0 ) {
			if ( productsCurrentIndex !== 0 ) {
				productsCurrentIndex = 0;
				productsUpdateActiveSegment();
			}
			return;
		}

		const rawIndex = Math.round( productsScroll.scrollLeft / productsCardWidth );
		let newIndex;

		if ( CONFIG.loopScroll ) {
			if ( rawIndex < 0 ) {
				newIndex = productsMaxIndex + ( ( rawIndex + 1 ) % productsMaxIndex ) - 1;
				if ( newIndex < 0 ) newIndex = productsMaxIndex;
			} else if ( rawIndex > productsMaxIndex ) {
				newIndex = rawIndex % ( productsMaxIndex + 1 );
			} else {
				newIndex = rawIndex;
			}

			if ( rawIndex < 0 || rawIndex > productsMaxIndex ) {
				productsScroll.scrollLeft = newIndex * productsCardWidth;
			}
		} else {
			newIndex = Math.max( 0, Math.min( rawIndex, productsMaxIndex ) );
		}

		if ( newIndex !== productsCurrentIndex ) {
			productsCurrentIndex = newIndex;
			productsUpdateActiveSegment();
		}
	}

	/**
	 * Плавная прокрутка к позиции
	 * @param {number} position - позиция в пикселях
	 * @param {boolean} instant - мгновенная прокрутка
	 */
	function productsSmoothScrollTo( position, instant = false ) {
		if ( productsIsScrolling && !instant ) return;

		productsIsScrolling = true;
		productsScroll.scrollTo( {
			left: position,
			behavior: instant ? 'auto' : 'smooth'
		} );

		setTimeout( () => {
			productsIsScrolling = false;
		}, CONFIG.transitionDuration );
	}

	/**
	 * Прокрутка к индексу
	 * @param {number} index - индекс слайда
	 */
	function productsScrollToIndex( index ) {
		productsUpdateMeasurements();

		if ( index < 0 || index > productsMaxIndex || productsIsScrolling || index === productsCurrentIndex ) return;

		productsCurrentIndex = index;
		productsUpdateActiveSegment();
		productsSmoothScrollTo( productsCurrentIndex * productsCardWidth );
		productsStopAutoScroll();
		productsStartAutoScroll();
	}

	/**
	 * Автоматическая прокрутка к следующему слайду
	 */
	function productsAutoScrollNext() {
		if ( productsIsScrolling ) return;

		productsUpdateMeasurements();

		if ( productsCardWidth === 0 || productsMaxIndex === 0 ) return;

		let nextIndex = productsCurrentIndex >= productsMaxIndex ? 0 : productsCurrentIndex + 1;
		productsCurrentIndex = nextIndex;
		productsUpdateActiveSegment();
		productsSmoothScrollTo( productsCurrentIndex * productsCardWidth );
	}

	/**
	 * Запуск автоматической прокрутки
	 */
	function productsStartAutoScroll() {
		productsStopAutoScroll();

		const interval = productsIsHovering ? CONFIG.hoverScrollInterval : CONFIG.autoScrollInterval;
		productsAutoScrollTimer = setInterval( productsAutoScrollNext, interval );
	}

	/**
	 * Остановка автоматической прокрутки
	 */
	function productsStopAutoScroll() {
		if ( productsAutoScrollTimer ) {
			clearInterval( productsAutoScrollTimer );
			productsAutoScrollTimer = null;
		}
	}

	/**
	 * Обработчик наведения на карточку
	 */
	function productsHandleProductHover() {
		if ( productsIsHovering ) return;
		if ( productsHoverTimer ) clearTimeout( productsHoverTimer );

		productsIsHovering = true;
		productsStopAutoScroll();
		productsStartAutoScroll();
	}

	/**
	 * Обработчик ухода мыши с карточки
	 */
	function productsHandleProductLeave() {
		if ( productsHoverTimer ) clearTimeout( productsHoverTimer );

		productsHoverTimer = setTimeout( () => {
			productsIsHovering = false;
			productsStopAutoScroll();
			productsStartAutoScroll();
			productsHoverTimer = null;
		}, 300 );
	}

	/**
	 * Добавляет обработчики наведения на карточки
	 */
	function productsAddProductHoverHandlers() {
		document.querySelectorAll( '.product-card' ).forEach( card => {
			card.removeEventListener( 'mouseenter', productsHandleProductHover );
			card.removeEventListener( 'mouseleave', productsHandleProductLeave );
			card.addEventListener( 'mouseenter', productsHandleProductHover );
			card.addEventListener( 'mouseleave', productsHandleProductLeave );
		} );
	}

	/**
	 * Обновляет навигацию при изменении размера окна
	 */
	function productsUpdateNavigation() {
		const oldScrollLeft = productsScroll.scrollLeft;

		productsUpdateMeasurements();
		productsCreateNavbarSegments();

		if ( productsCurrentIndex > productsMaxIndex ) {
			productsCurrentIndex = Math.max( 0, productsMaxIndex );
		}

		if ( productsCardWidth > 0 ) {
			const newScrollLeft = Math.min( oldScrollLeft, productsMaxIndex * productsCardWidth );
			productsScroll.scrollLeft = newScrollLeft;
		}

		productsUpdateActiveSegment();
	}

	// =========================================================================
	// 5. ПОДПИСКА НА СОБЫТИЯ
	// =========================================================================

	// События прокрутки и наведения
	productsScroll.addEventListener( 'scroll', productsUpdateCurrentIndex );
	productsScroll.addEventListener( 'mouseenter', productsStopAutoScroll );
	productsScroll.addEventListener( 'mouseleave', productsStartAutoScroll );

	// Инициализация
	renderAccordionProducts( false );

	setTimeout( () => {
		productsUpdateMeasurements();
		productsCreateNavbarSegments();
		productsAddProductHoverHandlers();
		productsUpdateCurrentIndex();
		productsStartAutoScroll();
	}, 100 );

	// Изменение размера окна
	let productsResizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( productsResizeTimer );
		productsResizeTimer = setTimeout( () => {
			productsUpdateNavigation();
			productsStopAutoScroll();
			productsStartAutoScroll();
		}, 250 );
	} );

	// Наблюдатель за изменением DOM (для обновления навигации)
	const productsObserver = new MutationObserver( function ( mutations ) {
		let shouldUpdate = false;
		mutations.forEach( function ( mutation ) {
			if ( mutation.type === 'childList' && ( mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 ) ) {
				shouldUpdate = true;
			}
		} );
		if ( shouldUpdate ) {
			productsUpdateNavigation();
			productsAddProductHoverHandlers();
		}
	} );

	productsObserver.observe( productsScroll, { childList: true, subtree: false } );

	// Слушаем обновление товаров - перерисовываем ТОЛЬКО если состав изменился
	window.addEventListener( 'store:productsUpdated', function () {
		const oldHash = productsHash;
		const newProducts = getAccordionProducts();
		const newHash = getProductsHash( newProducts );

		if ( oldHash !== newHash ) {
			console.log( '🔄 Состав товаров изменился, обновляем аккордеон' );
			renderAccordionProducts( true );
			setTimeout( () => {
				productsUpdateNavigation();
				productsAddProductHoverHandlers();
			}, 100 );
		}
	} );

	console.log( '✅ Скролл-аккордеон товаров инициализирован (только скролл и навигация)' );
} )();