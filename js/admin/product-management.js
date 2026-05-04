/**
 * ProductManager - класс для управления товарами (админка)
 * Для сайта "Комори" - азиатский магазинчик
 */

class ProductManager {
	constructor() {
		console.log( 'ProductManager инициализируется...' );

		this.currentProductId = null;
		this.currentSort = {
			by: 'default',
			order: 'asc'
		};

		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', () => this.init() );
		} else {
			this.init();
		}
	}

	init() {
		console.log( 'ProductManager инициализация...' );

		this.renderProducts();
		this.bindEvents();
		this.initFormTabs();
		this.initImageUpload();

		window.addEventListener( 'store:productsUpdated', () => {
			console.log( 'Товары обновлены, перерисовываем...' );
			this.renderProducts();
		} );

		console.log( 'ProductManager готов!' );
	}

	// ==================== ОТОБРАЖЕНИЕ ТОВАРОВ С ГРУППИРОВКОЙ ПО КАТЕГОРИЯМ ====================

	/**
	 * Рендерит список товаров на странице, сгруппированный по категориям
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
	 * Группирует товары по категориям
	 * @param {Array} products - массив товаров
	 * @returns {Object} объект с категориями и товарами
	 */
	groupProductsByCategory( products ) {
		const grouped = {};

		// Категории в порядке для отображения
		const categoryOrder = [
			'figures', 'tea', 'sweets', 'manga', 'clothing',
			'tableware', 'games', 'stationery', 'cosmetics',
			'decor', 'anime', 'music', 'other'
		];

		// Группируем товары
		products.forEach( product => {
			const category = product.category;
			if ( !grouped[category] ) {
				grouped[category] = [];
			}
			grouped[category].push( product );
		} );

		// Сортируем категории по заданному порядку
		const sortedGrouped = {};
		categoryOrder.forEach( cat => {
			if ( grouped[cat] && grouped[cat].length > 0 ) {
				sortedGrouped[cat] = grouped[cat];
			}
		} );

		// Добавляем остальные категории, которых нет в порядке
		Object.keys( grouped ).forEach( cat => {
			if ( !sortedGrouped[cat] ) {
				sortedGrouped[cat] = grouped[cat];
			}
		} );

		return sortedGrouped;
	}

	/**
	 * Рендерит сгруппированные товары с заголовками категорий
	 * @param {Object} groupedProducts - объект с категориями и товарами
	 * @returns {string} HTML-разметка
	 */
	renderGroupedProducts( groupedProducts ) {
		let html = '';

		for ( const [categoryKey, products] of Object.entries( groupedProducts ) ) {
			if ( products.length === 0 ) continue;

			const categoryName = store.getCategoryName( categoryKey );
			const categoryIcon = this.getCategoryIcon( categoryKey );

			html += `
            <div class="category-group" data-category="${categoryKey}">
                <div class="category-group-header">
                    <div class="category-group-title">
                        <i class="fas ${categoryIcon}"></i>
                        <h2>${categoryName}</h2>
                    </div>
                    <button class="category-group-toggle" data-category="${categoryKey}">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>
                <div class="category-group-products">
                    <div class="products-grid-inner">
                        ${products.map( product => this.renderProductCard( product ) ).join( '' )}
                    </div>
                </div>
            </div>
        `;
		}

		return html;
	}

	/**
	 * Возвращает иконку для категории
	 * @param {string} categoryKey - ключ категории
	 * @returns {string} класс иконки
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
	 * Склонение слов
	 */
	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
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

	bindEvents() {
		console.log( 'Привязка событий...' );

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

		const searchInput = document.getElementById( 'searchInput' );
		if ( searchInput ) {
			searchInput.removeEventListener( 'input', this.handleSearch );
			this.handleSearch = () => this.renderProducts();
			searchInput.addEventListener( 'input', this.handleSearch );
		}

		const categoryFilter = document.getElementById( 'categoryFilter' );
		if ( categoryFilter ) {
			categoryFilter.removeEventListener( 'change', this.handleFilterChange );
			this.handleFilterChange = () => this.renderProducts();
			categoryFilter.addEventListener( 'change', this.handleFilterChange );
		}

		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.removeEventListener( 'change', this.handleFilterChange );
			this.handleFilterChange = () => this.renderProducts();
			statusFilter.addEventListener( 'change', this.handleFilterChange );
		}

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

		const confirmDeleteBtn = document.getElementById( 'confirmDeleteBtn' );
		if ( confirmDeleteBtn ) {
			confirmDeleteBtn.removeEventListener( 'click', this.handleConfirmDelete );
			this.handleConfirmDelete = ( e ) => {
				e.preventDefault();
				this.confirmDelete();
			};
			confirmDeleteBtn.addEventListener( 'click', this.handleConfirmDelete );
		}

		const productForm = document.getElementById( 'productForm' );
		if ( productForm ) {
			productForm.removeEventListener( 'submit', this.handleFormSubmit );
			this.handleFormSubmit = ( e ) => {
				e.preventDefault();
				this.saveProduct();
			};
			productForm.addEventListener( 'submit', this.handleFormSubmit );
		}

		window.removeEventListener( 'click', this.handleOutsideClick );
		this.handleOutsideClick = ( e ) => {
			if ( e.target.classList.contains( 'modal' ) ) {
				this.closeAllModals();
			}
		};
		window.addEventListener( 'click', this.handleOutsideClick );
	}

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

		if ( form ) {
			form.reset();
			form.querySelectorAll( 'input, select, textarea' ).forEach( input => {
				if ( input.type === 'checkbox' ) {
					input.checked = false;
				}
			} );
		}

		this.currentProductId = productId;

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

		const firstTab = document.querySelector( '.form-tab' );
		if ( firstTab ) firstTab.click();

		modal.classList.add( 'show' );
	}

	closeAllModals() {
		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.classList.remove( 'show' );
		} );
		this.currentProductId = null;
	}


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

		// Заполнение выбора изображения из галереи (если путь совпадает)
		const imageSelect = document.getElementById( 'productImageSelect' );
		if ( imageSelect && product.image ) {
			// Проверяем, есть ли такой путь в select
			const optionExists = Array.from( imageSelect.options ).some( opt => opt.value === product.image );
			if ( optionExists ) {
				imageSelect.value = product.image;
			} else {
				imageSelect.value = '';
			}
		}

		// Обновляем превью изображения
		this.updateImagePreview( product.image );
	}

	saveProduct() {
		console.log( 'Сохранение товара...' );

		const nameInput = document.getElementById( 'productName' );
		const priceInput = document.getElementById( 'productPrice' );

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

		// ===== УНИВЕРСАЛЬНОЕ ПОЛУЧЕНИЕ ИЗОБРАЖЕНИЯ =====
		// Приоритет: выбранное из галереи > загруженный файл > внешняя ссылка
		const imageSelect = document.getElementById( 'productImageSelect' );
		const imageUrl = document.getElementById( 'productImageUrl' );
		const imageFile = document.getElementById( 'productImageFile' );

		let imageToSave = '';

		// 1. Проверяем выбор из галереи
		if ( imageSelect && imageSelect.value ) {
			imageToSave = imageSelect.value;
			console.log( '📁 Изображение из галереи:', imageToSave );
		}

		// 2. Проверяем URL (если не выбран путь из галереи)
		if ( !imageToSave && imageUrl && imageUrl.value.trim() ) {
			imageToSave = imageUrl.value.trim();
			console.log( '🔗 Изображение по URL:', imageToSave );
		}

		// 3. Проверяем загруженный файл (только если у нас есть dataURL)
		// dataURL сохраняется в productImageUrl при загрузке файла
		if ( !imageToSave && imageUrl && imageUrl.value.trim() && imageUrl.value.trim().startsWith( 'data:image' ) ) {
			imageToSave = imageUrl.value.trim();
			console.log( '📤 Изображение из загруженного файла (base64)' );

			// Проверка размера base64
			const base64Size = imageToSave.length;
			const sizeKB = ( base64Size / 1024 ).toFixed( 2 );

			if ( base64Size > 200 * 1024 ) {
				API.showNotification( `❌ Изображение слишком большое (${sizeKB} KB). Максимальный размер 200 KB.`, 'error' );
				return;
			}

			if ( base64Size > 100 * 1024 ) {
				API.showNotification( `⚠️ Изображение большого размера (${sizeKB} KB). Рекомендуется использовать изображение из галереи.`, 'warning' );
			}
		}

		// Если изображение не выбрано - предупреждение
		if ( !imageToSave ) {
			API.showNotification( 'Выберите или загрузите изображение', 'error' );
			return;
		}

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
			image: imageToSave
		};

		console.log( 'Сохраняемые данные:', {
			...productData,
			imageType: imageToSave.startsWith( 'data:' ) ? 'base64' : ( imageToSave.startsWith( '/' ) ? 'local path' : 'url' ),
			imageSize: imageToSave.startsWith( 'data:' ) ? `${( imageToSave.length / 1024 ).toFixed( 2 )} KB` : 'N/A'
		} );

		if ( this.currentProductId ) {
			store.updateProduct( this.currentProductId, productData );
			API.showNotification( 'Товар обновлен', 'success' );
		} else {
			store.addProduct( productData );
			API.showNotification( 'Товар добавлен', 'success' );
		}

		this.closeAllModals();
	}

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

	confirmDelete() {
		if ( this.currentProductId ) {
			store.deleteProduct( this.currentProductId );
			API.showNotification( 'Товар удален', 'success' );
			this.closeAllModals();
		}
	}

	// ==================== ВКЛАДКИ ФОРМЫ ====================

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
	}

	// ==================== ЗАГРУЗКА ИЗОБРАЖЕНИЙ (УНИВЕРСАЛЬНЫЙ МЕТОД) ====================

	initImageUpload() {
		// Элементы для загрузки файлов
		const uploadBtn = document.getElementById( 'uploadImageBtn' );
		const imageFile = document.getElementById( 'productImageFile' );
		const imageUrl = document.getElementById( 'productImageUrl' );
		const imageSelect = document.getElementById( 'productImageSelect' );
		const clearImageBtn = document.getElementById( 'clearImageBtn' );

		// Загрузка через клик по области
		if ( uploadBtn && imageFile ) {
			uploadBtn.addEventListener( 'click', () => imageFile.click() );

			imageFile.addEventListener( 'change', ( e ) => {
				const file = e.target.files[0];
				if ( file ) {
					this.handleImageFileUpload( file );
				}
			} );
		}

		// Обновление превью при вводе URL
		if ( imageUrl ) {
			imageUrl.addEventListener( 'input', ( e ) => {
				const url = e.target.value.trim();
				if ( url ) {
					this.updateImagePreview( url );
					// Сбрасываем select при ручном вводе URL
					if ( imageSelect ) imageSelect.value = '';
				} else {
					this.clearImagePreview();
				}
			} );
		}

		// Обновление превью при выборе из галереи
		if ( imageSelect ) {
			imageSelect.addEventListener( 'change', ( e ) => {
				const selectedPath = e.target.value;
				if ( selectedPath ) {
					this.updateImagePreview( selectedPath );
					// Очищаем URL и файловый input
					if ( imageUrl ) imageUrl.value = '';
					if ( imageFile ) imageFile.value = '';
				} else {
					this.clearImagePreview();
				}
			} );
		}

		// Кнопка очистки изображения
		if ( clearImageBtn ) {
			clearImageBtn.addEventListener( 'click', () => {
				this.clearImagePreview();
				if ( imageUrl ) imageUrl.value = '';
				if ( imageSelect ) imageSelect.value = '';
				if ( imageFile ) imageFile.value = '';
				API.showNotification( 'Изображение очищено', 'info' );
			} );
		}

		// Добавляем подсказку
		this.addImageUploadHint();
	}

	/**
	 * Обработка загрузки файла изображения
	 * @param {File} file - загруженный файл
	 */
	handleImageFileUpload( file ) {
		if ( !file ) return;

		// Проверка типа файла
		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Пожалуйста, выберите изображение', 'error' );
			return;
		}

		// Максимальный размер: 200 KB
		const maxSize = 200 * 1024;
		const sizeKB = ( file.size / 1024 ).toFixed( 2 );

		if ( file.size > maxSize ) {
			API.showNotification( `❌ Изображение слишком большое (${sizeKB} KB). Максимальный размер 200 KB. Используйте изображение из галереи или сожмите файл.`, 'error' );
			return;
		}

		// Предупреждение о большом размере
		if ( file.size > 100 * 1024 ) {
			API.showNotification( `⚠️ Изображение весит ${sizeKB} KB. Рекомендуется использовать изображения до 100 KB или выбрать из галереи.`, 'warning' );
		}

		const reader = new FileReader();
		reader.onload = ( e ) => {
			const imageData = e.target.result;
			this.updateImagePreview( imageData );

			// Очищаем select и URL при загрузке файла
			const imageSelect = document.getElementById( 'productImageSelect' );
			const imageUrl = document.getElementById( 'productImageUrl' );
			if ( imageSelect ) imageSelect.value = '';
			if ( imageUrl ) imageUrl.value = '';

			const base64Size = imageData.length;
			const base64KB = ( base64Size / 1024 ).toFixed( 2 );
			console.log( `🖼️ Base64 размер: ${base64KB} KB (исходный файл: ${sizeKB} KB)` );

			if ( base64Size > 150 * 1024 ) {
				API.showNotification( `⚠️ Размер изображения в хранилище: ${base64KB} KB. Рекомендуется использовать изображение из галереи.`, 'warning' );
			} else {
				API.showNotification( 'Изображение загружено', 'success' );
			}
		};
		reader.onerror = () => {
			API.showNotification( 'Ошибка загрузки изображения', 'error' );
		};
		reader.readAsDataURL( file );
	}

	/**
	 * Обновляет превью изображения
	 * @param {string} src - URL, путь или dataURL изображения
	 */
	updateImagePreview( src ) {
		const preview = document.getElementById( 'imagePreview' );
		const currentImageDisplay = document.getElementById( 'currentImageDisplay' );
		const currentImagePreview = document.getElementById( 'currentImagePreview' );

		if ( !preview ) return;

		const img = preview.querySelector( 'img' );
		const icon = preview.querySelector( 'i' );
		const span = preview.querySelector( 'span' );

		if ( src && src.trim() ) {
			// Обновляем основное превью
			if ( img ) {
				img.src = src;
				img.style.display = 'block';
			}
			if ( icon ) icon.style.display = 'none';
			if ( span ) span.style.display = 'none';

			// Обновляем блок текущего изображения
			if ( currentImageDisplay && currentImagePreview ) {
				currentImageDisplay.src = src;
				currentImagePreview.style.display = 'block';
			}
		} else {
			// Очищаем превью
			if ( img ) img.style.display = 'none';
			if ( icon ) icon.style.display = 'block';
			if ( span ) span.style.display = 'block';

			if ( currentImageDisplay && currentImagePreview ) {
				currentImageDisplay.src = '';
				currentImagePreview.style.display = 'none';
			}
		}
	}

	/**
	 * Очищает превью изображения
	 */
	clearImagePreview() {
		this.updateImagePreview( null );
	}

	/**
	 * Добавляет подсказку о загрузке изображений
	 */
	addImageUploadHint() {
		const imageUrlField = document.getElementById( 'productImageUrl' );
		if ( !imageUrlField ) return;

		const formGroup = imageUrlField.closest( '.form-group' );
		if ( formGroup && !formGroup.querySelector( '.image-upload-hint' ) ) {
			const hint = document.createElement( 'div' );
			hint.className = 'image-upload-hint form-hint';
			hint.style.cssText = 'margin-top: 8px; padding: 8px; background: rgba(255,51,102,0.1); border-radius: 6px;';
			hint.innerHTML = '<i class="fas fa-info-circle" style="color:#ff3366; margin-right: 6px;"></i> ' +
				'<strong>Рекомендация:</strong> Используйте изображения из галереи (папка /image/) - это экономит место. ' +
				'При загрузке файла максимальный размер <strong>200 KB</strong>.';
			formGroup.appendChild( hint );
		}
	}

	addImageUploadHint() {
		const imageUrlField = document.getElementById( 'productImageUrl' );
		if ( !imageUrlField ) return;

		const formGroup = imageUrlField.closest( '.form-group' );
		if ( formGroup && !formGroup.querySelector( '.image-upload-hint' ) ) {
			const hint = document.createElement( 'div' );
			hint.className = 'image-upload-hint form-hint';
			hint.style.cssText = 'margin-top: 8px; padding: 8px; background: rgba(255,51,102,0.1); border-radius: 6px;';
			hint.innerHTML = '<i class="fas fa-info-circle" style="color:#ff3366; margin-right: 6px;"></i> ' +
				'<strong>Рекомендация:</strong> Используйте внешние ссылки на изображения (например, с Imgur) - ' +
				'это экономит место в хранилище. Максимальный размер загружаемого файла: <strong>200 KB</strong>.';
			formGroup.appendChild( hint );
		}
	}

	updateImagePreview( src ) {
		const preview = document.getElementById( 'imagePreview' );
		if ( !preview ) return;

		const img = preview.querySelector( 'img' );
		const icon = preview.querySelector( 'i' );
		const span = preview.querySelector( 'span' );

		if ( src && src.trim() ) {
			if ( img ) {
				img.src = src;
				img.style.display = 'block';
			}
			if ( icon ) icon.style.display = 'none';
			if ( span ) span.style.display = 'none';
		} else {
			if ( img ) img.style.display = 'none';
			if ( icon ) icon.style.display = 'block';
			if ( span ) span.style.display = 'block';
		}
	}

	clearImagePreview() {
		this.updateImagePreview( null );
	}
}

window.productManager = new ProductManager();