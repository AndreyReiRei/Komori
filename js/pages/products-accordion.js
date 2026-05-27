/**
 * ============================================================================
 * СКРИПТ ДЛЯ ГОРИЗОНТАЛЬНОГО СКРОЛЛ-АККОРДЕОНА ТОВАРОВ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - ОТОБРАЖАЕТ товары в горизонтальном скролле (ТОЛЬКО ПРИ ЗАГРУЗКЕ СТРАНИЦЫ)
 * - УПРАВЛЯЕТ навигацией и прокруткой
 * - НЕ ПЕРЕРИСОВЫВАЕТ карточки при обновлении корзины/избранного
 * - ТОЛЬКО обновляет состояние кнопок и счетчики
 * 
 * ============================================================================
 */

( function () {
	'use strict';

	// =========================================================================
	// 1. ПРОВЕРКА - ЕСТЬ ЛИ АККОРДЕОН НА СТРАНИЦЕ?
	// =========================================================================

	const productsScroll = document.getElementById( 'productsScroll' );
	if ( !productsScroll ) {
		console.log( '📊 Аккордеон: контейнер productsScroll не найден' );
		return;
	}

	console.log( '📊 Аккордеон: инициализация...' );

	// =========================================================================
	// 2. КОНФИГУРАЦИЯ
	// =========================================================================

	const CONFIG = {
		autoScrollInterval: 5000,
		hoverScrollInterval: 8000,
		transitionDuration: 600,
		loopScroll: true,
		maxTotalProducts: 20,
		maxPerCategory: 2
	};

	// =========================================================================
	// 3. ПОЛУЧЕНИЕ И ОТОБРАЖЕНИЕ ТОВАРОВ (ТОЛЬКО ОДИН РАЗ!)
	// =========================================================================

	let isAccordionInitialized = false;
	let productsRendered = false;

	/**
	 * Вычисляет приоритет товара для отбора в аккордеон
	 */
	function getProductPriority( product ) {
		let priority = 0;
		if ( product.isHit ) priority += 100;
		if ( product.isNew ) priority += 50;
		if ( product.oldPrice && product.oldPrice > product.price ) priority += 25;
		return priority;
	}

	/**
	 * Получает товары для аккордеона
	 */
	function getAccordionProducts() {
		const allProducts = store.products || [];
		const availableProducts = allProducts.filter( p =>
			p.status === 'in-stock' && p.quantity > 0
		);

		const sorted = [...availableProducts].sort( ( a, b ) => {
			return getProductPriority( b ) - getProductPriority( a );
		} );

		const result = [];
		const categoryCount = {};

		for ( const product of sorted ) {
			const cat = product.category;
			const used = categoryCount[cat] || 0;
			if ( used >= CONFIG.maxPerCategory ) continue;
			if ( result.length >= CONFIG.maxTotalProducts ) break;
			result.push( product );
			categoryCount[cat] = used + 1;
		}

		console.log( `📊 Аккордеон: отобрано ${result.length} товаров` );
		return result;
	}

	/**
	 * Экранирует HTML
	 */
	function escapeHtml( str ) {
		if ( !str ) return '';
		return str.replace( /[&<>]/g, function ( m ) {
			if ( m === '&' ) return '&amp;';
			if ( m === '<' ) return '&lt;';
			if ( m === '>' ) return '&gt;';
			return m;
		} );
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

		const categoryUrl = store.getCategoryUrl( product.category );

		card.innerHTML = `
		<a href="${categoryUrl}" class="product-card-link">
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
			</div>
		</a>
		<div class="product-actions">
			<button class="product-btn add-to-cart" data-id="${product.id}">
				<i class="fas fa-shopping-cart"></i> В корзину
			</button>
			<button class="favorite-btn" data-id="${product.id}">
				<i class="fas fa-heart"></i>
			</button>
		</div>
	`;

		return card;
	}

	/**
	 * Рендерит товары в аккордеон (ТОЛЬКО ОДИН РАЗ!)
	 */
	function renderAccordionProducts() {
		if ( productsRendered ) {
			console.log( '📊 Аккордеон: товары уже отображены, пропускаем рендер' );
			return;
		}

		const products = getAccordionProducts();
		if ( products.length === 0 ) {
			productsScroll.innerHTML = '<div class="no-products">Товары скоро появятся</div>';
			productsRendered = true;
			return;
		}

		// Очищаем только если ничего нет
		if ( productsScroll.children.length === 0 ) {
			products.forEach( product => {
				productsScroll.appendChild( createProductCard( product ) );
			} );
		}

		productsRendered = true;
		console.log( `📊 Аккордеон: отрендерено ${products.length} товаров (однократно)` );
	}

	// =========================================================================
	// 4. ОБНОВЛЕНИЕ КНОПОК (БЕЗ ПЕРЕРИСОВКИ КАРТОЧЕК!)
	// =========================================================================

	/**
	 * Обновляет состояние всех кнопок "В корзину" в аккордеоне
	 */
	function updateCartButtons() {
		const cartButtons = productsScroll.querySelectorAll( '.add-to-cart' );
		cartButtons.forEach( btn => {
			const productId = btn.dataset.id;
			const product = store.getProduct( productId );
			if ( !product ) return;

			const inCart = store.cart.find( item => item.id == productId );
			const inCartQuantity = inCart ? inCart.quantity : 0;
			const availableQuantity = product.quantity - inCartQuantity;

			btn.disabled = !( product.status === 'in-stock' && availableQuantity > 0 );
		} );
	}

	/**
	 * Обновляет состояние всех кнопок "Избранное" в аккордеоне
	 */
	function updateFavoriteButtons() {
		const favButtons = productsScroll.querySelectorAll( '.favorite-btn' );
		favButtons.forEach( btn => {
			const productId = btn.dataset.id;
			const isFavorite = store.isFavorite( productId );
			if ( isFavorite ) {
				btn.classList.add( 'active' );
			} else {
				btn.classList.remove( 'active' );
			}
		} );
	}

	// =========================================================================
	// 5. НАВИГАЦИЯ И ПРОКРУТКА
	// =========================================================================

	const navbarTrack = document.querySelector( '.navbar-track' );

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
				productsScrollToIndex( parseInt( this.dataset.index ) );
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

	function productsSmoothScrollTo( position, instant = false ) {
		if ( productsIsScrolling && !instant ) return;
		productsIsScrolling = true;
		productsScroll.scrollTo( { left: position, behavior: instant ? 'auto' : 'smooth' } );
		setTimeout( () => { productsIsScrolling = false; }, CONFIG.transitionDuration );
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
		const interval = productsIsHovering ? CONFIG.hoverScrollInterval : CONFIG.autoScrollInterval;
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

	// =========================================================================
	// 6. ПОДПИСКА НА СОБЫТИЯ
	// =========================================================================

	// События прокрутки и наведения
	productsScroll.addEventListener( 'scroll', productsUpdateCurrentIndex );
	productsScroll.addEventListener( 'mouseenter', productsStopAutoScroll );
	productsScroll.addEventListener( 'mouseleave', productsStartAutoScroll );

	// =========================================================================
	// 7. ИНИЦИАЛИЗАЦИЯ (ТОЛЬКО ОДИН РАЗ!)
	// =========================================================================

	// Рендерим товары
	renderAccordionProducts();

	// Настраиваем аккордеон
	setTimeout( () => {
		productsUpdateMeasurements();
		productsCreateNavbarSegments();
		productsAddProductHoverHandlers();
		productsUpdateCurrentIndex();
		productsStartAutoScroll();
		isAccordionInitialized = true;
		console.log( '✅ Аккордеон: инициализация завершена' );
	}, 200 );

	// Изменение размера окна
	let productsResizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( productsResizeTimer );
		productsResizeTimer = setTimeout( () => {
			if ( isAccordionInitialized ) {
				productsUpdateNavigation();
				productsStopAutoScroll();
				productsStartAutoScroll();
			}
		}, 250 );
	} );

	// Наблюдатель за изменением DOM (только для обновления навигации, НЕ для перерисовки!)
	const productsObserver = new MutationObserver( function ( mutations ) {
		let shouldUpdate = false;
		mutations.forEach( function ( mutation ) {
			if ( mutation.type === 'childList' && ( mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 ) ) {
				shouldUpdate = true;
			}
		} );
		if ( shouldUpdate && isAccordionInitialized ) {
			productsUpdateNavigation();
			productsAddProductHoverHandlers();
		}
	} );

	if ( productsScroll ) {
		productsObserver.observe( productsScroll, { childList: true, subtree: false } );
	}

	// =========================================================================
	// 8. ОБНОВЛЕНИЕ КНОПОК (БЕЗ ПЕРЕРИСОВКИ!)
	// =========================================================================

	// Слушаем обновление корзины - только обновляем кнопки
	window.addEventListener( 'store:cartUpdated', () => {
		updateCartButtons();
		API.updateHeaderCounters();
	} );

	// Слушаем обновление избранного - только обновляем кнопки
	window.addEventListener( 'store:favoritesUpdated', () => {
		updateFavoriteButtons();
		API.updateHeaderCounters();
	} );

	// Слушаем обновление товаров - только если изменился состав, но НЕ перерисовываем!
	// (catalog.js позаботится о новых карточках, если они появятся)
	window.addEventListener( 'store:productsUpdated', () => {
		console.log( '📊 Аккордеон: товары обновлены, но перерисовка НЕ выполняется (только кнопки)' );
		// Обновляем только кнопки
		updateCartButtons();
		updateFavoriteButtons();
	} );

	console.log( '✅ Аккордеон: готов (скролл, навигация, кнопки обновляются без перерисовки)' );

} )();