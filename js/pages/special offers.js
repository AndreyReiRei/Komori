/**
 * ============================================================================
 * СТРАНИЦА НОВИНОК
 * ============================================================================
 * 
 * Отображает все товары с пометкой "Новинка" (isNew = true),
 * сгруппированные по категориям.
 * 
 * ============================================================================
 */

class NewArrivalsPage {
	constructor() {
		// Список категорий для отображения (только те, где есть новинки)
		this.categoriesWithNewItems = [];

		// Инициализация
		this.init();
	}

	init() {
		console.log( '🎯 Инициализация страницы новинок...' );

		// Рендерим категории с новинками
		this.renderCategories();

		// Слушаем обновление товаров
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '🔄 Товары обновлены, перезагружаем новинки...' );
			this.renderCategories();
		} );

		// Слушаем обновление корзины (чтобы обновить кнопки "В корзину")
		window.addEventListener( 'store:cartUpdated', () => {
			this.updateCartButtons();
		} );
	}

	/**
	 * Получает все товары с пометкой "Новинка", сгруппированные по категориям
	 * @returns {Object} Объект с категориями и товарами
	 */
	getNewArrivalsByCategory() {
		const allProducts = store.products;

		// Фильтруем только новинки (isNew = true) и только в наличии
		const newProducts = allProducts.filter( product =>
			product.isNew === true &&
			product.status === 'in-stock' &&
			product.quantity > 0
		);

		console.log( '📦 Найдено новинок:', newProducts.length );

		// Группируем по категориям
		const groupedByCategory = {};

		newProducts.forEach( product => {
			const category = product.category;
			if ( !groupedByCategory[category] ) {
				groupedByCategory[category] = [];
			}
			groupedByCategory[category].push( product );
		} );

		// Преобразуем в массив для удобства рендеринга
		const result = Object.keys( groupedByCategory ).map( categoryKey => ( {
			key: categoryKey,
			name: store.getCategoryName( categoryKey ),
			products: groupedByCategory[categoryKey]
		} ) );

		// Сортируем категории по названию
		result.sort( ( a, b ) => a.name.localeCompare( b.name ) );

		return result;
	}

	/**
	 * Рендерит все категории с новинками
	 */
	renderCategories() {
		const container = document.getElementById( 'categoriesContainer' );
		const emptyState = document.getElementById( 'emptyNewArrivals' );

		if ( !container ) return;

		// Получаем категории с новинками
		const categories = this.getNewArrivalsByCategory();
		this.categoriesWithNewItems = categories;

		// Если нет новинок - показываем пустое состояние
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
		this.attachCategoryEvents();
		this.attachProductEvents();
	}

	/**
	 * Рендерит секцию категории
	 * @param {Object} category - объект категории {key, name, products}
	 * @returns {string} HTML-код секции
	 */
	renderCategorySection( category ) {
		const productsCount = category.products.length;

		return `
            <div class="category-section" data-category="${category.key}" id="category-${category.key}">
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
                <div class="category-products">
                    <div class="products-grid-category">
                        ${category.products.map( product => this.renderProductCard( product ) ).join( '' )}
                    </div>
                </div>
            </div>
        `;
	}

	/**
	 * Получает иконку для категории
	 * @param {string} categoryKey - ключ категории
	 * @returns {string} класс иконки Font Awesome
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
	 * Рендерит карточку товара
	 * @param {Object} product - объект товара
	 * @returns {string} HTML-код карточки
	 */
	renderProductCard( product ) {
		const inCart = store.cart.find( item => item.id == product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		// Получаем ссылку на страницу категории
		const categoryUrl = `/pages html/catalog pages/${this.getCategoryUrl( product.category )}`;

		return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <a href="${categoryUrl}">
                        <img src="${API.getSafeImageUrl( product.image )}" 
                             alt="${product.name}"
                             loading="lazy"
                             onerror="this.src='${API.getFallbackSvg( product.name )}'">
                    </a>
                    <div class="product-badges">
                        ${product.isNew ? '<span class="badge new">Новинка</span>' : ''}
                        ${product.isHit ? '<span class="badge hit">Хит</span>' : ''}
                        ${product.oldPrice ? '<span class="badge sale">Скидка</span>' : ''}
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-category">
                        <a href="${categoryUrl}">${store.getCategoryName( product.category )}</a>
                    </div>
                    <h3 class="product-title">
                        <a href="${categoryUrl}">${product.name}</a>
                    </h3>
                    <div class="product-price">
                        <span class="current-price">${API.formatPrice( product.price )}</span>
                        ${product.oldPrice ? `<span class="old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas ${product.quantity > 0 ? 'fa-check-circle in-stock' : 'fa-times-circle out-of-stock'}"></i>
                        <span class="${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                            ${product.quantity > 0 ? 'В наличии' : 'Нет в наличии'}
                        </span>
                    </div>
                    <button class="add-to-cart-btn" data-id="${product.id}"
                            ${product.quantity <= 0 || availableQuantity <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </button>
                </div>
            </div>
        `;
	}

	/**
	 * Получает URL страницы категории
	 * @param {string} categoryKey - ключ категории
	 * @returns {string} имя файла
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

	/**
	 * Прикрепляет обработчики для сворачивания/разворачивания категорий
	 */
	attachCategoryEvents() {
		document.querySelectorAll( '.category-header' ).forEach( header => {
			header.removeEventListener( 'click', this.handleCategoryToggle );
			this.handleCategoryToggle = () => {
				const section = header.closest( '.category-section' );
				if ( section ) {
					section.classList.toggle( 'collapsed' );
				}
			};
			header.addEventListener( 'click', this.handleCategoryToggle );
		} );
	}

	/**
	 * Прикрепляет обработчики к кнопкам "В корзину"
	 */
	attachProductEvents() {
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddToCart );
			this.handleAddToCart = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
						e.currentTarget.style.background = '';
						// Обновляем счетчики в шапке
						this.updateHeaderCounters();
					}, 2000 );
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleAddToCart );
		} );
	}

	/**
	 * Обновляет состояние кнопок "В корзину" после изменения корзины
	 */
	updateCartButtons() {
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			const productId = btn.dataset.id;
			const product = store.getProduct( productId );
			const inCart = store.cart.find( item => item.id == productId );
			const inCartQuantity = inCart ? inCart.quantity : 0;
			const availableQuantity = product ? product.quantity - inCartQuantity : 0;

			if ( !product || product.quantity <= 0 || availableQuantity <= 0 ) {
				btn.disabled = true;
			} else {
				btn.disabled = false;
			}
		} );

		this.updateHeaderCounters();
	}

	/**
	 * Обновляет счетчики в шапке сайта
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

// Инициализация при загрузке страницы
document.addEventListener( 'DOMContentLoaded', () => {
	window.newArrivalsPage = new NewArrivalsPage();
	console.log( '✅ Страница новинок инициализирована' );
} );