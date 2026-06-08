/**
 * ============================================================================
 * PRODUCT-MANAGEMENT.JS — УПРАВЛЕНИЕ ТОВАРАМИ И СЛАЙДАМИ (АДМИНКА)
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Отображение списка товаров с фильтрацией и сортировкой
 * - Добавление / редактирование / удаление товаров
 * - Добавление / редактирование / удаление промо-слайдов
 * - Управление изображениями (URL, путь к файлу, загрузка с ПК)
 * - Группировка товаров по категориям
 * - Интеграция с глобальным store (localStorage)
 * 
 * ИСТОЧНИКИ ИЗОБРАЖЕНИЙ (для товаров и слайдов):
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
		 * ID текущего редактируемого слайда
		 * null = создание нового слайда
		 * string = редактирование существующего
		 * @type {string|null}
		 */
		this.currentSlideId = null;

		/**
		 * Текущий выбранный файл для товара (для возможности скачивания)
		 * Сохраняется чтобы пользователь мог скачать файл после выбора
		 * @type {File|null}
		 */
		this.selectedFile = null;

		/**
		 * Текущий выбранный файл для слайда (для возможности скачивания)
		 * Сохраняется чтобы пользователь мог скачать файл после выбора
		 * @type {File|null}
		 */
		this.selectedSlideFile = null;

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
	 * Главный метод инициализации менеджера товаров и слайдов
	 * Выполняет:
	 * 1. Рендеринг списка товаров
	 * 2. Рендеринг списка слайдов
	 * 3. Привязку обработчиков событий (кнопки, фильтры, формы)
	 * 4. Инициализацию вкладок формы товара (Основное / Цена / Изображение)
	 * 5. Инициализацию системы выбора изображений для товаров
	 * 6. Инициализацию системы выбора изображений для слайдов
	 * 7. Подписку на глобальные события обновления товаров
	 */
	init() {
		console.log( '📦 ProductManager: начало инициализации...' );

		// Шаг 1: Отображаем список товаров
		this.renderProducts();

		// Шаг 2: Отображаем список слайдов
		this.renderSlidesList();

		// Шаг 3: Привязываем обработчики событий
		this.bindEvents();

		// Шаг 4: Инициализируем вкладки формы товара
		this.initFormTabs();

		// Шаг 5: Инициализируем выбор изображений для товаров
		this.initImageUpload();

		// Шаг 6: Инициализируем выбор изображений для слайдов
		this.initSlideImageUpload();

		// Шаг 7: Подписываемся на глобальное событие обновления товаров
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
	 * Сбрасывает все товары и слайды до демо-набора
	 * Запрашивает подтверждение перед удалением
	 * Показывает индикатор загрузки во время процесса
	 */
	resetDemoData() {
		if ( !confirm( '⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ текущие товары и слайды и восстановит стандартные демо-данные. Вы уверены?' ) ) {
			return;
		}

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
			this.renderSlidesList();
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
	 */
	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		if ( !grid ) {
			console.error( '❌ ProductManager: элемент productsGrid не найден в DOM' );
			return;
		}

		const filters = this.getFilters();
		let products = store.getProducts( filters );
		products = this.sortProducts( products );

		if ( products.length === 0 ) {
			grid.innerHTML = this.getEmptyStateHTML();
			return;
		}

		const groupedProducts = this.groupProductsByCategory( products );
		grid.innerHTML = this.renderGroupedProducts( groupedProducts );
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
		if ( this.currentSort.by === 'default' ) {
			return products;
		}

		return [...products].sort( ( a, b ) => {
			let comparison = 0;

			switch ( this.currentSort.by ) {
				case 'name':
					comparison = a.name.localeCompare( b.name, 'ru' );
					break;
				case 'price':
					comparison = a.price - b.price;
					break;
				case 'quantity':
					comparison = a.quantity - b.quantity;
					break;
				default:
					return 0;
			}

			return this.currentSort.order === 'asc' ? comparison : -comparison;
		} );
	}

	/**
	 * Группирует товары по категориям
	 * @param {Array} products - Массив товаров
	 * @returns {Object} Объект {категория: [товары]}
	 */
	groupProductsByCategory( products ) {
		const grouped = {};

		const categoryOrder = [
			'figures', 'tea', 'sweets', 'manga', 'clothing',
			'tableware', 'games', 'stationery', 'cosmetics',
			'decor', 'anime', 'music', 'other'
		];

		products.forEach( product => {
			const category = product.category || 'other';
			if ( !grouped[category] ) {
				grouped[category] = [];
			}
			grouped[category].push( product );
		} );

		const sortedGrouped = {};
		categoryOrder.forEach( cat => {
			if ( grouped[cat] && grouped[cat].length > 0 ) {
				sortedGrouped[cat] = grouped[cat];
			}
		} );

		Object.keys( grouped ).forEach( cat => {
			if ( !sortedGrouped[cat] ) {
				sortedGrouped[cat] = grouped[cat];
			}
		} );

		return sortedGrouped;
	}

	/**
	 * Рендерит HTML для сгруппированных товаров
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
		const cartItem = store.cart.find( item => item.id === product.id );
		const inCartQuantity = cartItem ? cartItem.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-badges">
                    ${product.isNew ? '<span class="badge new">Новинка</span>' : ''}
                    ${product.isHit ? '<span class="badge hit">Хит</span>' : ''}
                    ${product.oldPrice ? '<span class="badge sale">Скидка</span>' : ''}
                </div>
                <div class="product-image">
                    <img src="${API.getSafeImageUrl( product.image )}" 
                         alt="${this.escapeHtml( product.name )}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='${API.getFallbackSvg( product.name )}'">
                </div>
                <div class="product-info">
                    <div class="product-category">${store.getCategoryName( product.category )}</div>
                    <div class="product-name">${this.escapeHtml( product.name )}</div>
                    <div class="product-sku">Артикул: ${product.sku || 'Нет'}</div>
                    ${product.col ? `<div class="product-col">Коллекция: ${this.escapeHtml( product.col )}</div>` : ''}
                    <div class="product-description">${this.escapeHtml( product.description || 'Нет описания' )}</div>
                    <div class="product-price">
                        <span class="current-price">${API.formatPrice( product.price )}</span>
                        ${product.oldPrice ? `<span class="old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas ${product.status === 'in-stock' ? 'fa-check-circle in-stock' : 'fa-times-circle out-of-stock'}"></i>
                        <span class="${product.status === 'in-stock' ? 'in-stock' : 'out-of-stock'}">
                            ${product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии'}
                        </span>
                        ${product.quantity > 0 ? `<span class="product-quantity">${availableQuantity} шт.</span>` : ''}
                    </div>
                </div>
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
	 */
	attachProductEvents() {
		document.querySelectorAll( '.edit-btn' ).forEach( btn => {
			btn.onclick = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				this.openModal( e.currentTarget.dataset.id );
			};
		} );

		document.querySelectorAll( '.delete-btn' ).forEach( btn => {
			btn.onclick = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				this.openDeleteModal( e.currentTarget.dataset.id );
			};
		} );

		document.querySelectorAll( '.category-group-toggle' ).forEach( btn => {
			btn.onclick = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const group = e.currentTarget.closest( '.category-group' );
				if ( group ) {
					group.classList.toggle( 'collapsed' );
					const icon = e.currentTarget.querySelector( 'i' );
					if ( icon ) {
						icon.className = group.classList.contains( 'collapsed' )
							? 'fas fa-chevron-down'
							: 'fas fa-chevron-up';
					}
				}
			};
		} );
	}

	// ========================================================================
	// 4. ФИЛЬТРЫ И СОРТИРОВКА
	// ========================================================================

	/**
	 * Привязывает обработчики событий ко всем элементам управления
	 */
	bindEvents() {
		console.log( '🔗 ProductManager: привязка событий...' );

		// Кнопка добавления товара
		const addBtn = document.getElementById( 'addProductBtn' );
		if ( addBtn ) {
			addBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.openModal();
			} );
		}

		// Поле поиска
		const searchInput = document.getElementById( 'searchInput' );
		if ( searchInput ) {
			searchInput.addEventListener( 'input', () => this.renderProducts() );
		}

		// Фильтр по категории
		const categoryFilter = document.getElementById( 'categoryFilter' );
		if ( categoryFilter ) {
			categoryFilter.addEventListener( 'change', () => this.renderProducts() );
		}

		// Фильтр по статусу
		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.addEventListener( 'change', () => this.renderProducts() );
		}

		// Сортировка
		const sortBy = document.getElementById( 'sortBy' );
		if ( sortBy ) {
			sortBy.addEventListener( 'change', ( e ) => {
				const parts = e.target.value.split( '-' );
				this.currentSort.by = parts[0];
				this.currentSort.order = parts[1] || 'asc';
				this.updateSortOrderIcon();
				this.renderProducts();
			} );
		}

		// Кнопка направления сортировки
		const sortOrderBtn = document.getElementById( 'sortOrderBtn' );
		if ( sortOrderBtn ) {
			sortOrderBtn.addEventListener( 'click', () => {
				this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
				const sortBySelect = document.getElementById( 'sortBy' );
				if ( sortBySelect && this.currentSort.by !== 'default' ) {
					sortBySelect.value = `${this.currentSort.by}-${this.currentSort.order}`;
				}
				this.updateSortOrderIcon();
				this.renderProducts();
			} );
		}

		// Закрытие модальных окон
		const closeButtons = [
			'closeModal', 'cancelModalBtn',
			'closeDeleteModal', 'cancelDeleteBtn',
			'closePromoSlideModal', 'cancelPromoSlideBtn',
			'closeDeletePromoSlideModal', 'cancelDeletePromoSlideBtn'
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

		// Подтверждение удаления товара
		const confirmDeleteBtn = document.getElementById( 'confirmDeleteBtn' );
		if ( confirmDeleteBtn ) {
			confirmDeleteBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.confirmDelete();
			} );
		}

		// Подтверждение удаления слайда
		// const confirmDeleteSlideBtn = document.getElementById( 'confirmDeletePromoSlideBtn' );
		// if ( confirmDeleteSlideBtn ) {
		// 	confirmDeleteSlideBtn.addEventListener( 'click', ( e ) => {
		// 		e.preventDefault();
		// 		this.confirmDeleteSlide();
		// 	} );
		// }

		// Отправка формы товара
		const productForm = document.getElementById( 'productForm' );
		if ( productForm ) {
			productForm.addEventListener( 'submit', ( e ) => {
				e.preventDefault();
				this.saveProduct();
			} );
		}

		// // Кнопка сохранения слайда
		// const saveSlideBtn = document.getElementById( 'savePromoSlideBtn' );
		// if ( saveSlideBtn ) {
		// 	saveSlideBtn.addEventListener( 'click', ( e ) => {
		// 		e.preventDefault();
		// 		this.saveSlide();
		// 	} );
		// }

		// // Кнопка добавления слайда
		// const addSlideBtn = document.getElementById( 'addPromoSlideBtn' );
		// if ( addSlideBtn ) {
		// 	addSlideBtn.addEventListener( 'click', ( e ) => {
		// 		e.preventDefault();
		// 		this.openSlideModal();
		// 	} );
		// }

		// Кнопка сброса демо-данных
		const resetDemoBtn = document.getElementById( 'resetDemoDataBtn' );
		if ( resetDemoBtn ) {
			resetDemoBtn.addEventListener( 'click', () => this.resetDemoData() );
		}

		// Закрытие модального окна при клике вне его
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
	// 5. РАБОТА С МОДАЛЬНЫМИ ОКНАМИ ТОВАРОВ
	// ========================================================================

	/**
	 * Открывает модальное окно для добавления или редактирования товара
	 * @param {string|null} productId - ID товара для редактирования, null для создания нового
	 */
	openModal( productId = null ) {
		console.log( '📦 ProductManager: открытие модального окна товара, productId:', productId );

		const modal = document.getElementById( 'productModal' );
		if ( !modal ) {
			console.error( '❌ Модальное окно productModal не найдено в DOM' );
			return;
		}

		const title = document.getElementById( 'modalTitle' );
		const form = document.getElementById( 'productForm' );

		// Сбрасываем форму и состояние
		if ( form ) {
			form.reset();
			this.clearImagePreview();
			this.selectedFile = null;
			form.querySelectorAll( 'input[type="checkbox"]' ).forEach( checkbox => {
				checkbox.checked = false;
			} );
		}

		// Сбрасываем вкладки источника на URL
		const urlTab = document.querySelector( '#productForm .source-tab[data-source="url"]' );
		if ( urlTab ) urlTab.click();

		// Скрываем подсказку загрузки
		const uploadHint = document.getElementById( 'uploadHint' );
		const downloadBtn = document.getElementById( 'downloadUploadedBtn' );
		if ( uploadHint ) uploadHint.style.display = 'none';
		if ( downloadBtn ) downloadBtn.style.display = 'none';

		// Устанавливаем ID текущего товара
		this.currentProductId = productId;

		// Заполняем форму если редактируем
		if ( productId ) {
			const product = store.getProduct( productId );
			if ( product ) {
				if ( title ) title.innerHTML = '<i class="fas fa-edit"></i> Редактировать товар';
				this.fillForm( product );
			} else {
				console.error( '❌ Товар с ID', productId, 'не найден' );
				return;
			}
		} else {
			if ( title ) title.innerHTML = '<i class="fas fa-plus"></i> Добавить товар';
		}

		// Активируем первую вкладку (Основное)
		const firstTab = document.querySelector( '#productForm .form-tab' );
		if ( firstTab ) firstTab.click();

		// Показываем модальное окно
		modal.classList.add( 'show' );
	}

	/**
	 * Закрывает все открытые модальные окна и сбрасывает состояние
	 */
	closeAllModals() {
		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.classList.remove( 'show' );
		} );

		// Освобождаем blob URL
		const previewImg = document.getElementById( 'imagePreviewImg' );
		if ( previewImg && previewImg.src.startsWith( 'blob:' ) ) {
			URL.revokeObjectURL( previewImg.src );
		}
		const slidePreviewImg = document.getElementById( 'slidePreviewImage' );
		if ( slidePreviewImg && slidePreviewImg.src.startsWith( 'blob:' ) ) {
			URL.revokeObjectURL( slidePreviewImg.src );
		}

		// Сбрасываем все ID и временные данные
		this.currentProductId = null;
		this.currentSlideId = null;
		this.selectedFile = null;
		this.selectedSlideFile = null;
	}

	/**
	 * Заполняет форму данными товара для редактирования
	 * @param {Object} product - Объект товара из store
	 */
	fillForm( product ) {
		console.log( '📝 ProductManager: заполнение формы для товара:', product.name );

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

		Object.entries( fields ).forEach( ( [id, value] ) => {
			const element = document.getElementById( id );
			if ( element ) element.value = value || '';
		} );

		document.getElementById( 'productIsNew' ).checked = product.isNew || false;
		document.getElementById( 'productIsHit' ).checked = product.isHit || false;

		if ( product.image ) {
			this.updateImagePreview( product.image );
		}

		// Если изображение внешнее — переключаем на вкладку URL
		if ( product.image && ( product.image.startsWith( 'http://' ) || product.image.startsWith( 'https://' ) ) ) {
			const urlTab = document.querySelector( '#productForm .source-tab[data-source="url"]' );
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

		document.getElementById( 'deleteProductName' ).textContent = product.name;
		this.currentProductId = productId;
		document.getElementById( 'deleteModal' ).classList.add( 'show' );
	}

	/**
	 * Подтверждает и выполняет удаление товара
	 */
	confirmDelete() {
		if ( !this.currentProductId ) return;

		const product = store.getProduct( this.currentProductId );
		const productName = product ? product.name : 'Неизвестный товар';

		store.deleteProduct( this.currentProductId );
		console.log( '🗑️ Удалён товар:', productName );
		API.showNotification( `Товар "${productName}" удалён`, 'success' );
		this.closeAllModals();
	}

	// ========================================================================
	// 6. СОХРАНЕНИЕ ТОВАРА
	// ========================================================================

	/**
	 * Сохраняет товар (создаёт новый или обновляет существующий)
	 */
	saveProduct() {
		console.log( '💾 ProductManager: сохранение товара...' );

		const nameInput = document.getElementById( 'productName' );
		const priceInput = document.getElementById( 'productPrice' );
		const imageUrlInput = document.getElementById( 'productImageUrl' );

		if ( !nameInput || !priceInput ) {
			console.error( '❌ Не найдены обязательные поля формы' );
			return;
		}

		// Валидация названия
		const productName = nameInput.value.trim();
		if ( !productName ) {
			API.showNotification( 'Введите название товара', 'error' );
			nameInput.focus();
			return;
		}

		// Валидация цены
		const productPrice = parseFloat( priceInput.value );
		if ( !priceInput.value || isNaN( productPrice ) || productPrice <= 0 ) {
			API.showNotification( 'Введите корректную цену (больше 0)', 'error' );
			priceInput.focus();
			return;
		}

		// Получаем изображение
		let imageUrl = imageUrlInput?.value.trim() || '';

		if ( !imageUrl ) {
			imageUrl = '/image/placeholder.jpg';
			console.warn( '⚠️ Изображение не указано, используется заглушка' );
		}

		// Корректируем путь если нужно
		if ( !imageUrl.startsWith( 'http://' ) && !imageUrl.startsWith( 'https://' ) &&
			!imageUrl.startsWith( '/image/' ) && !imageUrl.startsWith( 'data:' ) && !imageUrl.startsWith( '/' ) ) {
			imageUrl = '/image/' + imageUrl.replace( /^\/+/, '' );
		}

		// Собираем данные
		const productData = {
			name: productName,
			category: document.getElementById( 'productCategory' )?.value || 'other',
			sku: document.getElementById( 'productSKU' )?.value.trim() || '',
			col: document.getElementById( 'productCOL' )?.value.trim() || '',
			description: document.getElementById( 'productDescription' )?.value.trim() || '',
			price: productPrice,
			oldPrice: parseFloat( document.getElementById( 'productOldPrice' )?.value ) || 0,
			status: document.getElementById( 'productStatus' )?.value || 'in-stock',
			quantity: parseInt( document.getElementById( 'productQuantity' )?.value ) || 0,
			isNew: document.getElementById( 'productIsNew' )?.checked || false,
			isHit: document.getElementById( 'productIsHit' )?.checked || false,
			image: imageUrl
		};

		console.log( '📦 Данные для сохранения:', JSON.stringify( productData, null, 2 ) );

		// Сохраняем через store
		try {
			if ( this.currentProductId ) {
				console.log( '✏️ Обновление товара с ID:', this.currentProductId );
				store.updateProduct( this.currentProductId, productData );
				API.showNotification( '✅ Товар обновлён!', 'success' );
			} else {
				console.log( '➕ Создание нового товара' );
				store.addProduct( productData );
				API.showNotification( '✅ Товар добавлен!', 'success' );
			}

			this.closeAllModals();
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
	 */
	initFormTabs() {
		const tabs = document.querySelectorAll( '.form-tab' );

		tabs.forEach( tab => {
			tab.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				tabs.forEach( t => t.classList.remove( 'active' ) );
				tab.classList.add( 'active' );

				const tabName = tab.dataset.tab;
				document.querySelectorAll( '.form-tab-content' ).forEach( content => {
					content.classList.toggle( 'active', content.dataset.tab === tabName );
				} );
			} );
		} );

		console.log( '📑 ProductManager: вкладки формы инициализированы' );
	}

	// ========================================================================
	// 8. ВЫБОР ИЗОБРАЖЕНИЙ ДЛЯ ТОВАРОВ
	// ========================================================================

	/**
	 * Инициализирует систему выбора изображений для товаров
	 */
	initImageUpload() {
		console.log( '🖼️ ProductManager: инициализация выбора изображений для товаров...' );

		const folderUpload = document.getElementById( 'imageFolderUpload' );
		const folderFile = document.getElementById( 'imageFolderFile' );
		const imageUrlInput = document.getElementById( 'productImageUrl' );
		const clearBtn = document.getElementById( 'clearPreviewBtn' );
		const downloadBtn = document.getElementById( 'downloadUploadedBtn' );
		const uploadHint = document.getElementById( 'uploadHint' );

		// Переключение вкладок источника
		document.querySelectorAll( '#productForm .source-tab' ).forEach( tab => {
			tab.addEventListener( 'click', () => {
				document.querySelectorAll( '#productForm .source-tab' ).forEach( t => t.classList.remove( 'active' ) );
				document.querySelectorAll( '#productForm .image-source-content' ).forEach( c => c.classList.remove( 'active' ) );

				tab.classList.add( 'active' );
				const targetContent = document.querySelector( `#productForm .image-source-content[data-source="${tab.dataset.source}"]` );
				if ( targetContent ) targetContent.classList.add( 'active' );

				if ( tab.dataset.source === 'url' ) {
					this.selectedFile = null;
					if ( downloadBtn ) downloadBtn.style.display = 'none';
					if ( uploadHint ) uploadHint.style.display = 'none';
				}
			} );
		} );

		// URL / Путь
		if ( imageUrlInput ) {
			imageUrlInput.addEventListener( 'input', ( e ) => this.updateImagePreview( e.target.value.trim() ) );
			imageUrlInput.addEventListener( 'paste', () => {
				setTimeout( () => this.updateImagePreview( imageUrlInput.value.trim() ), 100 );
			} );
		}

		// Загрузка с ПК
		if ( folderUpload && folderFile ) {
			folderUpload.addEventListener( 'click', () => folderFile.click() );

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
				if ( e.dataTransfer.files[0] ) this.handleFileSelect( e.dataTransfer.files[0] );
			} );

			folderFile.addEventListener( 'change', ( e ) => {
				if ( e.target.files[0] ) this.handleFileSelect( e.target.files[0] );
			} );
		}

		// Кнопка очистки
		if ( clearBtn ) {
			clearBtn.addEventListener( 'click', () => {
				if ( imageUrlInput ) imageUrlInput.value = '';
				this.selectedFile = null;
				this.clearImagePreview();
				if ( downloadBtn ) downloadBtn.style.display = 'none';
				if ( uploadHint ) uploadHint.style.display = 'none';
			} );
		}

		// Кнопка скачивания
		if ( downloadBtn ) {
			downloadBtn.addEventListener( 'click', () => {
				if ( this.selectedFile ) this.downloadFile( this.selectedFile );
			} );
		}

		console.log( '✅ ProductManager: система выбора изображений для товаров готова' );
	}

	/**
	 * Обрабатывает выбор файла с компьютера для товара
	 * @param {File} file - Выбранный файл
	 */
	handleFileSelect( file ) {
		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Пожалуйста, выберите изображение (JPG, PNG, WebP, GIF)', 'error' );
			return;
		}

		const maxSize = 10 * 1024 * 1024;
		if ( file.size > maxSize ) {
			API.showNotification( `Файл слишком большой (${( file.size / 1024 / 1024 ).toFixed( 1 )} МБ). Максимальный размер: 10 МБ`, 'error' );
			return;
		}

		console.log( '📁 Выбран файл для товара:', file.name );

		this.selectedFile = file;

		const imagePath = `/image/${file.name}`;
		const imageUrlInput = document.getElementById( 'productImageUrl' );
		if ( imageUrlInput ) imageUrlInput.value = imagePath;

		const objectUrl = URL.createObjectURL( file );
		this.updateImagePreview( objectUrl );

		const uploadHint = document.getElementById( 'uploadHint' );
		const downloadBtn = document.getElementById( 'downloadUploadedBtn' );
		if ( uploadHint ) uploadHint.style.display = 'block';
		if ( downloadBtn ) downloadBtn.style.display = 'inline-block';

		API.showNotification(
			`📁 Файл "${file.name}" выбран. Нажмите "📥 Скачать файл" и переместите его в папку /image/ проекта.`,
			'warning'
		);

		document.getElementById( 'imageFolderFile' ).value = '';
	}

	/**
	 * Скачивает выбранный файл на компьютер пользователя
	 * @param {File} file - Файл для скачивания
	 */
	downloadFile( file ) {
		const url = URL.createObjectURL( file );
		const a = document.createElement( 'a' );
		a.href = url;
		a.download = file.name;
		document.body.appendChild( a );
		a.click();
		document.body.removeChild( a );
		URL.revokeObjectURL( url );

		API.showNotification(
			`📥 Файл "${file.name}" скачан. Переместите его в папку /image/ проекта.`,
			'success'
		);
	}

	/**
	 * Обновляет превью изображения товара
	 * @param {string} src - Источник изображения
	 */
	updateImagePreview( src ) {
		const previewContainer = document.getElementById( 'imagePreviewContainer' );
		const previewImg = document.getElementById( 'imagePreviewImg' );
		const previewError = previewContainer?.querySelector( '.preview-error' );

		if ( previewError ) previewError.style.display = 'none';

		if ( !src || !src.trim() ) {
			if ( previewContainer ) previewContainer.style.display = 'none';
			if ( previewImg ) {
				if ( previewImg.src.startsWith( 'blob:' ) ) URL.revokeObjectURL( previewImg.src );
				previewImg.src = '';
				previewImg.style.display = 'block';
			}
			return;
		}

		if ( previewContainer ) previewContainer.style.display = 'block';

		if ( previewImg ) {
			previewImg.style.display = 'block';

			if ( src.startsWith( 'blob:' ) || src.startsWith( 'data:' ) || src.startsWith( 'http://' ) || src.startsWith( 'https://' ) ) {
				previewImg.src = src;
				return;
			}

			const testImg = new Image();
			testImg.onload = () => {
				previewImg.src = src;
				if ( previewError ) previewError.style.display = 'none';
				previewImg.style.display = 'block';
			};
			testImg.onerror = () => {
				console.warn( '⚠️ Изображение не найдено по пути:', src );
				previewImg.style.display = 'none';
				if ( previewError ) previewError.style.display = 'flex';
			};
			testImg.src = src;
		}
	}

	/**
	 * Очищает превью изображения товара
	 */
	clearImagePreview() {
		const previewContainer = document.getElementById( 'imagePreviewContainer' );
		const previewImg = document.getElementById( 'imagePreviewImg' );
		const previewError = previewContainer?.querySelector( '.preview-error' );

		if ( previewContainer ) previewContainer.style.display = 'none';

		if ( previewImg ) {
			if ( previewImg.src.startsWith( 'blob:' ) ) URL.revokeObjectURL( previewImg.src );
			previewImg.src = '';
			previewImg.style.display = 'block';
		}

		if ( previewError ) previewError.style.display = 'none';
	}

	// ========================================================================
	// 9. ВЫБОР ИЗОБРАЖЕНИЙ ДЛЯ СЛАЙДОВ
	// ========================================================================

	/**
	 * Инициализирует систему выбора изображений для слайдов
	 */
	initSlideImageUpload() {
		console.log( '🖼️ Слайды: инициализация выбора изображений...' );

		const uploadArea = document.getElementById( 'slideImageFolderUpload' );
		const fileInput = document.getElementById( 'slideImageFileInput' );
		const imageUrlInput = document.getElementById( 'slideImageUrl' );
		const clearBtn = document.getElementById( 'slideClearPreviewBtn' );
		const downloadBtn = document.getElementById( 'slideDownloadBtn' );
		const uploadHint = document.getElementById( 'slideUploadHint' );
		const sourceTabs = document.querySelectorAll( '#slideImageSourceTabs .source-tab' );

		if ( !uploadArea && !imageUrlInput ) {
			console.log( '🖼️ Слайды: элементы не найдены (модалка не открыта), инициализация отложена' );
			return;
		}

		// Переключение вкладок источника
		sourceTabs.forEach( tab => {
			tab.addEventListener( 'click', () => {
				sourceTabs.forEach( t => t.classList.remove( 'active' ) );
				document.querySelectorAll( '#promoSlideForm .image-source-content' ).forEach( c => c.classList.remove( 'active' ) );

				tab.classList.add( 'active' );
				const target = document.querySelector( `#promoSlideForm .image-source-content[data-source="${tab.dataset.source}"]` );
				if ( target ) target.classList.add( 'active' );

				if ( tab.dataset.source === 'url' ) {
					this.selectedSlideFile = null;
					if ( downloadBtn ) downloadBtn.style.display = 'none';
					if ( uploadHint ) uploadHint.style.display = 'none';
				}
			} );
		} );

		// URL / Путь
		if ( imageUrlInput ) {
			imageUrlInput.addEventListener( 'input', () => this.updateSlidePreview( imageUrlInput.value.trim() ) );
			imageUrlInput.addEventListener( 'paste', () => setTimeout( () => this.updateSlidePreview( imageUrlInput.value.trim() ), 100 ) );
		}

		// Загрузка с ПК
		if ( uploadArea && fileInput ) {
			uploadArea.addEventListener( 'click', () => fileInput.click() );

			uploadArea.addEventListener( 'dragover', ( e ) => {
				e.preventDefault();
				uploadArea.style.borderColor = '#ff3366';
				uploadArea.style.background = 'rgba(255, 51, 102, 0.1)';
			} );
			uploadArea.addEventListener( 'dragleave', () => {
				uploadArea.style.borderColor = '#333';
				uploadArea.style.background = '#0d0d0d';
			} );
			uploadArea.addEventListener( 'drop', ( e ) => {
				e.preventDefault();
				uploadArea.style.borderColor = '#333';
				uploadArea.style.background = '#0d0d0d';
				if ( e.dataTransfer.files[0] ) this.handleSlideFileSelect( e.dataTransfer.files[0] );
			} );

			fileInput.addEventListener( 'change', ( e ) => {
				if ( e.target.files[0] ) this.handleSlideFileSelect( e.target.files[0] );
			} );
		}

		// Очистка
		if ( clearBtn ) {
			clearBtn.addEventListener( 'click', () => {
				if ( imageUrlInput ) imageUrlInput.value = '';
				this.selectedSlideFile = null;
				this.clearSlidePreview();
				if ( downloadBtn ) downloadBtn.style.display = 'none';
				if ( uploadHint ) uploadHint.style.display = 'none';
			} );
		}

		// Скачивание
		if ( downloadBtn ) {
			downloadBtn.addEventListener( 'click', () => {
				if ( this.selectedSlideFile ) this.downloadSlideFile( this.selectedSlideFile );
			} );
		}

		console.log( '✅ Слайды: система выбора изображений готова' );
	}

	/**
	 * Обрабатывает выбор файла для слайда
	 * @param {File} file - Выбранный файл
	 */
	handleSlideFileSelect( file ) {
		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Выберите изображение (JPG, PNG, WebP, GIF)', 'error' );
			return;
		}

		if ( file.size > 10 * 1024 * 1024 ) {
			API.showNotification( `Файл слишком большой (${( file.size / 1024 / 1024 ).toFixed( 1 )} МБ)`, 'error' );
			return;
		}

		console.log( '📁 Слайд: выбран файл:', file.name );
		this.selectedSlideFile = file;

		const imagePath = `/image/${file.name}`;
		const imageUrlInput = document.getElementById( 'slideImageUrl' );
		if ( imageUrlInput ) imageUrlInput.value = imagePath;

		this.updateSlidePreview( URL.createObjectURL( file ) );

		const uploadHint = document.getElementById( 'slideUploadHint' );
		const downloadBtn = document.getElementById( 'slideDownloadBtn' );
		if ( uploadHint ) uploadHint.style.display = 'block';
		if ( downloadBtn ) downloadBtn.style.display = 'inline-block';

		API.showNotification( `📁 Файл "${file.name}" выбран. Нажмите "📥 Скачать файл"`, 'warning' );

		document.getElementById( 'slideImageFileInput' ).value = '';
	}

	/**
	 * Скачивает файл слайда
	 * @param {File} file - Файл для скачивания
	 */
	downloadSlideFile( file ) {
		const url = URL.createObjectURL( file );
		const a = document.createElement( 'a' );
		a.href = url;
		a.download = file.name;
		document.body.appendChild( a );
		a.click();
		document.body.removeChild( a );
		URL.revokeObjectURL( url );
		API.showNotification( `📥 Файл "${file.name}" скачан. Переместите в /image/`, 'success' );
	}

	/**
	 * Обновляет превью слайда (АНАЛОГИЧНО ТОВАРАМ)
	 * @param {string} src - Источник изображения
	 */
	updateSlidePreview( src ) {
		const previewContainer = document.getElementById( 'slidePreviewContainer' );
		const previewImg = document.getElementById( 'slidePreviewImage' );
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
	 * Очищает превью слайда
	 */
	clearSlidePreview() {
		const container = document.getElementById( 'slidePreviewContainer' );
		const img = document.getElementById( 'slidePreviewImage' );
		if ( container ) container.style.display = 'none';
		if ( img ) {
			if ( img.src.startsWith( 'blob:' ) ) URL.revokeObjectURL( img.src );
			img.src = '';
			img.style.display = 'block';
		}
	}

	// ========================================================================
	// 10. РАБОТА С МОДАЛЬНЫМИ ОКНАМИ СЛАЙДОВ
	// ========================================================================

	/**
	 * Открывает модальное окно для добавления или редактирования слайда
	 * @param {string|null} slideId - ID слайда или null для нового
	 */
	openSlideModal( slideId = null ) {
		console.log( '🎠 openSlideModal: вход, slideId =', slideId );
		console.log( '🎠 openSlideModal: тип slideId =', typeof slideId );

		const modal = document.getElementById( 'promoSlideModal' );
		if ( !modal ) {
			console.error( '❌ Модальное окно promoSlideModal не найдено' );
			return;
		}

		const title = document.getElementById( 'promoSlideModalTitle' );
		const form = document.getElementById( 'promoSlideForm' );

		// Сбрасываем форму
		if ( form ) {
			form.reset();
			this.clearSlidePreview();
			this.selectedSlideFile = null;
		}

		// Сбрасываем вкладки источника на URL
		const urlTab = document.querySelector( '#slideImageSourceTabs .source-tab[data-source="url"]' );
		if ( urlTab ) urlTab.click();

		// Скрываем подсказку загрузки
		const uploadHint = document.getElementById( 'slideUploadHint' );
		const downloadBtn = document.getElementById( 'slideDownloadBtn' );
		if ( uploadHint ) uploadHint.style.display = 'none';
		if ( downloadBtn ) downloadBtn.style.display = 'none';

		// ===== ВАЖНО: Устанавливаем ID слайда =====
		this.currentSlideId = slideId;
		console.log( '🎠 openSlideModal: this.currentSlideId установлен в =', this.currentSlideId );
		console.log( '🎠 openSlideModal: тип this.currentSlideId =', typeof this.currentSlideId );

		// Заполняем форму если редактируем
		if ( slideId ) {
			const slide = store.getPromoSlide( slideId );
			console.log( '🎠 openSlideModal: слайд из store =', slide );
			if ( slide ) {
				if ( title ) title.innerHTML = '<i class="fas fa-edit"></i> Редактировать слайд';
				this.fillSlideForm( slide );
			} else {
				console.error( '❌ Слайд с ID', slideId, 'не найден в store' );
				return;
			}
		} else {
			if ( title ) title.innerHTML = '<i class="fas fa-plus"></i> Добавить слайд';
		}

		modal.classList.add( 'show' );
		console.log( '🎠 openSlideModal: выход, this.currentSlideId =', this.currentSlideId );
	}

	/**
	 * Сохраняет слайд (создаёт новый или обновляет существующий)
	 */
	saveSlide() {
		console.log( '🎠 saveSlide: вход' );
		console.log( '🎠 saveSlide: this.currentSlideId =', this.currentSlideId );
		console.log( '🎠 saveSlide: тип this.currentSlideId =', typeof this.currentSlideId );
		console.log( '🎠 saveSlide: this.currentSlideId truthy?', !!this.currentSlideId );

		const title = document.getElementById( 'slideTitle' )?.value.trim();
		const description = document.getElementById( 'slideDescription' )?.value.trim();
		const imageUrlInput = document.getElementById( 'slideImageUrl' );

		// Валидация
		if ( !title ) {
			API.showNotification( 'Введите заголовок слайда', 'error' );
			return;
		}
		if ( !description ) {
			API.showNotification( 'Введите описание слайда', 'error' );
			return;
		}

		// Получаем изображение
		let imageUrl = imageUrlInput?.value.trim() || '';

		if ( !imageUrl ) {
			API.showNotification( 'Укажите изображение для слайда (URL или загрузите файл)', 'error' );
			return;
		}

		// Корректируем путь если нужно
		if ( !imageUrl.startsWith( 'http://' ) && !imageUrl.startsWith( 'https://' ) &&
			!imageUrl.startsWith( '/image/' ) && !imageUrl.startsWith( 'data:' ) && !imageUrl.startsWith( 'blob:' ) ) {
			imageUrl = '/image/' + imageUrl.replace( /^\/+/, '' );
		}

		// Собираем данные
		const slideData = {
			title: title,
			description: description,
			price: document.getElementById( 'slidePrice' )?.value.trim() || '',
			link: document.getElementById( 'slideLink' )?.value.trim() || '',
			image: imageUrl,
			order: parseInt( document.getElementById( 'slideOrder' )?.value ) || 0,
			status: document.getElementById( 'slideStatus' )?.value || 'active'
		};

		console.log( '🎠 saveSlide: slideData =', JSON.stringify( slideData, null, 2 ) );

		// ===== ПРОВЕРЯЕМ currentSlideId =====
		if ( this.currentSlideId ) {
			// Редактирование существующего слайда
			console.log( '✏️ saveSlide: ОБНОВЛЕНИЕ слайда с ID:', this.currentSlideId );
			store.updatePromoSlide( this.currentSlideId, slideData );
			API.showNotification( '✅ Слайд обновлён!', 'success' );
		} else {
			// Создание нового слайда
			console.log( '➕ saveSlide: СОЗДАНИЕ нового слайда (currentSlideId пуст!)' );
			store.addPromoSlide( slideData );
			API.showNotification( '✅ Слайд добавлен!', 'success' );
		}

		console.log( '🎠 saveSlide: перед закрытием, this.currentSlideId =', this.currentSlideId );
		this.closeAllModals();
		console.log( '🎠 saveSlide: после закрытия, this.currentSlideId =', this.currentSlideId );
		this.renderSlidesList();
	}

	/**
	 * Закрывает все открытые модальные окна и сбрасывает состояние
	 */
	closeAllModals() {
		console.log( '🔒 closeAllModals: вход, this.currentSlideId =', this.currentSlideId );

		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.classList.remove( 'show' );
		} );

		// Освобождаем blob URL
		const previewImg = document.getElementById( 'imagePreviewImg' );
		if ( previewImg && previewImg.src.startsWith( 'blob:' ) ) {
			URL.revokeObjectURL( previewImg.src );
		}
		const slidePreviewImg = document.getElementById( 'slidePreviewImage' );
		if ( slidePreviewImg && slidePreviewImg.src.startsWith( 'blob:' ) ) {
			URL.revokeObjectURL( slidePreviewImg.src );
		}

		// Сбрасываем все ID и временные данные
		console.log( '🔒 closeAllModals: сброс currentSlideId (было =', this.currentSlideId, ')' );
		this.currentProductId = null;
		this.currentSlideId = null;
		this.selectedFile = null;
		this.selectedSlideFile = null;
		console.log( '🔒 closeAllModals: currentSlideId сброшен в null' );
	}

	// ========================================================================
	// 11. СОХРАНЕНИЕ СЛАЙДА
	// ========================================================================

	/**
	 * Сохраняет слайд (создаёт новый или обновляет существующий)
	 * 
	 * ИСПРАВЛЕНО: Теперь проверяет this.currentSlideId и вызывает
	 * store.updatePromoSlide() для редактирования вместо создания нового.
	 */
	saveSlide() {
		console.log( '🎠 ProductManager: сохранение слайда...' );
		console.log( '🎠 ProductManager: currentSlideId =', this.currentSlideId );

		const title = document.getElementById( 'slideTitle' )?.value.trim();
		const description = document.getElementById( 'slideDescription' )?.value.trim();
		const imageUrlInput = document.getElementById( 'slideImageUrl' );

		// Валидация
		if ( !title ) {
			API.showNotification( 'Введите заголовок слайда', 'error' );
			return;
		}
		if ( !description ) {
			API.showNotification( 'Введите описание слайда', 'error' );
			return;
		}

		// Получаем изображение
		let imageUrl = imageUrlInput?.value.trim() || '';

		if ( !imageUrl ) {
			API.showNotification( 'Укажите изображение для слайда (URL или загрузите файл)', 'error' );
			return;
		}

		// Корректируем путь если нужно
		if ( !imageUrl.startsWith( 'http://' ) && !imageUrl.startsWith( 'https://' ) &&
			!imageUrl.startsWith( '/image/' ) && !imageUrl.startsWith( 'data:' ) && !imageUrl.startsWith( 'blob:' ) ) {
			imageUrl = '/image/' + imageUrl.replace( /^\/+/, '' );
		}

		// Собираем данные
		const slideData = {
			title: title,
			description: description,
			price: document.getElementById( 'slidePrice' )?.value.trim() || '',
			link: document.getElementById( 'slideLink' )?.value.trim() || '',
			image: imageUrl,
			order: parseInt( document.getElementById( 'slideOrder' )?.value ) || 0,
			status: document.getElementById( 'slideStatus' )?.value || 'active'
		};

		console.log( '🎠 Данные слайда:', JSON.stringify( slideData, null, 2 ) );

		// ===== ИСПРАВЛЕНО: Проверяем currentSlideId =====
		if ( this.currentSlideId ) {
			// Редактирование существующего слайда
			console.log( '✏️ Обновление слайда с ID:', this.currentSlideId );
			store.updatePromoSlide( this.currentSlideId, slideData );
			API.showNotification( '✅ Слайд обновлён!', 'success' );
		} else {
			// Создание нового слайда
			console.log( '➕ Создание нового слайда' );
			store.addPromoSlide( slideData );
			API.showNotification( '✅ Слайд добавлен!', 'success' );
		}

		this.closeAllModals();
		this.renderSlidesList();
	}

	// ========================================================================
	// 12. ОТОБРАЖЕНИЕ СЛАЙДОВ
	// ========================================================================

	/**
	 * Рендерит список промо-слайдов в админке
	 */
	renderSlidesList() {
		const container = document.getElementById( 'promoSlidesList' );
		if ( !container ) return;

		const slides = store.getPromoSlides();

		if ( slides.length === 0 ) {
			container.innerHTML = '<div class="loading-slides">Нет слайдов. Добавьте первый слайд!</div>';
			return;
		}

		container.innerHTML = slides.map( slide => this.renderSlideItem( slide ) ).join( '' );
		this.attachSlideEvents();
	}

	/**
	 * Создаёт HTML одного элемента слайда
	 * @param {Object} slide - Объект слайда
	 * @returns {string} HTML-строка
	 */
	renderSlideItem( slide ) {
		const statusBadge = slide.status === 'active'
			? '<span class="slide-status-badge active">Активен</span>'
			: '<span class="slide-status-badge inactive">Неактивен</span>';

		return `
            <div class="slide-item" data-id="${slide.id}">
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="slide-preview">
                    <img src="${API.getSafeImageUrl( slide.image )}" 
                         alt="${this.escapeHtml( slide.title )}"
                         onerror="this.src='/image/placeholder.jpg'">
                </div>
                <div class="slide-info">
                    <div class="slide-title">${this.escapeHtml( slide.title )}</div>
                    <div class="slide-description">${this.escapeHtml( slide.description )}</div>
                    ${slide.price ? `<div class="slide-price">${this.escapeHtml( slide.price )}</div>` : ''}
                </div>
                <div class="slide-order">#${slide.order || 0}</div>
                <div class="slide-status">${statusBadge}</div>
                <div class="slide-actions">
                    <button class="slide-action-btn edit-slide" data-id="${slide.id}" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="slide-action-btn delete-slide" data-id="${slide.id}" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
	}

	/**
	 * Привязывает обработчики к кнопкам в списке слайдов
	 */
	attachSlideEvents() {
		document.querySelectorAll( '.edit-slide' ).forEach( btn => {
			btn.onclick = ( e ) => {
				e.preventDefault();
				this.openSlideModal( e.currentTarget.dataset.id );
			};
		} );

		document.querySelectorAll( '.delete-slide' ).forEach( btn => {
			btn.onclick = ( e ) => {
				e.preventDefault();
				this.openDeleteSlideModal( e.currentTarget.dataset.id );
			};
		} );
	}

	// ========================================================================
	// 13. ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// ========================================================================

	/**
	 * Безопасное экранирование HTML-спецсимволов
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
// 14. ЗАПУСК МОДУЛЯ
// ========================================================================

window.productManager = new ProductManager();

console.log( '✅ ProductManager: модуль загружен и готов к работе' );