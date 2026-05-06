/**
 * Скрипт для горизонтального скролл-аккордеона товаров с навигационной полоской
 * Загружает товары с пометками: Новинки, Хиты, Скидки
 * 
 * Логика отбора:
 * - Приоритет: сначала Хиты, затем Новинки, затем Скидки
 * - Из каждой категории берется не более 2 товаров
 * - Всего не более 26 товаров (чтобы не перегружать аккордеон)
 */

document.addEventListener( 'DOMContentLoaded', function () {
	// ========== ЗАГРУЗКА И ОТОБРАЖЕНИЕ ТОВАРОВ ==========

	/**
	 * Получает товары для аккордеона: Новинки, Хиты, Скидки
	 * @returns {Array} отсортированный массив товаров
	 */
	function getAccordionProducts() {
		const allProducts = store.products || [];

		// Фильтруем только товары в наличии
		const availableProducts = allProducts.filter( p =>
			p.status === 'in-stock' && p.quantity > 0
		);

		// Группируем товары по категориям
		const productsByCategory = {};

		availableProducts.forEach( product => {
			const category = product.category;
			if ( !productsByCategory[category] ) {
				productsByCategory[category] = [];
			}
			productsByCategory[category].push( product );
		} );

		// Собираем товары по приоритетам
		const selectedProducts = [];
		const maxPerCategory = 2;      // Не более 2 товаров из категории
		const maxTotal = 26;            // Всего не более 26 товаров

		// Список категорий в порядке приоритета (можно настроить)
		const categoryOrder = [
			'figures', 'tea', 'sweets', 'manga', 'clothing',
			'tableware', 'games', 'stationery', 'cosmetics',
			'decor', 'anime', 'music', 'other'
		];

		// Для каждой категории выбираем до 2 лучших товаров
		for ( const category of categoryOrder ) {
			if ( selectedProducts.length >= maxTotal ) break;

			const categoryProducts = productsByCategory[category] || [];
			if ( categoryProducts.length === 0 ) continue;

			// Сортируем товары в категории по приоритету:
			// 1. Хиты (isHit) и Новинки (isNew) и Скидки (oldPrice)
			const sorted = [...categoryProducts].sort( ( a, b ) => {
				// Функция приоритета: Хит = 3, Новинка = 2, Скидка = 1
				const getPriority = ( p ) => {
					let priority = 0;
					if ( p.isHit ) priority += 3;
					if ( p.isNew ) priority += 2;
					if ( p.oldPrice && p.oldPrice > p.price ) priority += 1;
					return priority;
				};
				return getPriority( b ) - getPriority( a );
			} );

			// Берем до maxPerCategory товаров из категории
			const takeCount = Math.min( maxPerCategory, sorted.length );
			for ( let i = 0; i < takeCount; i++ ) {
				if ( selectedProducts.length >= maxTotal ) break;
				selectedProducts.push( sorted[i] );
			}
		}

		console.log( `🎯 Аккордеон: загружено ${selectedProducts.length} товаров (${availableProducts.length} доступно)` );

		// Перемешиваем финальный список для разнообразия
		return shuffleArray( selectedProducts );
	}

	/**
	 * Перемешивает массив
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
	 * Рендерит товары в аккордеоне
	 */
	function renderAccordionProducts() {
		const container = document.getElementById( 'productsScroll' );
		if ( !container ) {
			console.error( 'Элемент productsScroll не найден' );
			return;
		}

		// Очищаем контейнер от статических товаров
		container.innerHTML = '';

		// Получаем товары для аккордеона
		const products = getAccordionProducts();

		if ( products.length === 0 ) {
			container.innerHTML = '<div class="no-products">Товары скоро появятся</div>';
			return;
		}

		// Генерируем HTML для каждого товара
		products.forEach( product => {
			const productCard = createProductCard( product );
			container.appendChild( productCard );
		} );

		// После добавления товаров, обновляем навигацию аккордеона
		if ( typeof productsUpdateNavigation === 'function' ) {
			productsUpdateNavigation();
		}

		// Добавляем обработчики для кнопок "В корзину" и "Избранное"
		attachProductEventHandlers();
	}

	/**
	 * Создает карточку товара
	 * @param {Object} product - объект товара
	 * @returns {HTMLElement} карточка товара
	 */
	function createProductCard( product ) {
		const card = document.createElement( 'div' );
		card.className = 'product-card';
		card.dataset.id = product.id;

		// Определяем бейджи
		let badges = '';
		if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="product-badge hit">Хит</span>';
		if ( product.oldPrice && product.oldPrice > product.price ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="product-badge sale">-${discount}%</span>`;
		}

		// Формируем HTML карточки
		card.innerHTML = `
            <div class="product-image">
                <img src="${API.getSafeImageUrl( product.image )}" 
                     alt="${product.name}" 
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
	 * Экранирует HTML для безопасности
	 * @param {string} str - строка
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

	/**
	 * Добавляет обработчики для кнопок "В корзину" и "Избранное"
	 * Использует делегирование событий
	 */
	function attachProductEventHandlers() {
		const container = document.getElementById( 'productsScroll' );
		if ( !container ) return;

		// Удаляем старый обработчик, если был
		if ( container._delegateHandler ) {
			container.removeEventListener( 'click', container._delegateHandler );
		}

		// Создаем обработчик через делегирование
		container._delegateHandler = function ( e ) {
			// Кнопка "В корзину"
			const cartBtn = e.target.closest( '.add-to-cart' );
			if ( cartBtn ) {
				e.preventDefault();
				e.stopPropagation();
				const productId = cartBtn.dataset.id;

				if ( store.addToCart( productId ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект
					const originalHTML = cartBtn.innerHTML;
					cartBtn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					cartBtn.style.background = '#2ecc71';

					setTimeout( () => {
						cartBtn.innerHTML = originalHTML;
						cartBtn.style.background = '';
					}, 1500 );

					updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
				return;
			}

			// Кнопка "Избранное"
			const favBtn = e.target.closest( '.favorite-btn' );
			if ( favBtn ) {
				e.preventDefault();
				e.stopPropagation();
				const productId = favBtn.dataset.id;
				const isFavorite = store.toggleFavorite( productId );

				if ( isFavorite ) {
					favBtn.classList.add( 'active' );
					API.showNotification( '❤️ Добавлено в избранное' );
				} else {
					favBtn.classList.remove( 'active' );
					API.showNotification( '💔 Удалено из избранного' );
				}

				updateHeaderCounters();
				return;
			}
		};

		container.addEventListener( 'click', container._delegateHandler );
	}

	/**
	 * Обновляет счетчики в шапке
	 */
	function updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );

		if ( cartCount ) {
			cartCount.textContent = store.getCartCount();
		}
		if ( favoritesCount ) {
			favoritesCount.textContent = store.favorites.length;
		}
	}

	/**
	 * Обновляет активное состояние кнопок избранного
	 */
	function updateFavoriteButtonsState() {
		document.querySelectorAll( '.favorite-btn' ).forEach( btn => {
			const productId = btn.dataset.id;
			if ( productId && store.isFavorite( productId ) ) {
				btn.classList.add( 'active' );
			}
		} );
	}

	// ========== ИНИЦИАЛИЗАЦИЯ АККОРДЕОНА ==========

	// Получаем элементы
	let productsScroll = document.getElementById( 'productsScroll' );
	const navbarTrack = document.querySelector( '.navbar-track' );

	// Проверка наличия основного элемента
	if ( !productsScroll ) {
		console.error( 'Элемент продуктового скролла не найден' );
		return;
	}

	// Конфигурация
	const config = {
		autoScrollInterval: 4000,
		hoverScrollInterval: 6000,
		transitionDuration: 600,
		loopScroll: true,
		animationEnabled: true,
	};

	// Состояние
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

	// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (оставляем без изменений) ==========

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
				const index = parseInt( this.dataset.index );
				productsScrollToIndex( index );
			} );
			navbarTrack.appendChild( segment );
			productsSegments.push( segment );
		}
		productsUpdateActiveSegment();
		console.debug( 'Created segments:', segmentCount );
	}

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
		if ( config.loopScroll ) {
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

	function productsSmoothScrollTo( position, instant = false ) {
		if ( productsIsScrolling && !instant ) return;
		productsIsScrolling = true;
		productsScroll.scrollTo( { left: position, behavior: instant ? 'auto' : 'smooth' } );
		setTimeout( () => { productsIsScrolling = false; }, config.transitionDuration );
	}

	function productsScrollToIndex( index ) {
		productsUpdateMeasurements();
		if ( index < 0 || index > productsMaxIndex || productsIsScrolling || index === productsCurrentIndex ) return;
		productsCurrentIndex = index;
		productsUpdateActiveSegment();
		productsSmoothScrollTo( productsCurrentIndex * productsCardWidth );
		productsStopAutoScroll();
		productsStartAutoScroll();
	}

	function productsAutoScrollNext() {
		if ( productsIsScrolling ) return;
		productsUpdateMeasurements();
		if ( productsCardWidth === 0 || productsMaxIndex === 0 ) return;
		let nextIndex = productsCurrentIndex >= productsMaxIndex ? 0 : productsCurrentIndex + 1;
		productsCurrentIndex = nextIndex;
		productsUpdateActiveSegment();
		productsSmoothScrollTo( productsCurrentIndex * productsCardWidth );
	}

	function productsStartAutoScroll() {
		productsStopAutoScroll();
		const interval = productsIsHovering ? config.hoverScrollInterval : config.autoScrollInterval;
		productsAutoScrollTimer = setInterval( productsAutoScrollNext, interval );
	}

	function productsStopAutoScroll() {
		if ( productsAutoScrollTimer ) {
			clearInterval( productsAutoScrollTimer );
			productsAutoScrollTimer = null;
		}
	}

	function productsHandleProductHover() {
		if ( productsIsHovering ) return;
		if ( productsHoverTimer ) clearTimeout( productsHoverTimer );
		productsIsHovering = true;
		productsStopAutoScroll();
		productsStartAutoScroll();
	}

	function productsHandleProductLeave() {
		if ( productsHoverTimer ) clearTimeout( productsHoverTimer );
		productsHoverTimer = setTimeout( () => {
			productsIsHovering = false;
			productsStopAutoScroll();
			productsStartAutoScroll();
			productsHoverTimer = null;
		}, 300 );
	}

	function productsAddProductHoverHandlers() {
		document.querySelectorAll( '.product-card' ).forEach( card => {
			card.removeEventListener( 'mouseenter', productsHandleProductHover );
			card.removeEventListener( 'mouseleave', productsHandleProductLeave );
			card.addEventListener( 'mouseenter', productsHandleProductHover );
			card.addEventListener( 'mouseleave', productsHandleProductLeave );
		} );
	}

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

	// ========== СЛУШАТЕЛИ СОБЫТИЙ ==========
	productsScroll.addEventListener( 'scroll', productsUpdateCurrentIndex );
	productsScroll.addEventListener( 'mouseenter', productsStopAutoScroll );
	productsScroll.addEventListener( 'mouseleave', productsStartAutoScroll );

	// ========== ИНИЦИАЛИЗАЦИЯ ==========

	// Сначала рендерим товары
	renderAccordionProducts();

	// Обновляем состояние кнопок избранного
	updateFavoriteButtonsState();

	// Затем настраиваем аккордеон
	setTimeout( () => {
		productsUpdateMeasurements();
		productsCreateNavbarSegments();
		productsAddProductHoverHandlers();
		productsUpdateCurrentIndex();
		productsStartAutoScroll();
	}, 100 );

	// Обработчик изменения размера окна
	let productsResizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( productsResizeTimer );
		productsResizeTimer = setTimeout( () => {
			productsUpdateNavigation();
			productsStopAutoScroll();
			productsStartAutoScroll();
		}, 250 );
	} );

	// Наблюдатель за изменениями в DOM
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
			updateFavoriteButtonsState();
		}
	} );
	productsObserver.observe( productsScroll, { childList: true, subtree: false } );

	// Слушаем обновление товаров
	window.addEventListener( 'store:productsUpdated', function () {
		renderAccordionProducts();
		setTimeout( () => {
			productsUpdateNavigation();
			productsAddProductHoverHandlers();
			updateFavoriteButtonsState();
		}, 100 );
	} );

	// Слушаем обновление избранного (чтобы обновить состояние кнопок)
	window.addEventListener( 'store:favoritesUpdated', function () {
		updateFavoriteButtonsState();
	} );

	console.log( '✅ Скролл-аккордеон товаров инициализирован' );
} );