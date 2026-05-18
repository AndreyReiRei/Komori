/**
 * Скрипт для горизонтального скролл-аккордеона товаров с навигационной полоской
 * Загружает товары с пометками: Новинки, Хиты, Скидки
 */

document.addEventListener( 'DOMContentLoaded', function () {
	// ========== ПЕРЕМЕННЫЕ ДЛЯ СОХРАНЕНИЯ ПОРЯДКА ==========
	let cachedProducts = null;
	let productsHash = null;
	let isUpdating = false; // Флаг для предотвращения повторных обновлений

	// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПОРЯДКОМ ==========

	function getProductsHash( products ) {
		const ids = products.map( p => p.id ).join( ',' );
		return `${products.length}_${ids}`;
	}

	function saveProductsOrder( products ) {
		const order = products.map( p => p.id );
		localStorage.setItem( 'komori_accordion_order', JSON.stringify( order ) );
	}

	function loadProductsOrder() {
		const saved = localStorage.getItem( 'komori_accordion_order' );
		if ( saved ) {
			try {
				return JSON.parse( saved );
			} catch ( e ) {
				return null;
			}
		}
		return null;
	}

	function applySavedOrder( products ) {
		const savedOrder = loadProductsOrder();
		if ( !savedOrder || savedOrder.length !== products.length ) {
			const shuffled = shuffleArray( [...products] );
			saveProductsOrder( shuffled );
			return shuffled;
		}

		const orderedProducts = [];
		for ( const id of savedOrder ) {
			const product = products.find( p => p.id == id );
			if ( product ) orderedProducts.push( product );
		}
		for ( const product of products ) {
			if ( !orderedProducts.includes( product ) ) orderedProducts.push( product );
		}
		return orderedProducts;
	}

	function shuffleArray( array ) {
		const shuffled = [...array];
		for ( let i = shuffled.length - 1; i > 0; i-- ) {
			const j = Math.floor( Math.random() * ( i + 1 ) );
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	/**
	 * Получает товары для аккордеона
	 */
	function getAccordionProducts() {
		const allProducts = store.products || [];
		const availableProducts = allProducts.filter( p =>
			p.status === 'in-stock' && p.quantity > 0
		);

		const productsByCategory = {};
		availableProducts.forEach( product => {
			const category = product.category;
			if ( !productsByCategory[category] ) productsByCategory[category] = [];
			productsByCategory[category].push( product );
		} );

		const selectedProducts = [];
		const maxPerCategory = 2;
		const maxTotal = 26;

		const categoryOrder = [
			'figures', 'tea', 'sweets', 'manga', 'clothing',
			'tableware', 'games', 'stationery', 'cosmetics',
			'decor', 'anime', 'music', 'other'
		];

		for ( const category of categoryOrder ) {
			if ( selectedProducts.length >= maxTotal ) break;
			const categoryProducts = productsByCategory[category] || [];
			if ( categoryProducts.length === 0 ) continue;

			const sorted = [...categoryProducts].sort( ( a, b ) => {
				const getPriority = ( p ) => {
					let priority = 0;
					if ( p.isHit ) priority += 3;
					if ( p.isNew ) priority += 2;
					if ( p.oldPrice && p.oldPrice > p.price ) priority += 1;
					return priority;
				};
				return getPriority( b ) - getPriority( a );
			} );

			const takeCount = Math.min( maxPerCategory, sorted.length );
			for ( let i = 0; i < takeCount; i++ ) {
				if ( selectedProducts.length >= maxTotal ) break;
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
	 * Обновляет состояние кнопки "В корзину" (без перерисовки карточки)
	 */
	function updateCartButtonState( button, productId ) {
		const product = store.getProduct( productId );
		const inCart = store.cart.find( item => item.id == productId );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product ? product.quantity - inCartQuantity : 0;

		if ( !product || product.quantity <= 0 || availableQuantity <= 0 ) {
			button.disabled = true;
		} else {
			button.disabled = false;
		}
	}

	/**
	 * Обновляет состояние кнопки "Избранное" (без перерисовки карточки)
	 */
	function updateFavoriteButtonState( button, productId ) {
		const isFavorite = store.isFavorite( productId );
		if ( isFavorite ) {
			button.classList.add( 'active' );
		} else {
			button.classList.remove( 'active' );
		}
	}

	/**
	 * Создает карточку товара
	 */
	function createProductCard( product ) {
		const card = document.createElement( 'div' );
		card.className = 'product-card';
		card.dataset.id = product.id;

		let badges = '';
		if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="product-badge hit">Хит</span>';
		if ( product.oldPrice && product.oldPrice > product.price ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="product-badge sale">-${discount}%</span>`;
		}

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
	 * Рендерит товары в аккордеоне (только при загрузке страницы или изменении состава товаров)
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

		// Прикрепляем обработчики для кнопок
		attachProductEventHandlers();
	}

	/**
	 * Прикрепляет обработчики для кнопок (без перерисовки)
	 */
	function attachProductEventHandlers() {
		const container = document.getElementById( 'productsScroll' );
		if ( !container ) return;

		if ( container._delegateHandler ) {
			container.removeEventListener( 'click', container._delegateHandler );
		}

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

					// Обновляем состояние кнопки (без перерисовки!)
					updateCartButtonState( cartBtn, productId );

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

				// Обновляем состояние кнопки (без перерисовки!)
				updateFavoriteButtonState( favBtn, productId );

				API.showNotification( isFavorite ? '❤️ Добавлено в избранное' : '💔 Удалено из избранного' );
				updateHeaderCounters();
				return;
			}
		};

		container.addEventListener( 'click', container._delegateHandler );
	}

	function updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );
		if ( cartCount ) cartCount.textContent = store.getCartCount();
		if ( favoritesCount ) favoritesCount.textContent = store.favorites.length;
	}

	// ========== ИНИЦИАЛИЗАЦИЯ АККОРДЕОНА ==========

	let productsScroll = document.getElementById( 'productsScroll' );
	const navbarTrack = document.querySelector( '.navbar-track' );

	if ( !productsScroll ) {
		console.error( 'Элемент продуктового скролла не найден' );
		return;
	}

	const config = {
		autoScrollInterval: 5000,      // Интервал автоскролла (5000 мс = 5 секунд)
		hoverScrollInterval: 8000,     // Интервал при наведении на товар (8 секунд)
		transitionDuration: 600,       // Длительность анимации прокрутки (600 мс)
		loopScroll: true,              // Зацикленная прокрутка
		animationEnabled: true,        // Включить анимацию
	};

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

	// ========== ФУНКЦИИ АККОРДЕОНА (без изменений) ==========

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

	// ОДИН РАЗ рендерим товары при загрузке
	renderAccordionProducts( false );

	setTimeout( () => {
		productsUpdateMeasurements();
		productsCreateNavbarSegments();
		productsAddProductHoverHandlers();
		productsUpdateCurrentIndex();
		productsStartAutoScroll();
	}, 100 );

	let productsResizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( productsResizeTimer );
		productsResizeTimer = setTimeout( () => {
			productsUpdateNavigation();
			productsStopAutoScroll();
			productsStartAutoScroll();
		}, 250 );
	} );

	// Наблюдатель за изменениями в DOM (ТОЛЬКО для обновления навигации, НЕ для перерисовки)
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

	// Слушаем обновление товаров - ПЕРЕРИСОВЫВАЕМ ТОЛЬКО ЕСЛИ СОСТАВ ИЗМЕНИЛСЯ
	window.addEventListener( 'store:productsUpdated', function () {
		const oldHash = productsHash;
		const newProducts = getAccordionProducts();
		const newHash = getProductsHash( newProducts );

		if ( oldHash !== newHash ) {
			// Состав товаров изменился - перерисовываем
			console.log( '🔄 Состав товаров изменился, обновляем аккордеон' );
			renderAccordionProducts( true );
			setTimeout( () => {
				productsUpdateNavigation();
				productsAddProductHoverHandlers();
			}, 100 );
		} else {
			console.log( '📦 Состав товаров не изменился, перерисовка не требуется' );
		}
	} );

	// НЕ ПЕРЕРИСОВЫВАЕМ АККОРДЕОН ПРИ ДОБАВЛЕНИИ В КОРЗИНУ ИЛИ ИЗБРАННОЕ!
	// Только обновляем состояние кнопок через updateCartButtonState и updateFavoriteButtonState

	// Обновляем состояние кнопок избранного при изменении избранного
	window.addEventListener( 'store:favoritesUpdated', function () {
		document.querySelectorAll( '.favorite-btn' ).forEach( btn => {
			const productId = btn.dataset.id;
			if ( productId ) {
				updateFavoriteButtonState( btn, productId );
			}
		} );
	} );

	console.log( '✅ Скролл-аккордеон товаров инициализирован' );
} );