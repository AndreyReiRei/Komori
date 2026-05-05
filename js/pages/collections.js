/**
 * ============================================================================
 * СТРАНИЦА КОЛЛЕКЦИЙ (collections.html)
 * ============================================================================
 * 
 * ОСНОВНЫЕ ФУНКЦИИ:
 * 1. Отображает все товары, у которых указана КОЛЛЕКЦИЯ (поле col)
 * 2. Группирует товары по коллекциям
 * 3. Позволяет сворачивать/разворачивать коллекции
 * 4. Добавление товаров в корзину
 * 5. Добавление/удаление товаров из избранного
 * 6. Автоматическое обновление при изменении данных в store
 * 
 * ============================================================================
 */

class CollectionsPage {
	constructor() {
		// Список коллекций с товарами
		this.collectionsWithItems = [];

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
		console.log( '📦 Инициализация страницы коллекций...' );

		// Рендерим коллекции с товарами
		this.renderCollections();

		// Слушаем обновление товаров (добавление/редактирование в админке)
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '🔄 Товары обновлены, перезагружаем коллекции...' );
			this.renderCollections();
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
	 * Получает все товары, у которых есть коллекция, сгруппированные по коллекциям
	 * @returns {Array} Массив объектов коллекций с товарами
	 */
	getItemsByCollection() {
		// Получаем все товары из глобального хранилища store
		const allProducts = store.products;

		// Фильтруем товары, у которых есть коллекция (поле col не пустое)
		// Исключаем товары, у которых коллекция не указана или равна 'Нет'
		const productsWithCollection = allProducts.filter( product => {
			const hasCollection = product.col &&
				product.col.trim() !== '' &&
				product.col !== 'Нет';
			return hasCollection;
		} );

		console.log( '📦 Всего товаров:', allProducts.length );
		console.log( '📦 Товаров с коллекцией:', productsWithCollection.length );

		// Группируем товары по КОЛЛЕКЦИЯМ (поле col)
		const groupedByCollection = {};

		productsWithCollection.forEach( product => {
			const collectionName = product.col.trim();

			if ( !groupedByCollection[collectionName] ) {
				groupedByCollection[collectionName] = [];
			}
			groupedByCollection[collectionName].push( product );
		} );

		// Преобразуем объект в массив для удобного рендеринга
		const result = Object.keys( groupedByCollection ).map( collectionKey => ( {
			key: collectionKey,                              // Название коллекции
			name: collectionKey,                              // Отображаемое имя коллекции
			products: groupedByCollection[collectionKey]      // Массив товаров в коллекции
		} ) );

		// Сортируем коллекции по алфавиту для удобства
		result.sort( ( a, b ) => a.name.localeCompare( b.name ) );

		console.log( '📦 Найдено коллекций:', result.length );
		return result;
	}

	/**
	 * Возвращает список уникальных категорий для фильтрации
	 * @returns {Array} Массив уникальных категорий
	 */
	getUniqueCategories() {
		const allProducts = store.products;
		const categories = new Set();

		allProducts.forEach( product => {
			if ( product.category ) {
				categories.add( product.category );
			}
		} );

		return Array.from( categories ).sort();
	}

	/**
	 * Получает иконку Font Awesome для коллекции
	 * @param {string} collectionName - название коллекции
	 * @returns {string} - класс иконки
	 */
	getCollectionIcon( collectionName ) {
		// Можно добавить соответствие названий коллекций и иконок
		const icons = {
			'NARUTO': 'fa-user-ninja',
			'TEA COLLECTION': 'fa-mug-hot',
			'SWEETS': 'fa-cookie-bite',
			'MANGA': 'fa-book',
			'CLOTHING': 'fa-tshirt',
			'TABLEWARE': 'fa-utensils',
			'GAMES': 'fa-gamepad',
			'STATIONERY': 'fa-palette',
			'COSMETICS': 'fa-spray-can',
			'DECOR': 'fa-home',
			'ANIME': 'fa-film',
			'MUSIC': 'fa-music'
		};

		// Поиск иконки без учета регистра
		const upperName = collectionName.toUpperCase();
		for ( const [key, icon] of Object.entries( icons ) ) {
			if ( upperName.includes( key ) ) {
				return icon;
			}
		}

		// Если иконка не найдена, возвращаем стандартную
		return 'fa-tag';
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
	 * Рендерит все коллекции с товарами
	 * Это главный метод отрисовки страницы
	 */
	renderCollections() {
		const container = document.getElementById( 'categoriesContainer' );
		const emptyState = document.getElementById( 'emptyCollections' );

		if ( !container ) return;

		// Получаем коллекции с товарами
		const collections = this.getItemsByCollection();
		this.collectionsWithItems = collections;

		// Если нет коллекций - показываем пустое состояние
		if ( collections.length === 0 ) {
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

		// Рендерим каждую коллекцию
		collections.forEach( collection => {
			const collectionHTML = this.renderCollectionSection( collection );
			container.insertAdjacentHTML( 'beforeend', collectionHTML );
		} );

		// Прикрепляем обработчики событий
		this.attachCollectionEvents();   // Сворачивание/разворачивание коллекций
		this.attachProductEvents();       // Кнопки "В корзину" и "Избранное"
	}

	/**
	 * Рендерит секцию коллекции (заголовок + сетка товаров)
	 * @param {Object} collection - объект коллекции {key, name, products}
	 * @returns {string} - HTML-код секции
	 */
	renderCollectionSection( collection ) {
		const productsCount = collection.products.length;

		return `
            <div class="category-section" data-collection="${this.escapeHtml( collection.key )}" id="collection-${this.safeId( collection.key )}">
                <!-- Заголовок коллекции (кликабельный для сворачивания) -->
                <div class="category-header">
                    <div class="category-title-wrapper">
                        <div class="category-icon">
                            <i class="fas ${this.getCollectionIcon( collection.name )}"></i>
                        </div>
                        <h2 class="category-name">${this.escapeHtml( collection.name )}</h2>
                        <span class="category-count">${productsCount}</span>
                    </div>
                    <div class="category-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <!-- Контейнер с товарами коллекции -->
                <div class="category-products">
                    <div class="products-grid-category">
                        ${collection.products.map( product => this.renderProductCard( product ) ).join( '' )}
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

		// Определяем статус наличия
		const stockClass = product.quantity > 0 && product.status === 'in-stock' ? 'in-stock' : 'out-of-stock';
		const stockText = product.quantity > 0 && product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии';
		const stockIcon = product.quantity > 0 && product.status === 'in-stock' ? 'fa-check-circle' : 'fa-times-circle';

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
                    <div class="product-stock ${stockClass}">
                        <i class="fas ${stockIcon}"></i>
                        <span>${stockText}</span>
                        ${product.quantity > 0 ? `<span class="product-quantity">${availableQuantity} шт.</span>` : ''}
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
	 * Прикрепляет обработчики для сворачивания/разворачивания коллекций
	 */
	attachCollectionEvents() {
		document.querySelectorAll( '.category-header' ).forEach( header => {
			// Удаляем старый обработчик, чтобы не было дублирования
			header.removeEventListener( 'click', this.handleCollectionToggle );

			// Создаем новый обработчик
			this.handleCollectionToggle = () => {
				const section = header.closest( '.category-section' );
				if ( section ) {
					// Переключаем класс collapsed (свернуто/развернуто)
					section.classList.toggle( 'collapsed' );
				}
			};

			header.addEventListener( 'click', this.handleCollectionToggle );
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

	// =========================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// =========================================================================

	/**
	 * Экранирует HTML-символы для безопасного вывода
	 * @param {string} str - строка для экранирования
	 * @returns {string} - экранированная строка
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

	/**
	 * Преобразует строку в безопасный ID для HTML
	 * @param {string} str - исходная строка
	 * @returns {string} - безопасный ID
	 */
	safeId( str ) {
		if ( !str ) return 'empty';
		return str
			.toLowerCase()
			.replace( /[^a-z0-9]/g, '-' )
			.replace( /-+/g, '-' )
			.replace( /^-|-$/g, '' );
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