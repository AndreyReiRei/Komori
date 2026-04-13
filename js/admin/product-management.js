/**
 * ProductManager - класс для управления товарами (админка)
 * Для сайта "Комори" - азиатский магазинчик
 * 
 * Основные функции:
 * - Отображение списка товаров с фильтрацией и сортировкой
 * - Добавление/редактирование/удаление товаров
 * - Управление изображениями товаров
 */

class ProductManager {
	constructor() {
		console.log( 'ProductManager инициализируется...' );

		// ID текущего редактируемого товара (null = создание нового)
		this.currentProductId = null;

		// Объект для хранения текущих настроек сортировки
		// by: поле для сортировки (name, price, quantity, default)
		// order: направление сортировки (asc - по возрастанию, desc - по убыванию)
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
	 * Вызывается после загрузки DOM
	 */
	init() {
		console.log( 'ProductManager инициализация...' );

		this.renderProducts();      // Отображаем список товаров
		this.bindEvents();          // Привязываем обработчики событий
		this.initFormTabs();        // Инициализируем вкладки формы
		this.initImageUpload();     // Инициализируем загрузку изображений

		// Слушаем глобальное событие обновления товаров (из store.js)
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( 'Товары обновлены, перерисовываем...' );
			this.renderProducts();
		} );

		console.log( 'ProductManager готов!' );
	}

	// ==================== ОТОБРАЖЕНИЕ ТОВАРОВ ====================

	/**
	 * Рендерит список товаров на странице
	 * Получает фильтры, сортирует товары и отображает их в сетке
	 */
	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		if ( !grid ) {
			console.error( 'Элемент productsGrid не найден' );
			return;
		}

		// Получаем текущие значения фильтров из полей ввода
		const filters = this.getFilters();

		// Получаем товары из хранилища с применением фильтров
		let products = store.getProducts( filters );

		// Применяем сортировку к полученным товарам
		products = this.sortProducts( products );

		// Если товаров нет - показываем пустое состояние
		if ( products.length === 0 ) {
			grid.innerHTML = this.getEmptyStateHTML();
			return;
		}

		// Рендерим карточки товаров
		grid.innerHTML = products.map( product => this.renderProductCard( product ) ).join( '' );

		// Привязываем обработчики событий к кнопкам в карточках
		this.attachProductEvents();
	}

	/**
	 * Получает текущие значения фильтров из DOM-элементов
	 * @returns {Object} Объект с фильтрами (поиск, категория, статус)
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
	 * @param {Array} products - массив товаров для сортировки
	 * @returns {Array} Отсортированный массив товаров
	 */
	sortProducts( products ) {
		// Если сортировка по умолчанию - возвращаем исходный порядок
		if ( this.currentSort.by === 'default' ) return products;

		// Создаем копию массива, чтобы не мутировать оригинал
		return [...products].sort( ( a, b ) => {
			let comparison = 0;

			// Определяем поле для сравнения в зависимости от выбранной сортировки
			switch ( this.currentSort.by ) {
				case 'name':
					// Сортировка по названию (алфавитная)
					comparison = a.name.localeCompare( b.name, 'ru' );
					break;
				case 'price':
					// Сортировка по цене (числовое сравнение)
					comparison = a.price - b.price;
					break;
				case 'quantity':
					// Сортировка по количеству на складе
					comparison = a.quantity - b.quantity;
					break;
				default:
					return 0;
			}

			// Учитываем направление сортировки
			// asc (по возрастанию): оставляем как есть
			// desc (по убыванию): инвертируем результат
			return this.currentSort.order === 'asc' ? comparison : -comparison;
		} );
	}

	/**
	 * Возвращает HTML для пустого состояния (нет товаров)
	 * @returns {string} HTML-разметка пустого состояния
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
	 * Создает HTML-разметку для карточки товара
	 * @param {Object} product - объект с данными товара
	 * @returns {string} HTML-разметка карточки
	 */
	renderProductCard( product ) {
		// Вычисляем доступное количество (общее количество минус количество в корзине)
		const cartItem = store.cart.find( item => item.id === product.id );
		const inCartQuantity = cartItem ? cartItem.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		return `
            <div class="product-card" data-id="${product.id}">
                <!-- Бейджи товара (новинка, хит, скидка) -->
                <div class="product-badges">
                    ${product.isNew ? '<span class="badge new">Новинка</span>' : ''}
                    ${product.isHit ? '<span class="badge hit">Хит</span>' : ''}
                    ${product.oldPrice ? '<span class="badge sale">Скидка</span>' : ''}
                </div>
                <!-- Изображение товара -->
                <div class="product-image">
                    <img src="${API.getSafeImageUrl( product.image )}" 
                        alt="${product.name}"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='${API.getFallbackSvg( product.name )}'">
                </div>
                <!-- Информация о товаре -->
                <div class="product-info">
                    <div class="product-category">${store.getCategoryName( product.category )}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-sku">Артикул: ${product.sku || 'Нет'}</div>
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
                <!-- Кнопки действий с товаром -->
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
	 * (редактирование и удаление)
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
	}

	// ==================== ФИЛЬТРЫ И СОРТИРОВКА ====================

	/**
	 * Привязывает все обработчики событий к элементам управления
	 * (кнопки, поля ввода, селекты)
	 */
	bindEvents() {
		console.log( 'Привязка событий...' );

		// ----- Кнопка добавления товара -----
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

		// ----- Поле поиска (событие input - при каждом вводе символа) -----
		const searchInput = document.getElementById( 'searchInput' );
		if ( searchInput ) {
			searchInput.removeEventListener( 'input', this.handleSearch );
			this.handleSearch = () => this.renderProducts();
			searchInput.addEventListener( 'input', this.handleSearch );
		}

		// ----- Фильтр по категории -----
		const categoryFilter = document.getElementById( 'categoryFilter' );
		if ( categoryFilter ) {
			categoryFilter.removeEventListener( 'change', this.handleFilterChange );
			this.handleFilterChange = () => this.renderProducts();
			categoryFilter.addEventListener( 'change', this.handleFilterChange );
		}

		// ----- Фильтр по статусу (наличие) -----
		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.removeEventListener( 'change', this.handleFilterChange );
			this.handleFilterChange = () => this.renderProducts();
			statusFilter.addEventListener( 'change', this.handleFilterChange );
		}

		// ----- ИСПРАВЛЕНО: Выбор типа сортировки (по названию, цене, количеству) -----
		const sortBy = document.getElementById( 'sortBy' );
		if ( sortBy ) {
			sortBy.removeEventListener( 'change', this.handleSortChange );
			this.handleSortChange = ( e ) => {
				// Получаем значение из select (например: "price-asc", "name-desc")
				const value = e.target.value;

				// Разбиваем строку на [тип_сортировки, направление]
				// Если направление не указано (как в "default"), используем asc
				const parts = value.split( '-' );
				const sortByField = parts[0];           // "price", "name", "quantity" или "default"
				const sortOrder = parts[1] || 'asc';    // "asc" или "desc"

				// Сохраняем настройки сортировки
				this.currentSort.by = sortByField;
				this.currentSort.order = sortOrder;

				// Обновляем иконку на кнопке сортировки
				this.updateSortOrderIcon();

				// Перерисовываем товары с новыми настройками
				this.renderProducts();
			};
			sortBy.addEventListener( 'change', this.handleSortChange );
		}

		// ----- ИСПРАВЛЕНО: Кнопка переключения направления сортировки (возрастание/убывание) -----
		const sortOrderBtn = document.getElementById( 'sortOrderBtn' );
		if ( sortOrderBtn ) {
			sortOrderBtn.removeEventListener( 'click', this.handleSortOrder );
			this.handleSortOrder = () => {
				// НОВАЯ ЛОГИКА: проверяем, выбран ли тип сортировки
				const sortBySelect = document.getElementById( 'sortBy' );
				const currentValue = sortBySelect ? sortBySelect.value : 'default';

				// Если выбран "по умолчанию" - активируем сортировку по названию (А-Я)
				if ( currentValue === 'default' ) {
					// Устанавливаем сортировку по названию в порядке возрастания
					this.currentSort.by = 'name';
					this.currentSort.order = 'asc';

					// Обновляем select
					if ( sortBySelect ) {
						sortBySelect.value = 'name-asc';
					}
				} else {
					// Если уже выбрана какая-то сортировка - просто меняем направление
					this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';

					// Обновляем значение в select, сохраняя тип сортировки
					if ( sortBySelect && this.currentSort.by !== 'default' ) {
						const newValue = `${this.currentSort.by}-${this.currentSort.order}`;
						sortBySelect.value = newValue;
					}
				}

				// Обновляем иконку на кнопке
				this.updateSortOrderIcon();

				// Перерисовываем товары с новым направлением сортировки
				this.renderProducts();
			};
			sortOrderBtn.addEventListener( 'click', this.handleSortOrder );
		}

		// ----- Закрытие модальных окон -----
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

		// ----- Подтверждение удаления товара -----
		const confirmDeleteBtn = document.getElementById( 'confirmDeleteBtn' );
		if ( confirmDeleteBtn ) {
			confirmDeleteBtn.removeEventListener( 'click', this.handleConfirmDelete );
			this.handleConfirmDelete = ( e ) => {
				e.preventDefault();
				this.confirmDelete();
			};
			confirmDeleteBtn.addEventListener( 'click', this.handleConfirmDelete );
		}

		// ----- Отправка формы товара (добавление/редактирование) -----
		const productForm = document.getElementById( 'productForm' );
		if ( productForm ) {
			productForm.removeEventListener( 'submit', this.handleFormSubmit );
			this.handleFormSubmit = ( e ) => {
				e.preventDefault();
				this.saveProduct();
			};
			productForm.addEventListener( 'submit', this.handleFormSubmit );
		}

		// ----- Закрытие модального окна при клике вне его -----
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
			// Меняем иконку в зависимости от направления сортировки
			icon.className = this.currentSort.order === 'asc'
				? 'fas fa-arrow-up-wide-short'      // иконка для возрастания (А-Я, 0-9)
				: 'fas fa-arrow-down-wide-short';   // иконка для убывания (Я-А, 9-0)
		}
	}

	// ==================== РАБОТА С МОДАЛЬНЫМИ ОКНАМИ ====================

	/**
	 * Открывает модальное окно для добавления/редактирования товара
	 * @param {string|null} productId - ID товара для редактирования (null = создание нового)
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
			this.clearImagePreview();
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
	 * @param {Object} product - объект с данными товара
	 */
	fillForm( product ) {
		// Заполнение текстовых полей
		const fields = {
			'productName': product.name,
			'productCategory': product.category,
			'productSKU': product.sku,
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
		const nameInput = document.getElementById( 'productName' );
		const priceInput = document.getElementById( 'productPrice' );

		// Валидация обязательных полей
		if ( !nameInput || !priceInput ) {
			console.error( 'Не найдены обязательные поля' );
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

		// Собираем данные из формы
		const productData = {
			name: nameInput.value.trim(),
			category: document.getElementById( 'productCategory' )?.value || 'other',
			sku: document.getElementById( 'productSKU' )?.value.trim() || '',
			price: parseFloat( priceInput.value ) || 0,
			oldPrice: parseFloat( document.getElementById( 'productOldPrice' )?.value ) || 0,
			description: document.getElementById( 'productDescription' )?.value.trim() || '',
			status: document.getElementById( 'productStatus' )?.value || 'in-stock',
			quantity: parseInt( document.getElementById( 'productQuantity' )?.value ) || 0,
			isNew: document.getElementById( 'productIsNew' )?.checked || false,
			isHit: document.getElementById( 'productIsHit' )?.checked || false,
			image: document.getElementById( 'productImageUrl' )?.value.trim() || ''
		};

		// Сохраняем через store
		if ( this.currentProductId ) {
			store.updateProduct( this.currentProductId, productData );
			API.showNotification( 'Товар обновлен' );
		} else {
			store.addProduct( productData );
			API.showNotification( 'Товар добавлен' );
		}

		this.closeAllModals();
	}

	/**
	 * Открывает модальное окно подтверждения удаления товара
	 * @param {string} productId - ID товара для удаления
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
			API.showNotification( 'Товар удален' );
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

	// ==================== ЗАГРУЗКА ИЗОБРАЖЕНИЙ ====================

	/**
	 * Инициализирует функционал загрузки изображений
	 * (клик по области загрузки, выбор файла, предпросмотр)
	 */
	initImageUpload() {
		const uploadBtn = document.getElementById( 'uploadImageBtn' );
		const imageFile = document.getElementById( 'productImageFile' );
		const imageUrl = document.getElementById( 'productImageUrl' );

		// Загрузка через клик по области
		if ( uploadBtn && imageFile ) {
			uploadBtn.addEventListener( 'click', () => imageFile.click() );

			// Обработка выбранного файла
			imageFile.addEventListener( 'change', ( e ) => {
				const file = e.target.files[0];
				if ( file ) {
					API.handleImageUpload( file, ( dataUrl ) => {
						if ( imageUrl ) imageUrl.value = dataUrl;
						this.updateImagePreview( dataUrl );
					} );
				}
			} );
		}

		// Обновление превью при вводе URL
		if ( imageUrl ) {
			imageUrl.addEventListener( 'input', ( e ) => this.updateImagePreview( e.target.value ) );
		}
	}

	/**
	 * Обновляет превью изображения
	 * @param {string} src - URL или dataURL изображения
	 */
	updateImagePreview( src ) {
		const preview = document.getElementById( 'imagePreview' );
		if ( !preview ) return;

		const img = preview.querySelector( 'img' );
		const icon = preview.querySelector( 'i' );
		const span = preview.querySelector( 'span' );

		if ( src && src.trim() ) {
			// Показываем изображение, скрываем иконку и текст
			if ( img ) {
				img.src = src;
				img.style.display = 'block';
			}
			if ( icon ) icon.style.display = 'none';
			if ( span ) span.style.display = 'none';
		} else {
			// Показываем иконку и текст, скрываем изображение
			if ( img ) img.style.display = 'none';
			if ( icon ) icon.style.display = 'block';
			if ( span ) span.style.display = 'block';
		}
	}

	/**
	 * Очищает превью изображения
	 */
	clearImagePreview() {
		this.updateImagePreview( null );
	}
}

// Создаем глобальный экземпляр для доступа из других скриптов и HTML
window.productManager = new ProductManager();