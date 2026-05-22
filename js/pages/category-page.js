/**
 * ============================================================================
 * CATEGORY-PAGE.JS - КЛАСС ДЛЯ СТРАНИЦ КАТЕГОРИЙ ТОВАРОВ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Отображает товары конкретной категории (аниме фигурки, чай, сладости и т.д.)
 * - Обеспечивает сортировку и фильтрацию товаров
 * - Поддерживает пагинацию (постраничное отображение)
 * - Добавление товаров в корзину и избранное
 * 
 * ОПТИМИЗАЦИЯ:
 * - НЕ перерисовывает всю страницу при добавлении в корзину/избранное
 * - Обновляет только состояние кнопок и счетчики
 * - Использует интеллектуальную проверку реальных изменений товаров
 * 
 * ============================================================================
 */

class CategoryPage {
	/**
	 * Конструктор страницы категории
	 * @param {string} categoryKey - ключ категории (figures, tea, sweets и т.д.)
	 * @param {string} categoryName - отображаемое имя категории
	 */
	constructor( categoryKey, categoryName ) {
		/** @type {string} Ключ категории для фильтрации товаров */
		this.categoryKey = categoryKey;

		/** @type {string} Отображаемое имя категории */
		this.categoryName = categoryName;

		/** @type {number} Текущая страница пагинации */
		this.currentPage = 1;

		/** @type {number} Количество товаров на странице */
		this.itemsPerPage = 12;

		/** @type {Object} Текущие фильтры и сортировка */
		this.filters = {
			sortBy: 'default',  // 'default', 'price-asc', 'price-desc', 'name-asc', 'name-desc', 'newest'
			status: 'all'       // 'all', 'in-stock', 'out-of-stock'
		};

		/** @type {string} Хэш фильтров для отслеживания изменений */
		this.filtersHash = null;

		/** @type {string} Хэш товаров для отслеживания реальных изменений */
		this.productsHash = null;

		/** @type {number} Таймер для дебаунса перерисовки */
		this.renderDebounceTimer = null;

		/** @type {boolean} Флаг, указывающий, что перерисовка уже запланирована */
		this.isRenderScheduled = false;

		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Инициализирует страницу категории
	 */
	init() {
		// Вычисляем начальные хэши
		this.updateProductsHash();

		// Первоначальный рендер товаров
		this.renderProducts();

		// Привязываем обработчики событий
		this.bindEvents();

		// Слушаем обновление товаров с интеллектуальной проверкой
		window.addEventListener( 'store:productsUpdated', () => {
			this.handleProductsUpdated();
		} );

		// Слушаем обновление корзины - обновляем ТОЛЬКО состояние кнопок
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( `🛒 Категория "${this.categoryName}": корзина обновлена, обновляем кнопки` );
			this.updateCartButtonsState();
			API.updateHeaderCounters();
		} );

		// Слушаем обновление избранного - обновляем ТОЛЬКО состояние кнопок
		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( `❤️ Категория "${this.categoryName}": избранное обновлено, обновляем кнопки` );
			this.updateFavoriteButtonsState();
			API.updateHeaderCounters();
		} );

		console.log( `✅ Страница категории "${this.categoryName}" инициализирована` );
	}

	// =========================================================================
	// ИНТЕЛЛЕКТУАЛЬНАЯ ПРОВЕРКА ИЗМЕНЕНИЙ
	// =========================================================================

	/**
	 * Вычисляет хэш текущих фильтров
	 * @returns {string} хэш-строка для сравнения
	 */
	getFiltersHash() {
		return `${this.filters.sortBy}_${this.filters.status}_${this.currentPage}`;
	}

	/**
	 * Вычисляет хэш состава товаров в категории
	 * @returns {string} хэш-строка для сравнения
	 */
	computeProductsHash() {
		const products = store.products.filter( p => p.category === this.categoryKey );
		const ids = products.map( p => p.id ).join( ',' );
		const counts = products.map( p => `${p.id}:${p.quantity}` ).join( ',' );
		return `${products.length}_${ids}_${counts}`;
	}

	/**
	 * Обновляет сохраненный хэш товаров
	 */
	updateProductsHash() {
		this.productsHash = this.computeProductsHash();
	}

	/**
	 * Проверяет, изменился ли состав товаров
	 * @returns {boolean} true если изменился
	 */
	hasProductsChanged() {
		const currentHash = this.computeProductsHash();
		const hasChanged = currentHash !== this.productsHash;

		if ( hasChanged ) {
			console.log( `🔍 Категория "${this.categoryName}": состав товаров ИЗМЕНИЛСЯ` );
			this.productsHash = currentHash;
		}

		return hasChanged;
	}

	/**
	 * Обработчик события обновления товаров (с умной проверкой)
	 */
	handleProductsUpdated() {
		// Проверяем, действительно ли изменились товары в этой категории
		if ( this.hasProductsChanged() ) {
			console.log( `📦 Категория "${this.categoryName}": товары изменились, планируем перерисовку` );
			this.scheduleRender();
		} else {
			console.log( `📦 Категория "${this.categoryName}": товары НЕ изменились, перерисовка не требуется` );
		}
	}

	/**
	 * Планирует перерисовку с дебаунсом (предотвращает множественные перерисовки)
	 */
	scheduleRender() {
		// Очищаем предыдущий таймер
		if ( this.renderDebounceTimer ) {
			clearTimeout( this.renderDebounceTimer );
		}

		// Устанавливаем новый таймер
		this.renderDebounceTimer = setTimeout( () => {
			console.log( `🔄 Категория "${this.categoryName}": выполняем перерисовку` );
			this.renderProducts();
			this.isRenderScheduled = false;
			this.renderDebounceTimer = null;
		}, 150 );

		if ( !this.isRenderScheduled ) {
			this.isRenderScheduled = true;
			console.log( `⏳ Категория "${this.categoryName}": перерисовка запланирована` );
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
	// ОБРАБОТКА ТОВАРОВ (ФИЛЬТРАЦИЯ, СОРТИРОВКА, ПАГИНАЦИЯ)
	// =========================================================================

	/**
	 * Получает отфильтрованные и отсортированные товары
	 * @returns {Array} массив товаров
	 */
	getFilteredProducts() {
		// Фильтруем по категории
		let products = store.products.filter( product =>
			product.category === this.categoryKey
		);

		// Фильтр по наличию
		if ( this.filters.status !== 'all' ) {
			products = products.filter( p => p.status === this.filters.status );
		}

		// Сортировка
		switch ( this.filters.sortBy ) {
			case 'price-asc':
				products.sort( ( a, b ) => a.price - b.price );
				break;
			case 'price-desc':
				products.sort( ( a, b ) => b.price - a.price );
				break;
			case 'name-asc':
				products.sort( ( a, b ) => a.name.localeCompare( b.name, 'ru' ) );
				break;
			case 'name-desc':
				products.sort( ( a, b ) => b.name.localeCompare( a.name, 'ru' ) );
				break;
			case 'newest':
				products.sort( ( a, b ) => ( b.createdAt || '' ).localeCompare( a.createdAt || '' ) );
				break;
			default:
				// По умолчанию - сначала новинки, затем хиты, затем по популярности
				products.sort( ( a, b ) => {
					const getPriority = ( p ) => {
						let priority = 0;
						if ( p.isNew ) priority += 10;
						if ( p.isHit ) priority += 5;
						return priority;
					};
					return getPriority( b ) - getPriority( a );
				} );
				break;
		}

		return products;
	}

	/**
	 * Получает общее количество страниц
	 * @returns {number} количество страниц
	 */
	getTotalPages() {
		const products = this.getFilteredProducts();
		return Math.ceil( products.length / this.itemsPerPage );
	}

	// =========================================================================
	// ОТОБРАЖЕНИЕ ТОВАРОВ
	// =========================================================================

	/**
	 * Рендерит товары на странице
	 */
	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		const emptyState = document.getElementById( 'emptyState' );
		const productsCount = document.getElementById( 'productsCount' );
		const pagination = document.getElementById( 'pagination' );

		if ( !grid ) return;

		const allProducts = this.getFilteredProducts();
		const totalPages = this.getTotalPages();

		// Обновляем счетчик товаров
		if ( productsCount ) {
			const count = allProducts.length;
			const text = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
			productsCount.textContent = `${count} ${text}`;
		}

		// Если товаров нет - показываем пустое состояние
		if ( allProducts.length === 0 ) {
			grid.style.display = 'none';
			if ( emptyState ) emptyState.style.display = 'block';
			if ( pagination ) pagination.style.display = 'none';
			return;
		}

		grid.style.display = 'grid';
		if ( emptyState ) emptyState.style.display = 'none';

		// Пагинация
		const start = ( this.currentPage - 1 ) * this.itemsPerPage;
		const end = start + this.itemsPerPage;
		const products = allProducts.slice( start, end );

		// Рендерим товары
		grid.innerHTML = products.map( product => this.renderProductCard( product ) ).join( '' );

		// Прикрепляем обработчики событий
		this.attachProductEvents();

		// Обновляем пагинацию
		this.renderPagination( totalPages );

		// Обновляем хэш товаров после рендера
		this.updateProductsHash();
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

		// Формируем бейджи
		let badges = '';
		if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="product-badge hit">Хит</span>';
		if ( product.oldPrice ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="product-badge sale">-${discount}%</span>`;
		}

		// Определяем статус наличия
		const stockClass = product.status === 'in-stock' ? 'in-stock' : 'out-of-stock';
		const stockText = product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии';

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
					<div class="product-stock ${stockClass}">
						${stockText}
						${product.quantity > 0 ? ` (${availableQuantity} шт.)` : ''}
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

	// =========================================================================
	// ОБРАБОТЧИКИ СОБЫТИЙ
	// =========================================================================

	/**
	 * Привязывает обработчики событий к элементам управления
	 */
	bindEvents() {
		// Сортировка
		const sortSelect = document.getElementById( 'sortBy' );
		if ( sortSelect ) {
			sortSelect.addEventListener( 'change', ( e ) => {
				this.filters.sortBy = e.target.value;
				this.currentPage = 1;
				this.renderProducts();
			} );
		}

		// Фильтр по наличию
		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.addEventListener( 'change', ( e ) => {
				this.filters.status = e.target.value;
				this.currentPage = 1;
				this.renderProducts();
			} );
		}

		// Кнопки пагинации
		const prevBtn = document.querySelector( '.pagination-btn.prev' );
		const nextBtn = document.querySelector( '.pagination-btn.next' );

		if ( prevBtn ) {
			prevBtn.addEventListener( 'click', () => {
				if ( this.currentPage > 1 ) {
					this.currentPage--;
					this.renderProducts();
				}
			} );
		}

		if ( nextBtn ) {
			nextBtn.addEventListener( 'click', () => {
				const totalPages = this.getTotalPages();
				if ( this.currentPage < totalPages ) {
					this.currentPage++;
					this.renderProducts();
				}
			} );
		}
	}

	/**
	 * Прикрепляет обработчики к кнопкам товаров (через делегирование)
	 */
	attachProductEvents() {
		const grid = document.getElementById( 'productsGrid' );
		if ( !grid ) return;

		// Удаляем старый обработчик, если есть
		if ( grid._delegateHandler ) {
			grid.removeEventListener( 'click', grid._delegateHandler );
		}

		// Создаем новый обработчик через делегирование
		grid._delegateHandler = ( e ) => {
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

		grid.addEventListener( 'click', grid._delegateHandler );
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
				// Еще раз обновляем состояние
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
	// ПАГИНАЦИЯ
	// =========================================================================

	/**
	 * Рендерит пагинацию
	 * @param {number} totalPages - общее количество страниц
	 */
	renderPagination( totalPages ) {
		const pagination = document.getElementById( 'pagination' );
		const paginationPages = document.getElementById( 'paginationPages' );
		const prevBtn = document.querySelector( '.pagination-btn.prev' );
		const nextBtn = document.querySelector( '.pagination-btn.next' );

		if ( totalPages <= 1 ) {
			if ( pagination ) pagination.style.display = 'none';
			return;
		}

		if ( pagination ) pagination.style.display = 'flex';

		// Обновляем состояние кнопок
		if ( prevBtn ) prevBtn.disabled = this.currentPage === 1;
		if ( nextBtn ) nextBtn.disabled = this.currentPage === totalPages;

		// Генерируем номера страниц
		if ( paginationPages ) {
			let pagesHTML = '';

			if ( totalPages <= 5 ) {
				for ( let i = 1; i <= totalPages; i++ ) {
					pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
				}
			} else {
				if ( this.currentPage <= 3 ) {
					for ( let i = 1; i <= 4; i++ ) {
						pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
					}
					pagesHTML += '<span class="pagination-dots">...</span>';
					pagesHTML += `<span class="pagination-page" data-page="${totalPages}">${totalPages}</span>`;
				} else if ( this.currentPage >= totalPages - 2 ) {
					pagesHTML += `<span class="pagination-page" data-page="1">1</span>`;
					pagesHTML += '<span class="pagination-dots">...</span>';
					for ( let i = totalPages - 3; i <= totalPages; i++ ) {
						pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
					}
				} else {
					pagesHTML += `<span class="pagination-page" data-page="1">1</span>`;
					pagesHTML += '<span class="pagination-dots">...</span>';
					for ( let i = this.currentPage - 1; i <= this.currentPage + 1; i++ ) {
						pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
					}
					pagesHTML += '<span class="pagination-dots">...</span>';
					pagesHTML += `<span class="pagination-page" data-page="${totalPages}">${totalPages}</span>`;
				}
			}

			paginationPages.innerHTML = pagesHTML;

			// Добавляем обработчики на номера страниц
			document.querySelectorAll( '.pagination-page' ).forEach( page => {
				page.addEventListener( 'click', () => {
					const pageNum = parseInt( page.dataset.page );
					if ( pageNum && pageNum !== this.currentPage ) {
						this.currentPage = pageNum;
						this.renderProducts();
					}
				} );
			} );
		}
	}

	// =========================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// =========================================================================

	/**
	 * Склонение слов (1 товар, 2 товара, 5 товаров)
	 * @param {number} number - число
	 * @param {Array} words - варианты слов ['товар', 'товара', 'товаров']
	 * @returns {string} правильная форма
	 */
	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
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

	// =========================================================================
	// СТАТИЧЕСКИЕ МЕТОДЫ ДЛЯ ИНИЦИАЛИЗАЦИИ
	// =========================================================================

	/**
	 * Определяет категорию по URL и data-атрибутам
	 * @returns {Object} объект с ключом и названием категории
	 */
	static initFromPage() {
		const path = window.location.pathname;
		let categoryKey = 'other';
		let categoryName = 'Другое';

		const categoryMap = {
			'figurines': { key: 'figures', name: 'Аниме фигурки' },
			'tea': { key: 'tea', name: 'Японский чай' },
			'sweets': { key: 'sweets', name: 'Азиатские сладости' },
			'dishes': { key: 'tableware', name: 'Японская посуда' },
			'manga': { key: 'manga', name: 'Манга и книги' },
			'clothes': { key: 'clothing', name: 'Аниме одежда' },
			'games': { key: 'games', name: 'Японские игры' },
			'office': { key: 'stationery', name: 'Канцелярия кавай' },
			'cosmetics': { key: 'cosmetics', name: 'Косметика из Азии' },
			'decor': { key: 'decor', name: 'Азиатский декор' },
			'disks': { key: 'anime', name: 'Аниме на дисках' },
			'music': { key: 'music', name: 'Азиатская музыка' }
		};

		for ( const [urlPart, data] of Object.entries( categoryMap ) ) {
			if ( path.includes( urlPart ) ) {
				categoryKey = data.key;
				categoryName = data.name;
				break;
			}
		}

		const body = document.body;
		if ( body.dataset.category ) {
			categoryKey = body.dataset.category;
			const categories = {
				'figures': 'Аниме фигурки',
				'tea': 'Японский чай',
				'sweets': 'Азиатские сладости',
				'tableware': 'Японская посуда',
				'manga': 'Манга и книги',
				'clothing': 'Аниме одежда',
				'games': 'Японские игры',
				'stationery': 'Канцелярия кавай',
				'cosmetics': 'Косметика из Азии',
				'decor': 'Азиатский декор',
				'anime': 'Аниме на дисках',
				'music': 'Азиатская музыка',
				'other': 'Другое'
			};
			categoryName = categories[categoryKey] || categoryKey;
		}

		return { categoryKey, categoryName };
	}
}

// =========================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// =========================================================================

document.addEventListener( 'DOMContentLoaded', function () {
	if ( document.getElementById( 'productsGrid' ) ) {
		const { categoryKey, categoryName } = CategoryPage.initFromPage();
		window.categoryPage = new CategoryPage( categoryKey, categoryName );
		console.log( `✅ Страница категории "${categoryName}" (${categoryKey}) инициализирована` );
	}
} );