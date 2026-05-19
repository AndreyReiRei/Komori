/**
 * ProductManager - класс для управления товарами (админка)
 * Для сайта "Комори" - азиатский магазинчик
 * 
 * Основные функции:
 * - Отображение списка товаров с фильтрацией и сортировкой
 * - Добавление/редактирование/удаление товаров
 * - Управление изображениями (только пути, без base64)
 * - Группировка товаров по категориям
 */

class ProductManager {
	constructor() {
		console.log( 'ProductManager инициализируется...' );

		// ID текущего редактируемого товара (null = создание нового)
		this.currentProductId = null;

		// Объект для хранения текущих настроек сортировки
		this.currentSort = {
			by: 'default',
			order: 'asc'
		};

		// Ждем загрузку DOM перед инициализацией
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', () => this.init() );
		} else {
			this.init();
		}
	}

	/**
	 * Инициализация менеджера
	 */
	init() {
		console.log( 'ProductManager инициализация...' );

		this.renderProducts();      // Отображаем список товаров
		this.bindEvents();          // Привязываем обработчики событий
		this.initFormTabs();        // Инициализируем вкладки формы
		this.initImageUpload();     // Инициализируем выбор изображений

		// Слушаем глобальное событие обновления товаров
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( 'Товары обновлены, перерисовываем...' );
			this.renderProducts();
		} );

		console.log( 'ProductManager готов!' );
	}

	/**
	 * Сброс демо-данных (упрощенная версия)
	 */
	resetDemoData() {
		if ( confirm( '⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ текущие товары и восстановит стандартные демо-товары. Вы уверены?' ) ) {

			this.showResetLoader();

			// Удаляем версии
			localStorage.removeItem( 'komori_demo_version' );
			localStorage.removeItem( 'komori_slides_version' );

			// Удаляем данные
			localStorage.removeItem( 'komori_products' );
			localStorage.removeItem( 'komori_promo_slides' );

			// Очищаем store
			store.products = [];
			store.promoSlides = [];

			// Восстанавливаем демо-данные
			store.addDemoProductsIfNeeded();
			store.addDemoSlidesIfNeeded();

			setTimeout( () => {
				this.renderProducts();
				API.showNotification( '✅ Демо-данные восстановлены! Обновите страницу.', 'success' );
				this.hideResetLoader();

				setTimeout( () => {
					location.reload();
				}, 1500 );
			}, 500 );
		}
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

	// ==================== ОТОБРАЖЕНИЕ ТОВАРОВ С ГРУППИРОВКОЙ ====================

	/**
	 * Рендерит список товаров, сгруппированный по категориям
	 */
	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		if ( !grid ) {
			console.error( 'Элемент productsGrid не найден' );
			return;
		}

		// Получаем текущие значения фильтров
		const filters = this.getFilters();

		// Получаем товары из хранилища с применением фильтров
		let products = store.getProducts( filters );

		// Применяем сортировку
		products = this.sortProducts( products );

		// Если товаров нет - показываем пустое состояние
		if ( products.length === 0 ) {
			grid.innerHTML = this.getEmptyStateHTML();
			return;
		}

		// Группируем товары по категориям
		const groupedProducts = this.groupProductsByCategory( products );

		// Рендерим товары с группировкой
		grid.innerHTML = this.renderGroupedProducts( groupedProducts );

		// Привязываем обработчики к кнопкам
		this.attachProductEvents();
	}

	/**
	 * Получает текущие значения фильтров
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
	 * Сортирует массив товаров
	 */
	sortProducts( products ) {
		if ( this.currentSort.by === 'default' ) return products;

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
	 */
	groupProductsByCategory( products ) {
		const grouped = {};

		const categoryOrder = [
			'figures', 'tea', 'sweets', 'manga', 'clothing',
			'tableware', 'games', 'stationery', 'cosmetics',
			'decor', 'anime', 'music', 'other'
		];

		products.forEach( product => {
			const category = product.category;
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
	 * Рендерит сгруппированные товары
	 */
	renderGroupedProducts( groupedProducts ) {
		let html = '';
		let isFirst = true;  // Флаг для первой группы

		for ( const [categoryKey, products] of Object.entries( groupedProducts ) ) {
			if ( products.length === 0 ) continue;

			const categoryName = store.getCategoryName( categoryKey );
			const categoryIcon = this.getCategoryIcon( categoryKey );

			// Первая группа - без класса collapsed, остальные - с collapsed
			const collapsedClass = isFirst ? '' : 'collapsed';
			// Иконка: у первой стрелка вверх, у остальных - вниз
			const chevronClass = isFirst ? 'fa-chevron-up' : 'fa-chevron-down';

			html += `
			<div class="category-group ${collapsedClass}" data-category="${categoryKey}">
				<div class="category-group-header">
					<div class="category-group-title">
						<i class="fas ${categoryIcon}"></i>
						<h2>${categoryName}</h2>
					</div>
					<button class="category-group-toggle" data-category="${categoryKey}">
						<i class="fas ${chevronClass}"></i>
					</button>
				</div>
				<div class="category-group-products">
					<div class="products-grid-inner">
						${products.map( product => this.renderProductCard( product ) ).join( '' )}
					</div>
				</div>
			</div>
		`;

			isFirst = false;  // После первой группы сбрасываем флаг
		}

		return html;
	}


	/**
	 * Возвращает иконку для категории
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
	 * HTML для пустого состояния
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
	 * Создает HTML карточки товара
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
                        alt="${product.name}"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='${API.getFallbackSvg( product.name )}'">
                </div>
                <div class="product-info">
                    <div class="product-category">${store.getCategoryName( product.category )}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-sku">Артикул: ${product.sku || 'Нет'}</div>
					${product.col ? `<div class="product-col">Коллекция: ${product.col}</div>` : ''}
                    <div class="product-description">${product.description || 'Нет описания'}</div>
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
	 * Привязывает обработчики к кнопкам в карточках
	 */
	attachProductEvents() {
		// Обработчики для кнопок "Редактировать"
		document.querySelectorAll( '.edit-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleEdit );
			this.handleEdit = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;
				this.openModal( id );
			};
			btn.addEventListener( 'click', this.handleEdit );
		} );

		// Обработчики для кнопок "Удалить"
		document.querySelectorAll( '.delete-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleDelete );
			this.handleDelete = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;
				this.openDeleteModal( id );
			};
			btn.addEventListener( 'click', this.handleDelete );
		} );

		// Обработчики для сворачивания/разворачивания групп категорий
		document.querySelectorAll( '.category-group-toggle' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleGroupToggle );
			this.handleGroupToggle = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const toggleBtn = e.currentTarget;
				const group = toggleBtn.closest( '.category-group' );
				if ( group ) {
					group.classList.toggle( 'collapsed' );
					const icon = toggleBtn.querySelector( 'i' );
					if ( icon ) {
						icon.className = group.classList.contains( 'collapsed' ) ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
					}
				}
			};
			btn.addEventListener( 'click', this.handleGroupToggle );
		} );
	}

	// ==================== ФИЛЬТРЫ И СОРТИРОВКА ====================

	/**
	 * Привязывает обработчики событий к элементам управления
	 */
	bindEvents() {
		console.log( 'Привязка событий...' );

		// ===== Кнопка добавления товара =====
		const addBtn = document.getElementById( 'addProductBtn' );
		if ( addBtn ) {
			addBtn.removeEventListener( 'click', this.handleAddClick );
			this.handleAddClick = ( e ) => {
				e.preventDefault();
				this.openModal();
			};
			addBtn.addEventListener( 'click', this.handleAddClick );
		} else {
			console.warn( 'Кнопка addProductBtn не найдена' );
		}

		// ===== Поле поиска (событие input - при каждом вводе символа) =====
		const searchInput = document.getElementById( 'searchInput' );
		if ( searchInput ) {
			searchInput.removeEventListener( 'input', this.handleSearch );
			this.handleSearch = () => this.renderProducts();
			searchInput.addEventListener( 'input', this.handleSearch );
		}

		// ===== Фильтр по категории =====
		const categoryFilter = document.getElementById( 'categoryFilter' );
		if ( categoryFilter ) {
			categoryFilter.removeEventListener( 'change', this.handleFilterChange );
			this.handleFilterChange = () => this.renderProducts();
			categoryFilter.addEventListener( 'change', this.handleFilterChange );
		}

		// ===== Фильтр по статусу (наличие) =====
		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.removeEventListener( 'change', this.handleFilterChange );
			this.handleFilterChange = () => this.renderProducts();
			statusFilter.addEventListener( 'change', this.handleFilterChange );
		}

		// ===== Выбор типа сортировки =====
		const sortBy = document.getElementById( 'sortBy' );
		if ( sortBy ) {
			sortBy.removeEventListener( 'change', this.handleSortChange );
			this.handleSortChange = ( e ) => {
				const value = e.target.value;
				const parts = value.split( '-' );
				const sortByField = parts[0];
				const sortOrder = parts[1] || 'asc';

				this.currentSort.by = sortByField;
				this.currentSort.order = sortOrder;
				this.updateSortOrderIcon();
				this.renderProducts();
			};
			sortBy.addEventListener( 'change', this.handleSortChange );
		}

		// ===== Кнопка переключения направления сортировки =====
		const sortOrderBtn = document.getElementById( 'sortOrderBtn' );
		if ( sortOrderBtn ) {
			sortOrderBtn.removeEventListener( 'click', this.handleSortOrder );
			this.handleSortOrder = () => {
				const sortBySelect = document.getElementById( 'sortBy' );
				const currentValue = sortBySelect ? sortBySelect.value : 'default';

				if ( currentValue === 'default' ) {
					this.currentSort.by = 'name';
					this.currentSort.order = 'asc';
					if ( sortBySelect ) sortBySelect.value = 'name-asc';
				} else {
					this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
					if ( sortBySelect && this.currentSort.by !== 'default' ) {
						sortBySelect.value = `${this.currentSort.by}-${this.currentSort.order}`;
					}
				}
				this.updateSortOrderIcon();
				this.renderProducts();
			};
			sortOrderBtn.addEventListener( 'click', this.handleSortOrder );
		}

		// ===== Закрытие модальных окон =====
		const closeButtons = ['closeModal', 'cancelModalBtn', 'closeDeleteModal', 'cancelDeleteBtn'];
		closeButtons.forEach( id => {
			const btn = document.getElementById( id );
			if ( btn ) {
				btn.removeEventListener( 'click', this.handleClose );
				this.handleClose = ( e ) => {
					e.preventDefault();
					this.closeAllModals();
				};
				btn.addEventListener( 'click', this.handleClose );
			}
		} );

		// ===== Подтверждение удаления товара =====
		const confirmDeleteBtn = document.getElementById( 'confirmDeleteBtn' );
		if ( confirmDeleteBtn ) {
			confirmDeleteBtn.removeEventListener( 'click', this.handleConfirmDelete );
			this.handleConfirmDelete = ( e ) => {
				e.preventDefault();
				this.confirmDelete();
			};
			confirmDeleteBtn.addEventListener( 'click', this.handleConfirmDelete );
		}

		// ===== Отправка формы товара (добавление/редактирование) =====
		const productForm = document.getElementById( 'productForm' );
		if ( productForm ) {
			productForm.removeEventListener( 'submit', this.handleFormSubmit );
			this.handleFormSubmit = ( e ) => {
				e.preventDefault();
				this.saveProduct();
			};
			productForm.addEventListener( 'submit', this.handleFormSubmit );
		}

		// ===== КНОПКА СБРОСА ДЕМО-ДАННЫХ =====
		const resetDemoBtn = document.getElementById( 'resetDemoDataBtn' );
		if ( resetDemoBtn ) {
			resetDemoBtn.removeEventListener( 'click', this.handleResetDemo );
			this.handleResetDemo = () => {
				this.resetDemoData();
			};
			resetDemoBtn.addEventListener( 'click', this.handleResetDemo );
		}

		// ===== Закрытие модального окна при клике вне его =====
		window.removeEventListener( 'click', this.handleOutsideClick );
		this.handleOutsideClick = ( e ) => {
			if ( e.target.classList.contains( 'modal' ) ) {
				this.closeAllModals();
			}
		};
		window.addEventListener( 'click', this.handleOutsideClick );
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

	// ==================== РАБОТА С МОДАЛЬНЫМИ ОКНАМИ ====================

	/**
	 * Открывает модальное окно для добавления/редактирования товара
	 */
	openModal( productId = null ) {
		console.log( 'Открытие модального окна, productId:', productId );

		const modal = document.getElementById( 'productModal' );
		if ( !modal ) {
			console.error( 'Модальное окно productModal не найдено' );
			alert( 'Ошибка: модальное окно не найдено. Проверьте HTML' );
			return;
		}

		const title = document.getElementById( 'modalTitle' );
		const form = document.getElementById( 'productForm' );

		// Сбрасываем форму
		if ( form ) {
			form.reset();
			this.clearImagePreview();
			form.querySelectorAll( 'input, select, textarea' ).forEach( input => {
				if ( input.type === 'checkbox' ) {
					input.checked = false;
				}
			} );
		}

		this.currentProductId = productId;

		// Если редактируем существующий товар - заполняем форму данными
		if ( productId ) {
			const product = store.getProduct( productId );
			if ( product ) {
				if ( title ) title.textContent = 'Редактировать товар';
				this.fillForm( product );
			}
		} else {
			if ( title ) title.textContent = 'Добавить товар';
		}

		// Активируем первую вкладку
		const firstTab = document.querySelector( '.form-tab' );
		if ( firstTab ) firstTab.click();

		modal.classList.add( 'show' );
	}

	/**
	 * Закрывает все открытые модальные окна
	 */
	closeAllModals() {
		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.classList.remove( 'show' );
		} );
		this.currentProductId = null;
	}

	/**
	 * Заполняет форму данными товара для редактирования
	 */
	fillForm( product ) {
		// Заполнение текстовых полей
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

		// Заполнение чекбоксов
		const isNewCheck = document.getElementById( 'productIsNew' );
		if ( isNewCheck ) isNewCheck.checked = product.isNew || false;

		const isHitCheck = document.getElementById( 'productIsHit' );
		if ( isHitCheck ) isHitCheck.checked = product.isHit || false;

		// Обновляем превью изображения
		this.updateImagePreview( product.image );
	}

	/**
	 * Сохраняет товар (добавляет новый или обновляет существующий)
	 */
	saveProduct() {
		console.log( 'Сохранение товара...' );

		const nameInput = document.getElementById( 'productName' );
		const priceInput = document.getElementById( 'productPrice' );

		// Валидация обязательных полей
		if ( !nameInput || !priceInput ) {
			console.error( 'Не найдены обязательные поля' );
			API.showNotification( 'Ошибка: не найдены обязательные поля', 'error' );
			return;
		}

		if ( !nameInput.value.trim() ) {
			API.showNotification( 'Введите название товара', 'error' );
			return;
		}

		if ( !priceInput.value || parseFloat( priceInput.value ) <= 0 ) {
			API.showNotification( 'Введите корректную цену', 'error' );
			return;
		}

		// Получаем путь к изображению (только путь, без base64!)
		const imageUrl = document.getElementById( 'productImageUrl' )?.value.trim() || '';

		if ( !imageUrl ) {
			API.showNotification( 'Укажите путь к изображению', 'error' );
			return;
		}

		// Проверяем, что это не base64 (не data:image)
		if ( imageUrl.startsWith( 'data:image' ) ) {
			API.showNotification( '❌ Пожалуйста, используйте путь к файлу из папки /image/, а не загруженный файл. Это экономит место.', 'error' );
			return;
		}

		// Собираем данные из формы
		const productData = {
			name: nameInput.value.trim(),
			category: document.getElementById( 'productCategory' )?.value || 'other',
			sku: document.getElementById( 'productSKU' )?.value.trim() || '',
			col: document.getElementById( 'productCOL' )?.value.trim() || '',
			price: parseFloat( priceInput.value ) || 0,
			oldPrice: parseFloat( document.getElementById( 'productOldPrice' )?.value ) || 0,
			description: document.getElementById( 'productDescription' )?.value.trim() || '',
			status: document.getElementById( 'productStatus' )?.value || 'in-stock',
			quantity: parseInt( document.getElementById( 'productQuantity' )?.value ) || 0,
			isNew: document.getElementById( 'productIsNew' )?.checked || false,
			isHit: document.getElementById( 'productIsHit' )?.checked || false,
			image: imageUrl
		};

		console.log( 'Сохраняемые данные:', productData );

		// Сохраняем через store
		if ( this.currentProductId ) {
			store.updateProduct( this.currentProductId, productData );
			API.showNotification( 'Товар обновлен', 'success' );
		} else {
			store.addProduct( productData );
			API.showNotification( 'Товар добавлен', 'success' );
		}

		this.closeAllModals();
	}

	/**
	 * Открывает модальное окно подтверждения удаления товара
	 */
	openDeleteModal( productId ) {
		const product = store.getProduct( productId );
		if ( !product ) return;

		const nameSpan = document.getElementById( 'deleteProductName' );
		if ( nameSpan ) {
			nameSpan.textContent = product.name;
		}

		this.currentProductId = productId;

		const deleteModal = document.getElementById( 'deleteModal' );
		if ( deleteModal ) {
			deleteModal.classList.add( 'show' );
		} else {
			console.error( 'Модальное окно deleteModal не найдено' );
		}
	}

	/**
	 * Подтверждает и выполняет удаление товара
	 */
	confirmDelete() {
		if ( this.currentProductId ) {
			store.deleteProduct( this.currentProductId );
			API.showNotification( 'Товар удален', 'success' );
			this.closeAllModals();
		}
	}

	// ==================== ВКЛАДКИ ФОРМЫ ====================

	/**
	 * Инициализирует переключение вкладок в форме добавления/редактирования товара
	 */
	initFormTabs() {
		const tabs = document.querySelectorAll( '.form-tab' );

		tabs.forEach( tab => {
			tab.addEventListener( 'click', ( e ) => {
				e.preventDefault();

				// Убираем активный класс со всех вкладок
				tabs.forEach( t => t.classList.remove( 'active' ) );
				tab.classList.add( 'active' );

				// Показываем соответствующий контент вкладки
				const tabName = tab.dataset.tab;
				document.querySelectorAll( '.form-tab-content' ).forEach( content => {
					content.classList.toggle( 'active', content.dataset.tab === tabName );
				} );
			} );
		} );
	}

	// ==================== ВЫБОР ИЗОБРАЖЕНИЙ (УНИВЕРСАЛЬНЫЙ) ====================

	/**
	 * Инициализирует выбор изображений (только пути, без base64)
	 */
	initImageUpload() {
		const folderUpload = document.getElementById( 'imageFolderUpload' );
		const folderFile = document.getElementById( 'imageFolderFile' );
		const imageUrl = document.getElementById( 'productImageUrl' );
		const clearBtn = document.getElementById( 'clearPreviewBtn' );

		// Клик по области загрузки
		if ( folderUpload && folderFile ) {
			folderUpload.addEventListener( 'click', () => {
				folderFile.click();
			} );

			// Выбор файла
			folderFile.addEventListener( 'change', ( e ) => {
				const file = e.target.files[0];
				if ( !file ) return;

				// Проверяем, что это изображение
				if ( !file.type.startsWith( 'image/' ) ) {
					API.showNotification( 'Пожалуйста, выберите изображение', 'error' );
					return;
				}

				// Получаем имя файла и формируем путь
				const fileName = file.name;
				const imagePath = `/image/${fileName}`;

				// Устанавливаем путь в поле ввода
				if ( imageUrl ) {
					imageUrl.value = imagePath;
					// Триггерим событие input для обновления превью
					imageUrl.dispatchEvent( new Event( 'input' ) );
				}

				API.showNotification( `Путь установлен: ${imagePath}`, 'success' );

				// Очищаем input, чтобы можно было выбрать тот же файл повторно
				folderFile.value = '';
			} );
		}

		// Обновление превью при вводе пути вручную
		if ( imageUrl ) {
			imageUrl.addEventListener( 'input', ( e ) => {
				this.updateImagePreview( e.target.value );
			} );
		}

		// Кнопка очистки
		if ( clearBtn ) {
			clearBtn.addEventListener( 'click', () => {
				if ( imageUrl ) imageUrl.value = '';
				this.clearImagePreview();
				API.showNotification( 'Изображение очищено', 'info' );
			} );
		}
	}

	/**
	 * Обновляет превью изображения
	 * @param {string} src - путь к изображению
	 */
	updateImagePreview( src ) {
		const previewContainer = document.getElementById( 'imagePreviewContainer' );
		const previewImg = document.getElementById( 'imagePreviewImg' );

		if ( !src || !src.trim() ) {
			if ( previewContainer ) previewContainer.style.display = 'none';
			if ( previewImg ) previewImg.src = '';
			return;
		}

		// Проверяем, что изображение существует
		const testImg = new Image();
		testImg.onload = () => {
			if ( previewImg ) {
				previewImg.src = src;
				if ( previewContainer ) previewContainer.style.display = 'block';
			}
		};
		testImg.onerror = () => {
			console.warn( 'Изображение не найдено:', src );
			if ( previewImg ) {
				previewImg.src = '';
				if ( previewContainer ) previewContainer.style.display = 'none';
			}
		};
		testImg.src = src;
	}

	/**
	 * Очищает превью изображения
	 */
	clearImagePreview() {
		const previewContainer = document.getElementById( 'imagePreviewContainer' );
		const previewImg = document.getElementById( 'imagePreviewImg' );

		if ( previewContainer ) previewContainer.style.display = 'none';
		if ( previewImg ) previewImg.src = '';
	}
}

// Создаем глобальный экземпляр
window.productManager = new ProductManager();