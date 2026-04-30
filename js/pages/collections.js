/**
 * ============================================================================
 * СТРАНИЦА КОЛЛЕКЦИЙ (collections.html)
 * ============================================================================
 * 
 * ОСНОВНЫЕ ФУНКЦИИ:
 * 1. Отображает все товары с пометкой "Хит продаж" (isHit = true)
 * 2. Группирует товары по категориям
 * 3. Позволяет сворачивать/разворачивать категории
 * 4. Добавление товаров в корзину
 * 5. Добавление/удаление товаров из избранного
 * 6. Автоматическое обновление при изменении данных в store
 * 
 * ============================================================================
 */

class CollectionsPage {
	constructor() {
		// Список категорий, в которых есть товары-хиты
		this.categoriesWithHitItems = [];

		// Инициализация страницы
		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Главный метод инициализации страницы
	 * Вызывается при создании экземпляра класса
	 */
	init() {
		console.log( '🔥 Инициализация страницы коллекций...' );

		// Рендерим категории с хитами
		this.renderCategories();

		// Слушаем обновление товаров (добавление/редактирование в админке)
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '🔄 Товары обновлены, перезагружаем коллекции...' );
			this.renderCategories();
		} );

		// Слушаем обновление корзины (чтобы обновить кнопки "В корзину")
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( '🔄 Корзина обновлена, обновляем кнопки...' );
			this.updateCartButtons();
			this.updateHeaderCounters();
		} );

		// Слушаем обновление избранного (чтобы обновить кнопки "Избранное")
		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( '🔄 Избранное обновлено, обновляем кнопки...' );
			this.updateFavoriteButtons();
			this.updateHeaderCounters();
		} );
	}

	// =========================================================================
	// ПОЛУЧЕНИЕ ДАННЫХ
	// =========================================================================

	/**
	 * Получает все товары с пометкой "Хит продаж", сгруппированные по категориям
	 * @returns {Array} Массив объектов категорий с товарами
	 */
	getHitItemsByCategory() {
		// Получаем все товары из глобального хранилища store
		const allProducts = store.products;

		// Фильтруем только хиты (isHit = true) и только те, что есть в наличии
		const hitProducts = allProducts.filter( product =>
			product.isHit === true &&
			product.status === 'in-stock' &&
			product.quantity > 0
		);

		console.log( '📦 Найдено хитов:', hitProducts.length );

		// Группируем товары по категориям
		// Результат: { categoryKey: [product1, product2, ...] }
		const groupedByCategory = {};

		hitProducts.forEach( product => {
			const category = product.category;
			if ( !groupedByCategory[category] ) {
				groupedByCategory[category] = [];
			}
			groupedByCategory[category].push( product );
		} );

		// Преобразуем объект в массив для удобного рендеринга
		const result = Object.keys( groupedByCategory ).map( categoryKey => ( {
			key: categoryKey,                        // Ключ категории (figures, tea и т.д.)
			name: store.getCategoryName( categoryKey ), // Отображаемое имя категории
			products: groupedByCategory[categoryKey]  // Массив товаров в категории
		} ) );

		// Сортируем категории по алфавиту для удобства
		result.sort( ( a, b ) => a.name.localeCompare( b.name ) );

		return result;
	}

	/**
	 * Получает иконку Font Awesome для категории
	 * @param {string} categoryKey - ключ категории
	 * @returns {string} - класс иконки
	 */
	getCategoryIcon( categoryKey ) {
		const icons = {
			'figures': 'fa-user-ninja',
			'tea': 'fa-mug-hot',
			'sweets': 'fa-cookie-bite',
			'manga': 'fa-book',
			'clothing': 'fa-tshirt',
			'tableware': 'fa-utensils',
			'games': 'fa-gamepad',
			'stationery': 'fa-palette',
			'cosmetics': 'fa-spray-can',
			'decor': 'fa-home',
			'anime': 'fa-film',
			'music': 'fa-music',
			'other': 'fa-box'
		};
		return icons[categoryKey] || 'fa-tag';
	}

	/**
	 * Получает URL страницы категории для перехода
	 * @param {string} categoryKey - ключ категории
	 * @returns {string} - имя HTML файла
	 */
	getCategoryUrl( categoryKey ) {
		const urls = {
			'figures': 'figurines.html',
			'tea': 'tea.html',
			'sweets': 'sweets.html',
			'manga': 'manga.html',
			'clothing': 'clothes.html',
			'tableware': 'dishes.html',
			'games': 'games.html',
			'stationery': 'office.html',
			'cosmetics': 'cosmetics.html',
			'decor': 'decor.html',
			'anime': 'disks.html',
			'music': 'music.html',
			'other': 'catalog.html'
		};
		return urls[categoryKey] || 'catalog.html';
	}

	// =========================================================================
	// ОТРИСОВКА СТРАНИЦЫ
	// =========================================================================

	/**
	 * Рендерит все категории с хитами
	 * Это главный метод отрисовки страницы
	 */
	renderCategories() {
		const container = document.getElementById( 'categoriesContainer' );
		const emptyState = document.getElementById( 'emptyCollections' );

		if ( !container ) return;

		// Получаем категории с хитами
		const categories = this.getHitItemsByCategory();
		this.categoriesWithHitItems = categories;

		// Если нет хитов - показываем пустое состояние
		if ( categories.length === 0 ) {
			if ( container ) container.style.display = 'none';
			if ( emptyState ) emptyState.style.display = 'block';
			return;
		}

		// Показываем контейнер и скрываем пустое состояние
		if ( container ) {
			container.style.display = 'block';
			container.innerHTML = '';
		}
		if ( emptyState ) emptyState.style.display = 'none';

		// Рендерим каждую категорию
		categories.forEach( category => {
			const categoryHTML = this.renderCategorySection( category );
			container.insertAdjacentHTML( 'beforeend', categoryHTML );
		} );

		// Прикрепляем обработчики событий
		this.attachCategoryEvents();   // Сворачивание/разворачивание категорий
		this.attachProductEvents();    // Кнопки "В корзину" и "Избранное"
	}

	/**
	 * Рендерит секцию категории (заголовок + сетка товаров)
	 * @param {Object} category - объект категории {key, name, products}
	 * @returns {string} - HTML-код секции
	 */
	renderCategorySection( category ) {
		const productsCount = category.products.length;

		return `
            <div class="category-section" data-category="${category.key}" id="category-${category.key}">
                <!-- Заголовок категории (кликабельный для сворачивания) -->
                <div class="category-header">
                    <div class="category-title-wrapper">
                        <div class="category-icon">
                            <i class="fas ${this.getCategoryIcon( category.key )}"></i>
                        </div>
                        <h2 class="category-name">${category.name}</h2>
                        <span class="category-count">${productsCount}</span>
                    </div>
                    <div class="category-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <!-- Контейнер с товарами категории -->
                <div class="category-products">
                    <div class="products-grid-category">
                        ${category.products.map( product => this.renderProductCard( product ) ).join( '' )}
                    </div>
                </div>
            </div>
        `;
	}

	/**
	 * Рендерит карточку товара
	 * @param {Object} product - объект товара из store
	 * @returns {string} - HTML-код карточки
	 */
	renderProductCard( product ) {
		// Проверяем, есть ли товар в корзине
		const inCart = store.cart.find( item => item.id == product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		// Проверяем, есть ли товар в избранном
		const isFavorite = store.isFavorite( product.id );

		// Получаем ссылку на страницу категории
		const categoryUrl = `/pages html/catalog pages/${this.getCategoryUrl( product.category )}`;

		return `
            <div class="product-card" data-id="${product.id}">
                <!-- Блок с изображением -->
                <div class="product-image">
                    <a href="${categoryUrl}">
                        <img src="${API.getSafeImageUrl( product.image )}" 
                             alt="${product.name}"
                             loading="lazy"
                             onerror="this.src='${API.getFallbackSvg( product.name )}'">
                    </a>
                    <!-- Бейджи товара -->
                    <div class="product-badges">
                        ${product.isNew ? '<span class="badge new">Новинка</span>' : ''}
                        ${product.isHit ? '<span class="badge hit">Хит</span>' : ''}
                        ${product.oldPrice ? '<span class="badge sale">Скидка</span>' : ''}
                    </div>
                </div>
                
                <!-- Информация о товаре -->
                <div class="product-info">
                    <div class="product-category">
                        <a href="${categoryUrl}">${store.getCategoryName( product.category )}</a>
                    </div>
                    <h3 class="product-title">
                        <a href="${categoryUrl}">${product.name}</a>
                    </h3>
                    
                    <!-- Цены -->
                    <div class="product-price">
                        <span class="current-price">${API.formatPrice( product.price )}</span>
                        ${product.oldPrice ? `<span class="old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
                    </div>
                    
                    <!-- Статус наличия -->
                    <div class="product-stock">
                        <i class="fas ${product.quantity > 0 ? 'fa-check-circle in-stock' : 'fa-times-circle out-of-stock'}"></i>
                        <span class="${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                            ${product.quantity > 0 ? 'В наличии' : 'Нет в наличии'}
                        </span>
                    </div>
                    
                    <!-- Кнопки действий -->
                    <div class="product-actions">
                        <button class="add-to-cart-btn" data-id="${product.id}"
                                ${product.quantity <= 0 || availableQuantity <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> В корзину
                        </button>
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${product.id}" 
                                title="${isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
	}

	// =========================================================================
	// ОБРАБОТЧИКИ СОБЫТИЙ
	// =========================================================================

	/**
	 * Прикрепляет обработчики для сворачивания/разворачивания категорий
	 */
	attachCategoryEvents() {
		document.querySelectorAll( '.category-header' ).forEach( header => {
			// Удаляем старый обработчик, чтобы не было дублирования
			header.removeEventListener( 'click', this.handleCategoryToggle );

			// Создаем новый обработчик
			this.handleCategoryToggle = () => {
				const section = header.closest( '.category-section' );
				if ( section ) {
					// Переключаем класс collapsed (свернуто/развернуто)
					section.classList.toggle( 'collapsed' );
				}
			};

			header.addEventListener( 'click', this.handleCategoryToggle );
		} );
	}

	/**
	 * Прикрепляет обработчики к кнопкам "В корзину" и "Избранное"
	 */
	attachProductEvents() {
		// ===== КНОПКИ "В КОРЗИНУ" =====
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddToCart );

			this.handleAddToCart = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;

				// Вызываем метод store для добавления товара в корзину
				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект: меняем текст и цвет кнопки
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
						e.currentTarget.style.background = '';
					}, 2000 );

					// Обновляем счетчики в шапке
					this.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
			};

			btn.addEventListener( 'click', this.handleAddToCart );
		} );

		// ===== КНОПКИ "ИЗБРАННОЕ" =====
		document.querySelectorAll( '.favorite-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleToggleFavorite );

			this.handleToggleFavorite = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;

				// Вызываем метод store для добавления/удаления из избранного
				const isNowFavorite = store.toggleFavorite( id );

				// Обновляем внешний вид кнопки
				if ( isNowFavorite ) {
					btn.classList.add( 'active' );
					btn.title = 'Удалить из избранного';
					API.showNotification( '❤️ Товар добавлен в избранное' );
				} else {
					btn.classList.remove( 'active' );
					btn.title = 'Добавить в избранное';
					API.showNotification( '💔 Товар удален из избранного' );
				}

				// Обновляем счетчики в шапке
				this.updateHeaderCounters();
			};

			btn.addEventListener( 'click', this.handleToggleFavorite );
		} );
	}

	// =========================================================================
	// ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПОК
	// =========================================================================

	/**
	 * Обновляет состояние кнопок "В корзину" после изменения корзины
	 * Вызывается при событии store:cartUpdated
	 */
	updateCartButtons() {
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			const productId = btn.dataset.id;
			const product = store.getProduct( productId );

			if ( !product ) return;

			const inCart = store.cart.find( item => item.id == productId );
			const inCartQuantity = inCart ? inCart.quantity : 0;
			const availableQuantity = product.quantity - inCartQuantity;

			// Если товара нет в наличии или количество закончилось - блокируем кнопку
			if ( product.quantity <= 0 || availableQuantity <= 0 ) {
				btn.disabled = true;
			} else {
				btn.disabled = false;
			}
		} );
	}

	/**
	 * Обновляет состояние кнопок "Избранное" после изменения избранного
	 * Вызывается при событии store:favoritesUpdated
	 */
	updateFavoriteButtons() {
		document.querySelectorAll( '.favorite-btn' ).forEach( btn => {
			const productId = btn.dataset.id;
			const isFavorite = store.isFavorite( productId );

			if ( isFavorite ) {
				btn.classList.add( 'active' );
				btn.title = 'Удалить из избранного';
			} else {
				btn.classList.remove( 'active' );
				btn.title = 'Добавить в избранное';
			}
		} );
	}

	/**
	 * Обновляет счетчики в шапке сайта (корзина и избранное)
	 */
	updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );

		if ( cartCount ) {
			cartCount.textContent = store.getCartCount();
		}
		if ( favoritesCount ) {
			favoritesCount.textContent = store.favorites.length;
		}
	}
}

// =========================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// =========================================================================

/**
 * Создаем экземпляр класса при загрузке DOM
 * Проверяем, что мы находимся на странице коллекций
 */
document.addEventListener( 'DOMContentLoaded', () => {
	// Проверяем, есть ли на странице контейнер для категорий
	if ( document.getElementById( 'categoriesContainer' ) ) {
		window.collectionsPage = new CollectionsPage();
		console.log( '✅ Страница коллекций инициализирована' );
	}
} );