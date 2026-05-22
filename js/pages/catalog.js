/**
 * ============================================================================
 * CATALOG.JS - КЛАСС ДЛЯ ОТОБРАЖЕНИЯ КАТАЛОГА ТОВАРОВ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Отображает товары в каталоге (главная страница, страницы категорий)
 * - Обеспечивает добавление товаров в корзину и избранное
 * - Поддерживает разворачивание/сворачивание категорий
 * 
 * ОПТИМИЗАЦИЯ:
 * - НЕ перерисовывает всю сетку при добавлении в корзину/избранное
 * - Обновляет только состояние кнопок и счетчики
 * - Перерисовывает только при изменении состава товаров
 * 
 * ============================================================================
 */

class CatalogPage {
	constructor() {
		/** @type {HTMLElement} Контейнер для товаров */
		this.productsGrid = document.querySelector( '.products-scroll, .catalog-grid .products-grid' );

		/** @type {string} Хэш состава товаров для отслеживания изменений */
		this.productsHash = null;

		/** @type {Array} Кэш товаров для оптимизации */
		this.cachedProducts = null;

		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Инициализирует страницу каталога
	 */
	init() {
		if ( !this.productsGrid ) return;

		// Первоначальный рендер товаров
		this.renderProducts();

		// Настройка разворачивания каталога (если есть)
		this.setupExpandableCatalog();

		// Слушаем обновление товаров (добавление/удаление в админке)
		// НО НЕ ПЕРЕРИСОВЫВАЕМ ПРИ КАЖДОМ ОБНОВЛЕНИИ КОРЗИНЫ/ИЗБРАННОГО!
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '📦 Каталог: товары обновлены, проверяем необходимость перерисовки' );
			this.checkAndRefreshIfNeeded();
		} );

		// Слушаем обновление корзины - обновляем ТОЛЬКО состояние кнопок
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( '🛒 Каталог: корзина обновлена, обновляем кнопки' );
			this.updateCartButtonsState();
			API.updateHeaderCounters();
		} );

		// Слушаем обновление избранного - обновляем ТОЛЬКО состояние кнопок
		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( '❤️ Каталог: избранное обновлено, обновляем кнопки' );
			this.updateFavoriteButtonsState();
			API.updateHeaderCounters();
		} );

		console.log( '✅ CatalogPage инициализирован' );
	}

	// =========================================================================
	// ОПТИМИЗАЦИЯ: ПРОВЕРКА НЕОБХОДИМОСТИ ПЕРЕРИСОВКИ
	// =========================================================================

	/**
	 * Вычисляет хэш состава товаров
	 * @param {Array} products - массив товаров
	 * @returns {string} хэш-строка для сравнения
	 */
	getProductsHash( products ) {
		const ids = products.map( p => p.id ).join( ',' );
		return `${products.length}_${ids}`;
	}

	/**
	 * Проверяет, нужно ли перерисовывать каталог
	 * Перерисовываем ТОЛЬКО если изменился состав товаров (добавлены/удалены)
	 */
	checkAndRefreshIfNeeded() {
		const currentProducts = store.getCatalogProducts( { showOnlyInStock: false } );
		const currentHash = this.getProductsHash( currentProducts );

		if ( this.productsHash !== currentHash ) {
			console.log( '🔄 Состав товаров изменился, перерисовываем каталог' );
			this.renderProducts();
		} else {
			console.log( '✅ Состав товаров не изменился, перерисовка не требуется' );
		}
	}

	// =========================================================================
	// ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПОК (БЕЗ ПЕРЕРИСОВКИ КАРТОЧЕК)
	// =========================================================================

	/**
	 * Обновляет состояние кнопок "В корзину" без перерисовки всей сетки
	 */
	updateCartButtonsState() {
		document.querySelectorAll( '.add-to-cart' ).forEach( btn => {
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
	 * Обновляет состояние кнопок "Избранное" без перерисовки всей сетки
	 */
	updateFavoriteButtonsState() {
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
	 * Обновляет состояние конкретной кнопки "В корзину"
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
	 * Обновляет состояние конкретной кнопки "Избранное"
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

	// =========================================================================
	// ОТОБРАЖЕНИЕ ТОВАРОВ
	// =========================================================================

	/**
	 * Рендерит товары в каталоге
	 */
	renderProducts() {
		const products = store.getCatalogProducts( {
			showOnlyInStock: false
		} );

		// Сохраняем хэш для отслеживания изменений
		this.productsHash = this.getProductsHash( products );
		this.cachedProducts = products;

		if ( products.length === 0 ) {
			this.showDemoProducts();
			return;
		}

		// Очищаем и заполняем сетку
		this.productsGrid.innerHTML = products.map( product => this.renderProductCard( product ) ).join( '' );

		// Прикрепляем обработчики событий (только один раз после рендера)
		this.attachProductEvents();
	}

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

		// Определяем бейджи
		let badges = '';
		if ( product.isHit ) badges += '<span class="product-badge hit">Хит продаж</span>';
		if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
		if ( product.oldPrice ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="product-badge sale">-${discount}%</span>`;
		}

		return `
			<div class="product-card" data-id="${product.id}">
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
			</div>
		`;
	}

	/**
	 * Прикрепляет обработчики событий к кнопкам
	 * Использует делегирование для оптимальной работы
	 */
	attachProductEvents() {
		// Удаляем старый обработчик, если есть
		if ( this.productsGrid._delegateHandler ) {
			this.productsGrid.removeEventListener( 'click', this.productsGrid._delegateHandler );
		}

		// Создаем новый обработчик через делегирование
		this.productsGrid._delegateHandler = ( e ) => {
			// Кнопка "В корзину"
			const cartBtn = e.target.closest( '.add-to-cart' );
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
		};

		this.productsGrid.addEventListener( 'click', this.productsGrid._delegateHandler );
	}

	/**
	 * Обработчик добавления товара в корзину (без перерисовки!)
	 * @param {HTMLElement} btn - кнопка
	 */
	handleAddToCart( btn ) {
		const productId = btn.dataset.id;

		if ( store.addToCart( productId ) ) {
			// Показываем уведомление
			API.showNotification( '✅ Товар добавлен в корзину' );

			// Визуальный эффект на кнопке (без перерисовки!)
			const originalHTML = btn.innerHTML;
			btn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
			btn.style.background = '#2ecc71';

			// Обновляем состояние кнопки (блокируем, если товар закончился)
			this.updateSingleCartButton( btn, productId );

			// Возвращаем исходный вид через 2 секунды
			setTimeout( () => {
				btn.innerHTML = originalHTML;
				btn.style.background = '';
				// Еще раз обновляем состояние (на случай, если товар закончился)
				this.updateSingleCartButton( btn, productId );
			}, 2000 );

			// Обновляем счетчики в шапке
			API.updateHeaderCounters();
		} else {
			API.showNotification( '❌ Не удалось добавить товар', 'error' );
		}
	}

	/**
	 * Обработчик добавления/удаления товара из избранного (без перерисовки!)
	 * @param {HTMLElement} btn - кнопка
	 */
	handleToggleFavorite( btn ) {
		const productId = btn.dataset.id;
		const isFavorite = store.toggleFavorite( productId );

		// Обновляем внешний вид кнопки (без перерисовки!)
		if ( isFavorite ) {
			btn.classList.add( 'active' );
			API.showNotification( '❤️ Товар добавлен в избранное' );
		} else {
			btn.classList.remove( 'active' );
			API.showNotification( '💔 Товар удален из избранного' );
		}

		// Обновляем счетчики в шапке
		API.updateHeaderCounters();
	}

	// =========================================================================
	// ДЕМО-ТОВАРЫ (ДЛЯ СЛУЧАЯ, КОГДА STORE ПУСТ)
	// =========================================================================

	/**
	 * Показывает демо-товары, если в store пусто
	 */
	showDemoProducts() {
		const demos = [
			{
				id: 'demo1',
				name: 'Аниме фигурка Наруто',
				price: 2499,
				oldPrice: 2999,
				description: 'Детализированная фигурка главного героя',
				image: 'https://via.placeholder.com/300x200',
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
				status: 'in-stock',
				quantity: 15
			}
		];

		this.productsGrid.innerHTML = demos.map( product => this.renderProductCard( product ) ).join( '' );
		this.attachProductEvents();
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
	if ( document.querySelector( '.products-scroll, .catalog-grid .products-grid' ) ) {
		window.catalogPage = new CatalogPage();
		console.log( '✅ CatalogPage инициализирован' );
	}
} );