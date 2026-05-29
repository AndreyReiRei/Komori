/**
 * ============================================================================
 * PRODUCT-MANAGEMENT.JS — УПРАВЛЕНИЕ ТОВАРАМИ (АДМИНКА)
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Отображение списка товаров с фильтрацией и сортировкой
 * - Добавление / редактирование / удаление товаров
 * - Управление изображениями (URL, путь к файлу, загрузка с ПК)
 * - Группировка товаров по категориям
 * - Интеграция с глобальным store (localStorage)
 * 
 * ИСТОЧНИКИ ИЗОБРАЖЕНИЙ:
 * - Локальный путь: /image/товар.jpg
 * - Внешний URL: https://example.com/image.jpg
 * - Загрузка с ПК: выбор файла → скачивание → ручное копирование в /image/
 * 
 * ЗАВИСИМОСТИ:
 * - store (глобальный объект управления данными)
 * - API (глобальный объект утилит)
 * - DOM-элементы админки в product-management.html
 * 
 * ============================================================================
 */

class ProductManager {
	constructor() {
		console.log( '╔══════════════════════════════════════════════════╗' );
		console.log( '║       PRODUCT MANAGER — ИНИЦИАЛИЗАЦИЯ           ║' );
		console.log( '╚══════════════════════════════════════════════════╝' );

		/**
		 * ID текущего редактируемого товара
		 * null = создание нового товара
		 * string = редактирование существующего
		 * @type {string|null}
		 */
		this.currentProductId = null;

		/**
		 * Текущий выбранный файл (для возможности скачивания)
		 * Сохраняется чтобы пользователь мог скачать файл после выбора
		 * @type {File|null}
		 */
		this.selectedFile = null;

		/**
		 * Объект для хранения текущих настроек сортировки
		 * @type {{by: string, order: string}}
		 */
		this.currentSort = {
			by: 'default',   // Поле сортировки: default | name | price | quantity
			order: 'asc'     // Направление: asc | desc
		};

		// Ждём загрузку DOM перед инициализацией
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', () => this.init() );
		} else {
			this.init();
		}
	}

	// ========================================================================
	// 1. ИНИЦИАЛИЗАЦИЯ
	// ========================================================================

	/**
	 * Главный метод инициализации менеджера товаров
	 * Выполняет:
	 * 1. Рендеринг списка товаров
	 * 2. Привязку обработчиков событий (кнопки, фильтры, формы)
	 * 3. Инициализацию вкладок формы (Основное / Цена / Изображение)
	 * 4. Инициализацию системы выбора изображений
	 * 5. Подписку на глобальные события обновления товаров
	 */
	init() {
		console.log( '📦 ProductManager: начало инициализации...' );

		// Шаг 1: Отображаем список товаров
		this.renderProducts();

		// Шаг 2: Привязываем обработчики событий
		this.bindEvents();

		// Шаг 3: Инициализируем вкладки формы
		this.initFormTabs();

		// Шаг 4: Инициализируем выбор изображений
		this.initImageUpload();

		// Шаг 5: Подписываемся на глобальное событие обновления товаров
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '🔄 ProductManager: товары обновлены, перерисовываем список...' );
			this.renderProducts();
		} );

		console.log( '✅ ProductManager: готов к работе!' );
	}

	// ========================================================================
	// 2. СБРОС ДЕМО-ДАННЫХ
	// ========================================================================

	/**
	 * Сбрасывает все товары до демо-набора
	 * Запрашивает подтверждение перед удалением
	 * Показывает индикатор загрузки во время процесса
	 */
	resetDemoData() {
		// Запрашиваем подтверждение у пользователя
		if ( !confirm( '⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ текущие товары и восстановит стандартные демо-товары. Вы уверены?' ) ) {
			return;
		}

		// Показываем индикатор загрузки на кнопке
		this.showResetLoader();

		// Удаляем все версии и данные из localStorage
		localStorage.removeItem( 'komori_demo_version' );
		localStorage.removeItem( 'komori_slides_version' );
		localStorage.removeItem( 'komori_products' );
		localStorage.removeItem( 'komori_promo_slides' );

		// Очищаем глобальный store
		store.products = [];
		store.promoSlides = [];

		// Восстанавливаем демо-данные
		store.addDemoProductsIfNeeded();
		store.addDemoSlidesIfNeeded();

		// Даём время на применение изменений
		setTimeout( () => {
			this.renderProducts();
			API.showNotification( '✅ Демо-данные восстановлены! Обновите страницу.', 'success' );
			this.hideResetLoader();

			// Автоматически обновляем страницу через 1.5 секунды
			setTimeout( () => {
				location.reload();
			}, 1500 );
		}, 500 );
	}

	/**
	 * Показывает индикатор загрузки на кнопке сброса
	 * Меняет текст и иконку, блокирует кнопку
	 */
	showResetLoader() {
		const resetBtn = document.getElementById( 'resetDemoDataBtn' );
		if ( resetBtn ) {
			resetBtn.disabled = true;
			resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сброс...';
		}
	}

	/**
	 * Скрывает индикатор загрузки на кнопке сброса
	 * Возвращает исходный текст и иконку
	 */
	hideResetLoader() {
		const resetBtn = document.getElementById( 'resetDemoDataBtn' );
		if ( resetBtn ) {
			resetBtn.disabled = false;
			resetBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Сбросить демо-данные';
		}
	}

	// ========================================================================
	// 3. ОТОБРАЖЕНИЕ ТОВАРОВ
	// ========================================================================

	/**
	 * Главный метод рендеринга списка товаров
	 * 
	 * Алгоритм:
	 * 1. Получает текущие значения фильтров (поиск, категория, статус)
	 * 2. Получает товары из store с применением фильтров
	 * 3. Сортирует товары согласно текущим настройкам
	 * 4. Группирует по категориям
	 * 5. Рендерит HTML и вставляет в DOM
	 * 6. Привязывает обработчики к кнопкам в карточках
	 */
	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		if ( !grid ) {
			console.error( '❌ ProductManager: элемент productsGrid не найден в DOM' );
			return;
		}

		// Получаем текущие значения фильтров
		const filters = this.getFilters();

		// Получаем товары из хранилища с применением фильтров
		let products = store.getProducts( filters );

		// Применяем сортировку
		products = this.sortProducts( products );

		// Если товаров нет — показываем пустое состояние
		if ( products.length === 0 ) {
			grid.innerHTML = this.getEmptyStateHTML();
			return;
		}

		// Группируем товары по категориям
		const groupedProducts = this.groupProductsByCategory( products );

		// Рендерим сгруппированные товары
		grid.innerHTML = this.renderGroupedProducts( groupedProducts );

		// Привязываем обработчики к кнопкам в карточках
		this.attachProductEvents();

		console.log( `📦 ProductManager: отрендерено ${products.length} товаров в ${Object.keys( groupedProducts ).length} категориях` );
	}

	/**
	 * Получает текущие значения всех фильтров из DOM
	 * @returns {Object} Объект с параметрами фильтрации
	 */
	getFilters() {
		return {
			search: document.getElementById( 'searchInput' )?.value || '',
			category: document.getElementById( 'categoryFilter' )?.value || 'all',
			status: document.getElementById( 'statusFilter' )?.value || 'all',
			sortBy: this.currentSort.by,
			sortOrder: this.currentSort.order
		};
	}

	/**
	 * Сортирует массив товаров согласно текущим настройкам
	 * @param {Array} products - Массив товаров для сортировки
	 * @returns {Array} Отсортированный массив
	 */
	sortProducts( products ) {
		// Если сортировка по умолчанию — возвращаем как есть
		if ( this.currentSort.by === 'default' ) {
			return products;
		}

		// Создаём копию массива чтобы не мутировать оригинал
		return [...products].sort( ( a, b ) => {
			let comparison = 0;

			switch ( this.currentSort.by ) {
				case 'name':
					// Сортировка по названию (с учётом русской локали)
					comparison = a.name.localeCompare( b.name, 'ru' );
					break;
				case 'price':
					// Сортировка по цене
					comparison = a.price - b.price;
					break;
				case 'quantity':
					// Сортировка по количеству
					comparison = a.quantity - b.quantity;
					break;
				default:
					return 0;
			}

			// Учитываем направление сортировки
			return this.currentSort.order === 'asc' ? comparison : -comparison;
		} );
	}

	/**
	 * Группирует товары по категориям
	 * Категории выводятся в заданном порядке, остальные — в конец
	 * @param {Array} products - Массив товаров
	 * @returns {Object} Объект {категория: [товары]}
	 */
	groupProductsByCategory( products ) {
		const grouped = {};

		// Задаём порядок категорий (основные категории первыми)
		const categoryOrder = [
			'figures', 'tea', 'sweets', 'manga', 'clothing',
			'tableware', 'games', 'stationery', 'cosmetics',
			'decor', 'anime', 'music', 'other'
		];

		// Группируем товары по категориям
		products.forEach( product => {
			const category = product.category || 'other';
			if ( !grouped[category] ) {
				grouped[category] = [];
			}
			grouped[category].push( product );
		} );

		// Сортируем группы согласно заданному порядку
		const sortedGrouped = {};
		categoryOrder.forEach( cat => {
			if ( grouped[cat] && grouped[cat].length > 0 ) {
				sortedGrouped[cat] = grouped[cat];
			}
		} );

		// Добавляем оставшиеся категории (которых нет в categoryOrder)
		Object.keys( grouped ).forEach( cat => {
			if ( !sortedGrouped[cat] ) {
				sortedGrouped[cat] = grouped[cat];
			}
		} );

		return sortedGrouped;
	}

	/**
	 * Рендерит HTML для сгруппированных товаров
	 * Первая группа развёрнута, остальные свёрнуты
	 * @param {Object} groupedProducts - Сгруппированные товары
	 * @returns {string} HTML-строка
	 */
	renderGroupedProducts( groupedProducts ) {
		let html = '';
		let isFirst = true;

		for ( const [categoryKey, products] of Object.entries( groupedProducts ) ) {
			if ( products.length === 0 ) continue;

			const categoryName = store.getCategoryName( categoryKey );
			const categoryIcon = this.getCategoryIcon( categoryKey );
			const productCount = products.length;

			// Первая группа развёрнута (без класса collapsed)
			// Остальные — свёрнуты (с классом collapsed)
			const collapsedClass = isFirst ? '' : 'collapsed';
			const chevronIcon = isFirst ? 'fa-chevron-up' : 'fa-chevron-down';

			html += `
                <div class="category-group ${collapsedClass}" data-category="${categoryKey}">
                    <div class="category-group-header">
                        <div class="category-group-title">
                            <i class="fas ${categoryIcon}"></i>
                            <h2>${categoryName}</h2>
                            <span class="category-group-count">${productCount} товаров</span>
                        </div>
                        <button class="category-group-toggle" data-category="${categoryKey}">
                            <i class="fas ${chevronIcon}"></i>
                        </button>
                    </div>
                    <div class="category-group-products">
                        <div class="products-grid-inner">
                            ${products.map( product => this.renderProductCard( product ) ).join( '' )}
                        </div>
                    </div>
                </div>
            `;

			isFirst = false;
		}

		return html;
	}

	/**
	 * Возвращает иконку Font Awesome для категории
	 * @param {string} categoryKey - Ключ категории
	 * @returns {string} Класс иконки
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
	 * HTML для пустого состояния (когда товаров нет)
	 * @returns {string} HTML-строка
	 */
	getEmptyStateHTML() {
		return `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Товары не найдены</p>
                <button class="btn-primary" onclick="window.productManager.openModal()">
                    <i class="fas fa-plus"></i> Добавить первый товар
                </button>
            </div>
        `;
	}

	/**
	 * Создаёт HTML карточки товара для админки
	 * @param {Object} product - Объект товара из store
	 * @returns {string} HTML-строка карточки
	 */
	renderProductCard( product ) {
		// Проверяем количество в корзине
		const cartItem = store.cart.find( item => item.id === product.id );
		const inCartQuantity = cartItem ? cartItem.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		return `
            <div class="product-card" data-id="${product.id}">
                <!-- Бейджи (Новинка, Хит, Скидка) -->
                <div class="product-badges">
                    ${product.isNew ? '<span class="badge new">Новинка</span>' : ''}
                    ${product.isHit ? '<span class="badge hit">Хит</span>' : ''}
                    ${product.oldPrice ? '<span class="badge sale">Скидка</span>' : ''}
                </div>

                <!-- Изображение товара -->
                <div class="product-image">
                    <img src="${API.getSafeImageUrl( product.image )}" 
                        alt="${this.escapeHtml( product.name )}"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='${API.getFallbackSvg( product.name )}'">
                </div>

                <!-- Информация о товаре -->
                <div class="product-info">
                    <div class="product-category">${store.getCategoryName( product.category )}</div>
                    <div class="product-name">${this.escapeHtml( product.name )}</div>
                    <div class="product-sku">Артикул: ${product.sku || 'Нет'}</div>
                    ${product.col ? `<div class="product-col">Коллекция: ${this.escapeHtml( product.col )}</div>` : ''}
                    <div class="product-description">${this.escapeHtml( product.description || 'Нет описания' )}</div>

                    <!-- Цена -->
                    <div class="product-price">
                        <span class="current-price">${API.formatPrice( product.price )}</span>
                        ${product.oldPrice ? `<span class="old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
                    </div>

                    <!-- Наличие -->
                    <div class="product-stock">
                        <i class="fas ${product.status === 'in-stock' ? 'fa-check-circle in-stock' : 'fa-times-circle out-of-stock'}"></i>
                        <span class="${product.status === 'in-stock' ? 'in-stock' : 'out-of-stock'}">
                            ${product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии'}
                        </span>
                        ${product.quantity > 0 ? `<span class="product-quantity">${availableQuantity} шт.</span>` : ''}
                    </div>
                </div>

                <!-- Кнопки действий -->
                <div class="product-actions">
                    <button class="edit-btn" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button class="delete-btn" data-id="${product.id}">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `;
	}

	/**
	 * Привязывает обработчики событий к кнопкам в карточках товаров
	 * Использует делегирование через document для лучшей производительности
	 */
	attachProductEvents() {
		// Кнопки "Редактировать"
		document.querySelectorAll( '.edit-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this._handleEditClick );
			this._handleEditClick = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;
				this.openModal( id );
			};
			btn.addEventListener( 'click', this._handleEditClick );
		} );

		// Кнопки "Удалить"
		document.querySelectorAll( '.delete-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this._handleDeleteClick );
			this._handleDeleteClick = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;
				this.openDeleteModal( id );
			};
			btn.addEventListener( 'click', this._handleDeleteClick );
		} );

		// Кнопки сворачивания/разворачивания групп категорий
		document.querySelectorAll( '.category-group-toggle' ).forEach( btn => {
			btn.removeEventListener( 'click', this._handleGroupToggle );
			this._handleGroupToggle = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const toggleBtn = e.currentTarget;
				const group = toggleBtn.closest( '.category-group' );
				if ( group ) {
					group.classList.toggle( 'collapsed' );
					const icon = toggleBtn.querySelector( 'i' );
					if ( icon ) {
						icon.className = group.classList.contains( 'collapsed' )
							? 'fas fa-chevron-down'
							: 'fas fa-chevron-up';
					}
				}
			};
			btn.addEventListener( 'click', this._handleGroupToggle );
		} );
	}

	// ========================================================================
	// 4. ФИЛЬТРЫ И СОРТИРОВКА
	// ========================================================================

	/**
	 * Привязывает обработчики событий ко всем элементам управления
	 * Кнопки, поля ввода, селекты фильтров и сортировки
	 */
	bindEvents() {
		console.log( '🔗 ProductManager: привязка событий...' );

		// ===== Кнопка добавления товара =====
		const addBtn = document.getElementById( 'addProductBtn' );
		if ( addBtn ) {
			addBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.openModal(); // Открываем модальное окно без ID (новый товар)
			} );
		}

		// ===== Поле поиска (фильтрация при каждом вводе символа) =====
		const searchInput = document.getElementById( 'searchInput' );
		if ( searchInput ) {
			searchInput.addEventListener( 'input', () => {
				this.renderProducts();
			} );
		}

		// ===== Фильтр по категории =====
		const categoryFilter = document.getElementById( 'categoryFilter' );
		if ( categoryFilter ) {
			categoryFilter.addEventListener( 'change', () => {
				this.renderProducts();
			} );
		}

		// ===== Фильтр по статусу (наличие) =====
		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.addEventListener( 'change', () => {
				this.renderProducts();
			} );
		}

		// ===== Выбор типа сортировки =====
		const sortBy = document.getElementById( 'sortBy' );
		if ( sortBy ) {
			sortBy.addEventListener( 'change', ( e ) => {
				const value = e.target.value;
				const parts = value.split( '-' );
				const sortByField = parts[0];
				const sortOrder = parts[1] || 'asc';

				this.currentSort.by = sortByField;
				this.currentSort.order = sortOrder;
				this.updateSortOrderIcon();
				this.renderProducts();
			} );
		}

		// ===== Кнопка переключения направления сортировки =====
		const sortOrderBtn = document.getElementById( 'sortOrderBtn' );
		if ( sortOrderBtn ) {
			sortOrderBtn.addEventListener( 'click', () => {
				const sortBySelect = document.getElementById( 'sortBy' );
				const currentValue = sortBySelect ? sortBySelect.value : 'default';

				if ( currentValue === 'default' ) {
					// Если сортировка по умолчанию — включаем сортировку по имени
					this.currentSort.by = 'name';
					this.currentSort.order = 'asc';
					if ( sortBySelect ) sortBySelect.value = 'name-asc';
				} else {
					// Переключаем направление
					this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
					if ( sortBySelect && this.currentSort.by !== 'default' ) {
						sortBySelect.value = `${this.currentSort.by}-${this.currentSort.order}`;
					}
				}
				this.updateSortOrderIcon();
				this.renderProducts();
			} );
		}

		// ===== Закрытие модальных окон =====
		const closeButtons = [
			'closeModal', 'cancelModalBtn',
			'closeDeleteModal', 'cancelDeleteBtn'
		];
		closeButtons.forEach( id => {
			const btn = document.getElementById( id );
			if ( btn ) {
				btn.addEventListener( 'click', ( e ) => {
					e.preventDefault();
					this.closeAllModals();
				} );
			}
		} );

		// ===== Подтверждение удаления товара =====
		const confirmDeleteBtn = document.getElementById( 'confirmDeleteBtn' );
		if ( confirmDeleteBtn ) {
			confirmDeleteBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.confirmDelete();
			} );
		}

		// ===== Отправка формы товара =====
		const productForm = document.getElementById( 'productForm' );
		if ( productForm ) {
			productForm.addEventListener( 'submit', ( e ) => {
				e.preventDefault();
				this.saveProduct();
			} );
		}

		// ===== Кнопка сброса демо-данных =====
		const resetDemoBtn = document.getElementById( 'resetDemoDataBtn' );
		if ( resetDemoBtn ) {
			resetDemoBtn.addEventListener( 'click', () => {
				this.resetDemoData();
			} );
		}

		// ===== Закрытие модального окна при клике вне его =====
		window.addEventListener( 'click', ( e ) => {
			if ( e.target.classList.contains( 'modal' ) ) {
				this.closeAllModals();
			}
		} );

		console.log( '✅ ProductManager: события привязаны' );
	}

	/**
	 * Обновляет иконку на кнопке переключения направления сортировки
	 */
	updateSortOrderIcon() {
		const sortOrderBtn = document.getElementById( 'sortOrderBtn' );
		if ( !sortOrderBtn ) return;

		const icon = sortOrderBtn.querySelector( 'i' );
		if ( icon ) {
			icon.className = this.currentSort.order === 'asc'
				? 'fas fa-arrow-up-wide-short'
				: 'fas fa-arrow-down-wide-short';
		}
	}

	// ========================================================================
	// 5. РАБОТА С МОДАЛЬНЫМИ ОКНАМИ
	// ========================================================================

	/**
	 * Открывает модальное окно для добавления или редактирования товара
	 * 
	 * @param {string|null} productId - ID товара для редактирования,
	 *                                   null для создания нового
	 */
	openModal( productId = null ) {
		console.log( '📦 ProductManager: открытие модального окна, productId:', productId );

		const modal = document.getElementById( 'productModal' );
		if ( !modal ) {
			console.error( '❌ Модальное окно productModal не найдено в DOM' );
			API.showNotification( 'Ошибка: модальное окно не найдено', 'error' );
			return;
		}

		const title = document.getElementById( 'modalTitle' );
		const form = document.getElementById( 'productForm' );

		// Сбрасываем форму и состояние
		if ( form ) {
			form.reset();
			this.clearImagePreview();
			this.selectedFile = null;

			// Сбрасываем все чекбоксы
			form.querySelectorAll( 'input[type="checkbox"]' ).forEach( checkbox => {
				checkbox.checked = false;
			} );
		}

		// Сбрасываем вкладки источника на URL
		const urlTab = document.querySelector( '.source-tab[data-source="url"]' );
		if ( urlTab ) urlTab.click();

		// Скрываем подсказку загрузки
		const uploadHint = document.getElementById( 'uploadHint' );
		const downloadBtn = document.getElementById( 'downloadUploadedBtn' );
		if ( uploadHint ) uploadHint.style.display = 'none';
		if ( downloadBtn ) downloadBtn.style.display = 'none';

		this.currentProductId = productId;

		// Если редактируем существующий товар — заполняем форму
		if ( productId ) {
			const product = store.getProduct( productId );
			if ( product ) {
				if ( title ) title.innerHTML = '<i class="fas fa-edit"></i> Редактировать товар';
				this.fillForm( product );
			}
		} else {
			if ( title ) title.innerHTML = '<i class="fas fa-plus"></i> Добавить товар';
		}

		// Активируем первую вкладку (Основное)
		const firstTab = document.querySelector( '.form-tab' );
		if ( firstTab ) firstTab.click();

		// Показываем модальное окно
		modal.classList.add( 'show' );
	}

	/**
	 * Закрывает все открытые модальные окна
	 * Сбрасывает состояние редактирования
	 */
	closeAllModals() {
		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.classList.remove( 'show' );
		} );

		// Освобождаем blob URL если был
		const previewImg = document.getElementById( 'imagePreviewImg' );
		if ( previewImg && previewImg.src.startsWith( 'blob:' ) ) {
			URL.revokeObjectURL( previewImg.src );
		}

		this.currentProductId = null;
		this.selectedFile = null;
	}

	/**
	 * Заполняет форму данными товара для редактирования
	 * @param {Object} product - Объект товара из store
	 */
	fillForm( product ) {
		console.log( '📝 ProductManager: заполнение формы для товара:', product.name );

		// Карта соответствия ID полей и свойств товара
		const fields = {
			'productName': product.name,
			'productCategory': product.category,
			'productSKU': product.sku,
			'productCOL': product.col,
			'productPrice': product.price,
			'productOldPrice': product.oldPrice,
			'productDescription': product.description,
			'productStatus': product.status,
			'productQuantity': product.quantity,
			'productImageUrl': product.image
		};

		// Заполняем текстовые поля
		Object.entries( fields ).forEach( ( [id, value] ) => {
			const element = document.getElementById( id );
			if ( element ) {
				element.value = value || '';
			}
		} );

		// Заполняем чекбоксы
		const isNewCheck = document.getElementById( 'productIsNew' );
		if ( isNewCheck ) isNewCheck.checked = product.isNew || false;

		const isHitCheck = document.getElementById( 'productIsHit' );
		if ( isHitCheck ) isHitCheck.checked = product.isHit || false;

		// Обновляем превью изображения
		if ( product.image ) {
			this.updateImagePreview( product.image );
		}

		// Если изображение начинается с http — переключаем на вкладку URL
		if ( product.image && ( product.image.startsWith( 'http://' ) || product.image.startsWith( 'https://' ) ) ) {
			const urlTab = document.querySelector( '.source-tab[data-source="url"]' );
			if ( urlTab ) urlTab.click();
		}
	}

	/**
	 * Открывает модальное окно подтверждения удаления товара
	 * @param {string} productId - ID товара для удаления
	 */
	openDeleteModal( productId ) {
		const product = store.getProduct( productId );
		if ( !product ) {
			console.error( '❌ Товар не найден:', productId );
			return;
		}

		// Показываем название удаляемого товара
		const nameSpan = document.getElementById( 'deleteProductName' );
		if ( nameSpan ) {
			nameSpan.textContent = product.name;
		}

		this.currentProductId = productId;

		// Открываем модальное окно подтверждения
		const deleteModal = document.getElementById( 'deleteModal' );
		if ( deleteModal ) {
			deleteModal.classList.add( 'show' );
		}
	}

	/**
	 * Подтверждает и выполняет удаление товара
	 */
	confirmDelete() {
		if ( this.currentProductId ) {
			const product = store.getProduct( this.currentProductId );
			const productName = product ? product.name : 'Неизвестный товар';

			store.deleteProduct( this.currentProductId );
			console.log( '🗑️ Удалён товар:', productName );
			API.showNotification( `Товар "${productName}" удалён`, 'success' );
			this.closeAllModals();
		}
	}

	// ========================================================================
	// 6. СОХРАНЕНИЕ ТОВАРА
	// ========================================================================

	/**
	 * Сохраняет товар (создаёт новый или обновляет существующий)
	 * 
	 * Алгоритм:
	 * 1. Проверяет обязательные поля (название, цена)
	 * 2. Получает изображение из активного источника (URL или загрузка)
	 * 3. Валидирует и корректирует путь к изображению
	 * 4. Собирает объект с данными товара
	 * 5. Сохраняет через store (addProduct или updateProduct)
	 */
	saveProduct() {
		console.log( '💾 ProductManager: сохранение товара...' );

		// ===== Шаг 1: Получаем элементы формы =====
		const nameInput = document.getElementById( 'productName' );
		const priceInput = document.getElementById( 'productPrice' );
		const imageUrlInput = document.getElementById( 'productImageUrl' );

		// Проверяем существование обязательных полей
		if ( !nameInput || !priceInput ) {
			console.error( '❌ Не найдены обязательные поля формы' );
			API.showNotification( 'Ошибка: не найдены обязательные поля', 'error' );
			return;
		}

		// ===== Шаг 2: Валидация названия =====
		const productName = nameInput.value.trim();
		if ( !productName ) {
			API.showNotification( 'Введите название товара', 'error' );
			nameInput.focus();
			return;
		}

		// ===== Шаг 3: Валидация цены =====
		const productPrice = parseFloat( priceInput.value );
		if ( !priceInput.value || isNaN( productPrice ) || productPrice <= 0 ) {
			API.showNotification( 'Введите корректную цену (больше 0)', 'error' );
			priceInput.focus();
			return;
		}

		// ===== Шаг 4: Получаем изображение =====
		let imageUrl = '';
		const activeSource = document.querySelector( '.source-tab.active' )?.dataset.source;

		if ( imageUrlInput && imageUrlInput.value.trim() ) {
			// Изображение указано в поле ввода
			imageUrl = imageUrlInput.value.trim();
			console.log( '🖼️ Изображение из поля ввода:', imageUrl );
		}

		// Если изображение не указано
		if ( !imageUrl ) {
			API.showNotification( 'Укажите изображение (URL или загрузите файл)', 'warning' );
			// Не блокируем сохранение, используем заглушку
			imageUrl = '/image/placeholder.jpg';
			console.warn( '⚠️ Изображение не указано, используется заглушка' );
		}

		// ===== Шаг 5: Обработка разных типов источников =====
		if ( imageUrl.startsWith( 'http://' ) || imageUrl.startsWith( 'https://' ) ) {
			// Внешний URL — используем как есть
			console.log( '🖼️ Тип: внешний URL' );
		} else if ( imageUrl.startsWith( 'data:image' ) ) {
			// Base64 — предупреждаем, но разрешаем
			console.warn( '⚠️ Тип: base64 (не рекомендуется для больших изображений)' );
			API.showNotification( '⚠️ Base64 изображения занимают много места. Рекомендуется использовать файлы из /image/', 'warning' );
		} else if ( imageUrl.startsWith( '/image/' ) ) {
			// Локальный путь — всё правильно
			console.log( '🖼️ Тип: локальный путь /image/' );
		} else if ( imageUrl.startsWith( '/' ) ) {
			// Абсолютный путь от корня — оставляем как есть
			console.log( '🖼️ Тип: абсолютный путь' );
		} else {
			// Всё остальное — добавляем /image/
			imageUrl = '/image/' + imageUrl.replace( /^\/+/, '' );
			console.log( '🖼️ Путь скорректирован до:', imageUrl );
		}

		// Если использовалась загрузка с ПК — напоминаем сохранить файл
		if ( activeSource === 'upload' && this.selectedFile ) {
			console.warn( '⚠️ Файл был выбран с ПК. Убедитесь что он сохранён в папку /image/' );
		}

		// ===== Шаг 6: Собираем данные товара =====
		const productData = {
			// Основное
			name: productName,
			category: document.getElementById( 'productCategory' )?.value || 'other',
			sku: document.getElementById( 'productSKU' )?.value.trim() || '',
			col: document.getElementById( 'productCOL' )?.value.trim() || '',
			description: document.getElementById( 'productDescription' )?.value.trim() || '',

			// Цена и наличие
			price: productPrice,
			oldPrice: parseFloat( document.getElementById( 'productOldPrice' )?.value ) || 0,
			status: document.getElementById( 'productStatus' )?.value || 'in-stock',
			quantity: parseInt( document.getElementById( 'productQuantity' )?.value ) || 0,

			// Бейджи
			isNew: document.getElementById( 'productIsNew' )?.checked || false,
			isHit: document.getElementById( 'productIsHit' )?.checked || false,

			// Изображение
			image: imageUrl
		};

		console.log( '📦 Данные для сохранения:', JSON.stringify( productData, null, 2 ) );

		// ===== Шаг 7: Сохраняем через store =====
		try {
			if ( this.currentProductId ) {
				// Редактирование существующего товара
				console.log( '✏️ Обновление товара с ID:', this.currentProductId );
				store.updateProduct( this.currentProductId, productData );
				API.showNotification( '✅ Товар обновлён!', 'success' );
			} else {
				// Создание нового товара
				console.log( '➕ Создание нового товара' );
				store.addProduct( productData );
				API.showNotification( '✅ Товар добавлен!', 'success' );
			}

			// Закрываем модальное окно
			this.closeAllModals();

			// Обновляем список товаров
			this.renderProducts();

		} catch ( error ) {
			console.error( '❌ Ошибка при сохранении товара:', error );
			API.showNotification( '❌ Ошибка при сохранении: ' + error.message, 'error' );
		}
	}

	// ========================================================================
	// 7. ВКЛАДКИ ФОРМЫ
	// ========================================================================

	/**
	 * Инициализирует переключение вкладок в форме товара
	 * Вкладки: Основное, Цена и наличие, Изображение
	 */
	initFormTabs() {
		const tabs = document.querySelectorAll( '.form-tab' );

		tabs.forEach( tab => {
			tab.addEventListener( 'click', ( e ) => {
				e.preventDefault();

				// Убираем активный класс со всех вкладок
				tabs.forEach( t => t.classList.remove( 'active' ) );

				// Активируем текущую вкладку
				tab.classList.add( 'active' );

				// Показываем соответствующий контент
				const tabName = tab.dataset.tab;
				document.querySelectorAll( '.form-tab-content' ).forEach( content => {
					content.classList.toggle( 'active', content.dataset.tab === tabName );
				} );
			} );
		} );

		console.log( '📑 ProductManager: вкладки формы инициализированы' );
	}

	// ========================================================================
	// 8. ВЫБОР ИЗОБРАЖЕНИЙ (УНИВЕРСАЛЬНАЯ СИСТЕМА)
	// ========================================================================

	/**
	 * Инициализирует систему выбора изображений
	 * 
	 * Поддерживаемые источники:
	 * 1. URL / Путь к файлу — прямая ссылка или локальный путь
	 * 2. Загрузка с ПК — выбор файла, предпросмотр, скачивание
	 * 
	 * Особенности:
	 * - Drag & Drop для загрузки
	 * - Предпросмотр выбранного изображения
	 * - Проверка существования локальных файлов
	 * - Возможность скачать выбранный файл для ручного копирования
	 */
	initImageUpload() {
		console.log( '🖼️ ProductManager: инициализация выбора изображений...' );

		// Получаем все необходимые DOM-элементы
		const folderUpload = document.getElementById( 'imageFolderUpload' );
		const folderFile = document.getElementById( 'imageFolderFile' );
		const imageUrlInput = document.getElementById( 'productImageUrl' );
		const clearBtn = document.getElementById( 'clearPreviewBtn' );
		const downloadBtn = document.getElementById( 'downloadUploadedBtn' );
		const uploadHint = document.getElementById( 'uploadHint' );

		// ===== Переключение вкладок источника изображения =====
		document.querySelectorAll( '.source-tab' ).forEach( tab => {
			tab.addEventListener( 'click', () => {
				// Снимаем активный класс со всех вкладок
				document.querySelectorAll( '.source-tab' ).forEach( t => t.classList.remove( 'active' ) );
				document.querySelectorAll( '.image-source-content' ).forEach( c => c.classList.remove( 'active' ) );

				// Активируем выбранную вкладку
				tab.classList.add( 'active' );
				const targetContent = document.querySelector( `.image-source-content[data-source="${tab.dataset.source}"]` );
				if ( targetContent ) {
					targetContent.classList.add( 'active' );
				}

				// Если переключились на URL — сбрасываем состояние загрузки
				if ( tab.dataset.source === 'url' ) {
					this.selectedFile = null;
					if ( downloadBtn ) downloadBtn.style.display = 'none';
					if ( uploadHint ) uploadHint.style.display = 'none';
				}

				console.log( '🖼️ Выбран источник:', tab.dataset.source );
			} );
		} );

		// ===== ВАРИАНТ 1: URL / Путь к файлу =====
		if ( imageUrlInput ) {
			// Обновление превью при вводе URL
			imageUrlInput.addEventListener( 'input', ( e ) => {
				const url = e.target.value.trim();
				this.updateImagePreview( url );
			} );

			// Обновление превью при вставке из буфера обмена
			imageUrlInput.addEventListener( 'paste', () => {
				setTimeout( () => {
					const url = imageUrlInput.value.trim();
					this.updateImagePreview( url );
				}, 100 );
			} );
		}

		// ===== ВАРИАНТ 2: Загрузка с ПК =====
		if ( folderUpload && folderFile ) {
			// Клик по области загрузки открывает выбор файла
			folderUpload.addEventListener( 'click', () => {
				folderFile.click();
			} );

			// Drag & Drop — перетаскивание файла в область загрузки
			folderUpload.addEventListener( 'dragover', ( e ) => {
				e.preventDefault();
				folderUpload.style.borderColor = '#ff3366';
				folderUpload.style.background = 'rgba(255, 51, 102, 0.1)';
			} );

			folderUpload.addEventListener( 'dragleave', () => {
				folderUpload.style.borderColor = '#333';
				folderUpload.style.background = '#0d0d0d';
			} );

			folderUpload.addEventListener( 'drop', ( e ) => {
				e.preventDefault();
				folderUpload.style.borderColor = '#333';
				folderUpload.style.background = '#0d0d0d';

				const file = e.dataTransfer.files[0];
				if ( file ) {
					this.handleFileSelect( file );
				}
			} );

			// Выбор файла через стандартный диалог
			folderFile.addEventListener( 'change', ( e ) => {
				const file = e.target.files[0];
				if ( file ) {
					this.handleFileSelect( file );
				}
			} );
		}

		// ===== Кнопка очистки превью =====
		if ( clearBtn ) {
			clearBtn.addEventListener( 'click', () => {
				if ( imageUrlInput ) imageUrlInput.value = '';
				this.selectedFile = null;
				this.clearImagePreview();
				if ( downloadBtn ) downloadBtn.style.display = 'none';
				if ( uploadHint ) uploadHint.style.display = 'none';
				API.showNotification( 'Изображение очищено', 'info' );
			} );
		}

		// ===== Кнопка скачивания выбранного файла =====
		if ( downloadBtn ) {
			downloadBtn.addEventListener( 'click', () => {
				if ( this.selectedFile ) {
					this.downloadFile( this.selectedFile );
				}
			} );
		}

		console.log( '✅ ProductManager: система выбора изображений готова' );
	}

	/**
	 * Обрабатывает выбор файла с компьютера
	 * 
	 * Выполняет:
	 * 1. Проверку типа файла (только изображения)
	 * 2. Проверку размера (максимум 10 МБ)
	 * 3. Формирование пути /image/имя_файла
	 * 4. Запись пути в поле ввода
	 * 5. Отображение превью
	 * 6. Показ инструкции по сохранению файла
	 * 
	 * @param {File} file - Выбранный файл
	 */
	handleFileSelect( file ) {
		// Проверяем что это изображение
		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Пожалуйста, выберите изображение из папки проекта /image (JPG, PNG, WebP, GIF)', 'error' );
			return;
		}

		// Проверяем размер файла (максимум 10 МБ)
		const maxSize = 10 * 1024 * 1024;
		if ( file.size > maxSize ) {
			const sizeMB = ( file.size / 1024 / 1024 ).toFixed( 1 );
			API.showNotification( `Файл слишком большой (${sizeMB} МБ). Максимальный размер: 10 МБ`, 'error' );
			return;
		}

		console.log( '📁 Выбран файл:', {
			name: file.name,
			type: file.type,
			size: ( file.size / 1024 ).toFixed( 1 ) + ' KB'
		} );

		// Сохраняем файл для возможности последующего скачивания
		this.selectedFile = file;

		// Формируем путь к файлу
		const imagePath = `/image/${file.name}`;
		const imageUrlInput = document.getElementById( 'productImageUrl' );

		// Записываем путь в поле ввода
		if ( imageUrlInput ) {
			imageUrlInput.value = imagePath;
		}

		// Показываем превью через Object URL
		const objectUrl = URL.createObjectURL( file );
		this.updateImagePreview( objectUrl );

		// Показываем подсказку и кнопку скачивания
		const uploadHint = document.getElementById( 'uploadHint' );
		const downloadBtn = document.getElementById( 'downloadUploadedBtn' );

		if ( uploadHint ) uploadHint.style.display = 'block';
		if ( downloadBtn ) downloadBtn.style.display = 'inline-block';

		// Информируем пользователя
		API.showNotification(
			`📁 Файл "${file.name}" выбран. Нажмите "📥 Скачать файл" и переместите его в папку /image/ проекта.`,
			'warning'
		);

		// Очищаем input для возможности повторного выбора того же файла
		const folderFile = document.getElementById( 'imageFolderFile' );
		if ( folderFile ) folderFile.value = '';
	}

	/**
	 * Скачивает выбранный файл на компьютер пользователя
	 * Используется когда файл нужно вручную скопировать в папку /image/
	 * 
	 * @param {File} file - Файл для скачивания
	 */
	downloadFile( file ) {
		// Создаём временный URL для файла
		const url = URL.createObjectURL( file );

		// Создаём невидимую ссылку для скачивания
		const a = document.createElement( 'a' );
		a.href = url;
		a.download = file.name;
		document.body.appendChild( a );
		a.click();

		// Очищаем
		document.body.removeChild( a );
		URL.revokeObjectURL( url );

		API.showNotification(
			`📥 Файл "${file.name}" скачан. Переместите его в папку /image/ проекта.`,
			'success'
		);
	}

	/**
	 * Обновляет превью изображения
	 * 
	 * Поддерживаемые форматы:
	 * - blob: URL (предпросмотр выбранного файла)
	 * - data: URI (base64)
	 * - http/https URL (внешние изображения)
	 * - /image/ путь (локальные файлы — проверяет существование)
	 * 
	 * @param {string} src - Источник изображения
	 */
	updateImagePreview( src ) {
		const previewContainer = document.getElementById( 'imagePreviewContainer' );
		const previewImg = document.getElementById( 'imagePreviewImg' );
		const previewError = previewContainer?.querySelector( '.preview-error' );

		// Скрываем предыдущую ошибку
		if ( previewError ) previewError.style.display = 'none';

		// Если источник пустой — скрываем превью
		if ( !src || !src.trim() ) {
			if ( previewContainer ) previewContainer.style.display = 'none';
			if ( previewImg ) {
				// Освобождаем blob URL если был
				if ( previewImg.src.startsWith( 'blob:' ) ) {
					URL.revokeObjectURL( previewImg.src );
				}
				previewImg.src = '';
				previewImg.style.display = 'block';
			}
			return;
		}

		// Показываем контейнер превью
		if ( previewContainer ) previewContainer.style.display = 'block';

		if ( previewImg ) {
			previewImg.style.display = 'block';

			// Для blob: URL (предпросмотр выбранного файла) — показываем сразу
			if ( src.startsWith( 'blob:' ) || src.startsWith( 'data:' ) ) {
				previewImg.src = src;
				return;
			}

			// Для внешних URL — показываем сразу, браузер сам обработает ошибку
			if ( src.startsWith( 'http://' ) || src.startsWith( 'https://' ) ) {
				previewImg.src = src;
				return;
			}

			// Для локальных путей — проверяем существование файла
			const testImg = new Image();
			testImg.onload = () => {
				previewImg.src = src;
				if ( previewError ) previewError.style.display = 'none';
				previewImg.style.display = 'block';
			};
			testImg.onerror = () => {
				console.warn( '⚠️ Изображение не найдено по пути:', src );
				previewImg.style.display = 'none';
				if ( previewError ) {
					previewError.style.display = 'flex';
				}
			};
			testImg.src = src;
		}
	}

	/**
	 * Очищает превью изображения
	 * Освобождает blob URL если был создан
	 */
	clearImagePreview() {
		const previewContainer = document.getElementById( 'imagePreviewContainer' );
		const previewImg = document.getElementById( 'imagePreviewImg' );
		const previewError = previewContainer?.querySelector( '.preview-error' );

		if ( previewContainer ) previewContainer.style.display = 'none';

		if ( previewImg ) {
			// Освобождаем память от blob: URL
			if ( previewImg.src.startsWith( 'blob:' ) ) {
				URL.revokeObjectURL( previewImg.src );
			}
			previewImg.src = '';
			previewImg.style.display = 'block';
		}

		if ( previewError ) previewError.style.display = 'none';
	}

	// ========================================================================
	// 9. ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// ========================================================================

	/**
	 * Безопасное экранирование HTML-спецсимволов
	 * Защита от XSS при вставке пользовательских данных
	 * 
	 * @param {string} text - Исходный текст
	 * @returns {string} Экранированный текст
	 */
	escapeHtml( text ) {
		if ( !text ) return '';

		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};

		return String( text ).replace( /[&<>"']/g, char => map[char] || char );
	}
}

// ========================================================================
// 10. ЗАПУСК МОДУЛЯ
// ========================================================================

/**
 * Создаём глобальный экземпляр ProductManager
 * Доступен из любого скрипта как window.productManager
 */
window.productManager = new ProductManager();

console.log( '✅ ProductManager: модуль загружен и готов к работе' );