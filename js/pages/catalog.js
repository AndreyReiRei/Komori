/**
 * ============================================================================
 * CATALOG.JS - КЛАСС ДЛЯ УПРАВЛЕНИЯ КАТАЛОГОМ ТОВАРОВ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Управляет кнопками "В корзину" и "Избранное" для всех карточек
 * - Обеспечивает разворачивание/сворачивание категорий каталога
 * - Отображает демо-товары при отсутствии данных в store
 * - Обеспечивает переход на страницу товара при клике на карточку
 * - НЕ ПЕРЕРИСОВЫВАЕТ аккордеон (products-scroll) - только управляет кнопками
 * 
 * ============================================================================
 */

class CatalogPage {
	constructor() {
		/** @type {HTMLElement} Контейнер для товаров (может быть несколько) */
		this.productsContainers = document.querySelectorAll( '.products-scroll, .products-grid, .catalog-grid .products-grid, .category-products .products-grid' );

		/** @type {boolean} Флаг, указывающий, что это главная страница с аккордеоном */
		this.isAccordionPage = !!document.getElementById( 'productsScroll' );

		/** @type {boolean} Флаг, указывающий, что это страница каталога с сеткой */
		this.isCatalogGridPage = !!document.querySelector( '.catalog-grid .products-grid, .category-products .products-grid' );

		if ( this.productsContainers.length === 0 && !this.isCatalogGridPage ) {
			console.log( '📚 CatalogPage: контейнеры с товарами не найдены, пропускаем инициализацию' );
			return;
		}

		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Инициализирует страницу каталога
	 */
	init() {
		// Для страницы каталога с сеткой - рендерим товары
		if ( this.isCatalogGridPage && !this.isAccordionPage ) {
			console.log( '📚 CatalogPage: инициализация сетки каталога' );
			this.renderCatalogGrid();
		} else {
			console.log( '📚 CatalogPage: инициализация режима управления кнопками (аккордеон)' );
		}

		// Прикрепляем обработчики событий к существующим карточкам
		this.attachEventsToCards();

		// Настройка разворачивания каталога (если есть)
		this.setupExpandableCatalog();

		// Слушаем обновление корзины - обновляем состояние кнопок
		window.addEventListener( 'store:cartUpdated', () => {
			this.updateAllCartButtons();
			API.updateHeaderCounters();
		} );

		// Слушаем обновление избранного - обновляем состояние кнопок
		window.addEventListener( 'store:favoritesUpdated', () => {
			this.updateAllFavoriteButtons();
			API.updateHeaderCounters();
		} );

		// Слушаем обновление товаров - обновляем обработчики для новых карточек
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '📚 CatalogPage: товары обновлены' );
			// Если это страница каталога с сеткой - перерисовываем
			if ( this.isCatalogGridPage && !this.isAccordionPage ) {
				this.renderCatalogGrid();
			}
			// Всегда обновляем обработчики для новых карточек
			this.attachEventsToCards();
		} );

		// Наблюдатель за появлением новых карточек (для аккордеона)
		this.observeNewCards();

		console.log( '✅ CatalogPage инициализирован' );
	}

	// =========================================================================
	// ОТОБРАЖЕНИЕ СЕТКИ КАТАЛОГА (ТОЛЬКО ДЛЯ СТРАНИЦЫ КАТАЛОГА!)
	// =========================================================================

	/**
	 * Рендерит сетку каталога (для страницы catalog.html)
	 */
	renderCatalogGrid() {
		const gridContainer = document.querySelector( '.catalog-grid .products-grid, .category-products .products-grid' );
		if ( !gridContainer ) return;

		const products = store.getCatalogProducts( { showOnlyInStock: false } );

		if ( products.length === 0 ) {
			this.showDemoProducts( gridContainer );
			return;
		}

		gridContainer.innerHTML = products.map( product => this.renderProductCard( product ) ).join( '' );
		this.attachEventsToCards();
	}

	/**
	 * Показывает демо-товары, если в store пусто
	 * @param {HTMLElement} container - контейнер для товаров
	 */
	showDemoProducts( container ) {
		const demos = [
			{
				id: 'demo1',
				name: 'Аниме фигурка Наруто',
				price: 2499,
				oldPrice: 2999,
				description: 'Детализированная фигурка главного героя',
				image: 'https://via.placeholder.com/300x200',
				category: 'figures',
				isHit: true,
				status: 'in-stock',
				quantity: 10
			},
			{
				id: 'demo2',
				name: 'Чай маття премиум',
				price: 890,
				description: 'Настоящий японский зелёный чай',
				image: 'https://via.placeholder.com/300x200',
				category: 'tea',
				isNew: true,
				status: 'in-stock',
				quantity: 45
			},
			{
				id: 'demo3',
				name: 'Моти клубничные',
				price: 550,
				description: 'Нежные японские сладости',
				image: 'https://via.placeholder.com/300x200',
				category: 'sweets',
				status: 'in-stock',
				quantity: 23
			},
			{
				id: 'demo4',
				name: 'Пиала для чая "Сакура"',
				price: 890,
				oldPrice: 1190,
				description: 'Традиционная японская керамика',
				image: 'https://via.placeholder.com/300x200',
				category: 'tableware',
				status: 'in-stock',
				quantity: 15
			}
		];

		container.innerHTML = demos.map( product => this.renderProductCard( product ) ).join( '' );
		this.attachEventsToCards();
	}

	/**
	 * Создает HTML карточки товара
	 * @param {Object} product - объект товара
	 * @returns {string} HTML-код карточки
	 */
	/**
 * Создает HTML карточки товара
 * @param {Object} product - объект товара
 * @returns {string} HTML-код карточки
 */
	renderProductCard( product ) {
		// Проверяем наличие в корзине для начального состояния кнопки
		const inCart = store.cart.find( item => item.id === product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;
		const isFavorite = store.isFavorite( product.id );

		// Получаем URL страницы категории (для перехода по клику)
		const categoryUrl = store.getCategoryUrl( product.category );

		// Определяем бейджи
		let badges = '';
		if ( product.isHit ) badges += '<span class="product-badge hit">Хит продаж</span>';
		if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
		if ( product.oldPrice && product.oldPrice > product.price ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="product-badge sale">-${discount}%</span>`;
		}

		return `
		<div class="product-card" data-id="${product.id}" data-category="${product.category}">
			<!-- Вся карточка является ссылкой на страницу категории -->
			<a href="${categoryUrl}" class="product-card-link">
				<div class="product-image">
					<img src="${API.getSafeImageUrl( product.image )}" 
						 alt="${this.escapeHtml( product.name )}" 
						 loading="lazy"
						 onerror="this.src='${API.getFallbackSvg( product.name )}'">
					${badges ? `<div class="product-badges">${badges}</div>` : ''}
				</div>
				<div class="product-content">
					<h3 class="product-title">${this.escapeHtml( product.name )}</h3>
					<p class="product-description">${this.escapeHtml( product.description || '' )}</p>
					<div class="product-meta">
						<span class="product-price">${API.formatPrice( product.price )}</span>
						${product.oldPrice ? `<span class="product-old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
					</div>
				</div>
			</a>
			<div class="product-actions">
				<button class="product-btn add-to-cart" data-id="${product.id}"
						${product.status !== 'in-stock' || availableQuantity <= 0 ? 'disabled' : ''}>
					<i class="fas fa-shopping-cart"></i> В корзину
				</button>
				<button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${product.id}">
					<i class="fas fa-heart"></i>
				</button>
			</div>
		</div>
	`;
	}

	// =========================================================================
	// НАВИГАЦИЯ ПО ТОВАРАМ (НОВАЯ ФУНКЦИОНАЛЬНОСТЬ)
	// =========================================================================

	/**
	 * Получает URL страницы товара
	 * @param {Object} product - объект товара
	 * @returns {string} URL страницы товара
	 */
	getProductUrl( product ) {
		// Приоритет 1: если у товара есть поле url - используем его
		if ( product.url ) {
			return product.url;
		}

		// Приоритет 2: страница категории с якорем на товар
		const categoryUrl = store.getCategoryUrl( product.category );

		// Добавляем якорь с ID товара для прокрутки к нужной карточке
		return `${categoryUrl}?product=${product.id}#product-${product.id}`;
	}

	/**
	 * Обработчик клика по карточке товара
	 * @param {HTMLElement} card - карточка товара
	 * @param {Object} product - объект товара
	 */
	handleProductClick( card, product ) {
		const productUrl = this.getProductUrl( product );
		window.location.href = productUrl;
	}

	/**
	 * Прокручивает страницу к товару (если перешли с якорем)
	 */
	static scrollToProductOnLoad() {
		const urlParams = new URLSearchParams( window.location.search );
		const productId = urlParams.get( 'product' );

		if ( productId ) {
			setTimeout( () => {
				const productElement = document.querySelector( `.product-card[data-id="${productId}"]` );
				if ( productElement ) {
					productElement.scrollIntoView( { behavior: 'smooth', block: 'center' } );
					productElement.style.transition = 'all 0.3s ease';
					productElement.style.boxShadow = '0 0 0 3px #ff3366';
					setTimeout( () => {
						productElement.style.boxShadow = '';
					}, 2000 );
				}
			}, 500 );
		}
	}

	// =========================================================================
	// УПРАВЛЕНИЕ КНОПКАМИ (ДЛЯ ВСЕХ КАРТОЧЕК)
	// =========================================================================

	/**
	 * Прикрепляет обработчики ко всем существующим карточкам
	 */
	attachEventsToCards() {
		// Используем делегирование через document
		if ( this._delegateHandler ) {
			document.removeEventListener( 'click', this._delegateHandler );
		}

		this._delegateHandler = ( e ) => {
			// Кнопка "В корзину"
			const cartBtn = e.target.closest( '.add-to-cart, .product-btn.add-to-cart' );
			if ( cartBtn ) {
				e.preventDefault();
				e.stopPropagation();
				this.handleAddToCart( cartBtn );
				return;
			}

			// Кнопка "Избранное"
			const favBtn = e.target.closest( '.favorite-btn' );
			if ( favBtn ) {
				e.preventDefault();
				e.stopPropagation();
				this.handleToggleFavorite( favBtn );
				return;
			}

			// Ссылка на карточку (если клик не по кнопке)
			const cardLink = e.target.closest( '.product-card-link' );
			if ( cardLink && !e.target.closest( '.product-actions' ) ) {
				// Не предотвращаем переход, ссылка сработает сама
				// Просто логируем для отладки
				console.log( '📚 CatalogPage: переход по ссылке товара' );
			}
		};

		document.addEventListener( 'click', this._delegateHandler );

		const totalCards = document.querySelectorAll( '.product-card' ).length;
		console.log( `📚 CatalogPage: обработчики прикреплены к ${totalCards} карточкам` );
	}

	/**
	 * Наблюдает за появлением новых карточек (например, после обновления аккордеона)
	 */
	observeNewCards() {
		const observer = new MutationObserver( ( mutations ) => {
			let hasNewCards = false;
			mutations.forEach( mutation => {
				if ( mutation.type === 'childList' && mutation.addedNodes.length > 0 ) {
					mutation.addedNodes.forEach( node => {
						if ( node.nodeType === 1 && ( node.classList?.contains( 'product-card' ) || node.querySelector?.( '.product-card' ) ) ) {
							hasNewCards = true;
						}
					} );
				}
			} );
			if ( hasNewCards ) {
				console.log( '📚 CatalogPage: обнаружены новые карточки' );
				setTimeout( () => {
					this.updateAllCartButtons();
					this.updateAllFavoriteButtons();
				}, 50 );
			}
		} );

		observer.observe( document.body, { childList: true, subtree: true } );
	}

	/**
	 * Обновляет ВСЕ кнопки "В корзину" на странице
	 */
	updateAllCartButtons() {
		document.querySelectorAll( '.add-to-cart, .product-btn.add-to-cart' ).forEach( btn => {
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
	 * Обновляет ВСЕ кнопки "Избранное" на странице
	 */
	updateAllFavoriteButtons() {
		document.querySelectorAll( '.favorite-btn' ).forEach( btn => {
			const productId = btn.dataset.id;
			const isFavorite = store.isFavorite( productId );
			if ( isFavorite ) {
				btn.classList.add( 'active' );
			} else {
				btn.classList.remove( 'active' );
			}
		} );
	}

	/**
	 * Обновляет состояние одной кнопки "В корзину"
	 * @param {HTMLElement} btn - кнопка
	 * @param {string} productId - ID товара
	 */
	updateSingleCartButton( btn, productId ) {
		const product = store.getProduct( productId );
		if ( !product ) return;

		const inCart = store.cart.find( item => item.id == productId );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		btn.disabled = !( product.status === 'in-stock' && availableQuantity > 0 );
	}

	/**
	 * Обновляет состояние одной кнопки "Избранное"
	 * @param {HTMLElement} btn - кнопка
	 * @param {string} productId - ID товара
	 */
	updateSingleFavoriteButton( btn, productId ) {
		const isFavorite = store.isFavorite( productId );
		if ( isFavorite ) {
			btn.classList.add( 'active' );
		} else {
			btn.classList.remove( 'active' );
		}
	}

	/**
	 * Обработчик добавления товара в корзину
	 * @param {HTMLElement} btn - кнопка
	 */
	handleAddToCart( btn ) {
		const productId = btn.dataset.id;

		if ( store.addToCart( productId ) ) {
			API.showNotification( '✅ Товар добавлен в корзину' );

			const originalHTML = btn.innerHTML;
			btn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
			btn.style.background = '#2ecc71';

			this.updateSingleCartButton( btn, productId );

			setTimeout( () => {
				btn.innerHTML = originalHTML;
				btn.style.background = '';
				this.updateSingleCartButton( btn, productId );
			}, 2000 );

			API.updateHeaderCounters();
		} else {
			API.showNotification( '❌ Не удалось добавить товар', 'error' );
		}
	}

	/**
	 * Обработчик добавления/удаления из избранного
	 * @param {HTMLElement} btn - кнопка
	 */
	handleToggleFavorite( btn ) {
		const productId = btn.dataset.id;
		const isFavorite = store.toggleFavorite( productId );

		if ( isFavorite ) {
			btn.classList.add( 'active' );
			API.showNotification( '❤️ Товар добавлен в избранное' );
		} else {
			btn.classList.remove( 'active' );
			API.showNotification( '💔 Товар удален из избранного' );
		}

		API.updateHeaderCounters();
	}

	// =========================================================================
	// РАЗВОРАЧИВАНИЕ КАТАЛОГА
	// =========================================================================

	/**
	 * Настраивает разворачивание/сворачивание категорий
	 */
	setupExpandableCatalog() {
		const showAllBtn = document.querySelector( '.show-all-btn' );
		const catalogGrid = document.querySelector( '.catalog-grid' );
		const hiddenCategories = document.querySelectorAll( '.hidden-category' );

		if ( !showAllBtn || !catalogGrid ) return;

		let isExpanded = false;

		// Скрываем дополнительные категории
		hiddenCategories.forEach( item => {
			item.style.opacity = '0';
			item.style.transform = 'translateY(20px)';
			item.style.transition = 'all 0.5s ease';
			item.style.display = 'none';
		} );

		showAllBtn.addEventListener( 'click', ( e ) => {
			e.preventDefault();

			if ( isExpanded ) {
				// Сворачиваем
				hiddenCategories.forEach( item => {
					item.style.opacity = '0';
					item.style.transform = 'translateY(20px)';
					setTimeout( () => {
						item.style.display = 'none';
					}, 500 );
				} );

				setTimeout( () => {
					catalogGrid.classList.remove( 'expanded' );
				}, 500 );

				showAllBtn.classList.remove( 'expanded' );
				this.updateButtonText( showAllBtn, 'Показать все товары', 'fas fa-arrow-right' );
			} else {
				// Разворачиваем
				catalogGrid.classList.add( 'expanded' );
				showAllBtn.classList.add( 'expanded' );

				hiddenCategories.forEach( ( item, index ) => {
					setTimeout( () => {
						item.style.display = 'block';
						setTimeout( () => {
							item.style.opacity = '1';
							item.style.transform = 'translateY(0)';
						}, 50 );
					}, index * 100 );
				} );

				this.updateButtonText( showAllBtn, 'Скрыть товары', 'fas fa-arrow-up' );
			}

			isExpanded = !isExpanded;
		} );
	}

	/**
	 * Обновляет текст и иконку кнопки
	 * @param {HTMLElement} btn - кнопка
	 * @param {string} text - новый текст
	 * @param {string} iconClass - класс иконки
	 */
	updateButtonText( btn, text, iconClass ) {
		const span = btn.querySelector( 'span' );
		const icon = btn.querySelector( 'i' );
		if ( span ) span.textContent = text;
		if ( icon ) icon.className = iconClass;
	}

	// =========================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// =========================================================================

	/**
	 * Экранирует HTML для безопасности
	 * @param {string} str - исходная строка
	 * @returns {string} экранированная строка
	 */
	escapeHtml( str ) {
		if ( !str ) return '';
		return str
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' );
	}
}

// =========================================================================
// ИНИЦИАЛИЗАЦИЯ
// =========================================================================

document.addEventListener( 'DOMContentLoaded', () => {
	// Всегда инициализируем catalog.js (он нужен для работы кнопок)
	window.catalogPage = new CatalogPage();

	// Добавляем функцию прокрутки к товару после загрузки страницы
	CatalogPage.scrollToProductOnLoad();

	console.log( '✅ CatalogPage инициализирован' );
} );