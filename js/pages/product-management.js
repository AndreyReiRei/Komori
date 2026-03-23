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

		// Ждем загрузку DOM
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

		// Слушаем обновления товаров
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( 'Товары обновлены, перерисовываем...' );
			this.renderProducts();
		} );

		console.log( 'ProductManager готов!' );
	}

	// ========== ОТОБРАЖЕНИЕ ТОВАРОВ ==========
	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		if ( !grid ) {
			console.error( 'Элемент productsGrid не найден' );
			return;
		}

		const filters = this.getFilters();
		let products = store.getProducts( filters );

		// Применяем сортировку
		products = this.sortProducts( products );

		if ( products.length === 0 ) {
			grid.innerHTML = this.getEmptyStateHTML();
			return;
		}

		grid.innerHTML = products.map( product => this.renderProductCard( product ) ).join( '' );
		this.attachProductEvents();
	}

	getFilters() {
		return {
			search: document.getElementById( 'searchInput' )?.value || '',
			category: document.getElementById( 'categoryFilter' )?.value || 'all',
			status: document.getElementById( 'statusFilter' )?.value || 'all',
			sortBy: this.currentSort.by,
			sortOrder: this.currentSort.order
		};
	}

	sortProducts( products ) {
		if ( this.currentSort.by === 'default' ) return products;

		return [...products].sort( ( a, b ) => {
			let comparison = 0;

			switch ( this.currentSort.by ) {
				case 'name':
					comparison = a.name.localeCompare( b.name );
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

	attachProductEvents() {
		// Редактирование
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

		// Удаление
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

	// ========== ФИЛЬТРЫ И СОРТИРОВКА ==========
	bindEvents() {
		console.log( 'Привязка событий...' );

		// Кнопка добавления товара
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

		// Поиск
		const searchInput = document.getElementById( 'searchInput' );
		if ( searchInput ) {
			searchInput.removeEventListener( 'input', this.handleSearch );
			this.handleSearch = () => this.renderProducts();
			searchInput.addEventListener( 'input', this.handleSearch );
		}

		// Фильтры
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

		// Сортировка
		const sortBy = document.getElementById( 'sortBy' );
		if ( sortBy ) {
			sortBy.removeEventListener( 'change', this.handleSortChange );
			this.handleSortChange = ( e ) => {
				const [by, order] = e.target.value.split( '-' );
				this.currentSort.by = by;
				if ( order ) this.currentSort.order = order;
				this.renderProducts();
			};
			sortBy.addEventListener( 'change', this.handleSortChange );
		}

		const sortOrderBtn = document.getElementById( 'sortOrderBtn' );
		if ( sortOrderBtn ) {
			sortOrderBtn.removeEventListener( 'click', this.handleSortOrder );
			this.handleSortOrder = () => {
				this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
				const icon = sortOrderBtn.querySelector( 'i' );
				if ( icon ) {
					icon.className = this.currentSort.order === 'asc'
						? 'fas fa-arrow-up-wide-short'
						: 'fas fa-arrow-down-wide-short';
				}
				this.renderProducts();
			};
			sortOrderBtn.addEventListener( 'click', this.handleSortOrder );
		}

		// Закрытие модальных окон
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

		// Подтверждение удаления
		const confirmDeleteBtn = document.getElementById( 'confirmDeleteBtn' );
		if ( confirmDeleteBtn ) {
			confirmDeleteBtn.removeEventListener( 'click', this.handleConfirmDelete );
			this.handleConfirmDelete = ( e ) => {
				e.preventDefault();
				this.confirmDelete();
			};
			confirmDeleteBtn.addEventListener( 'click', this.handleConfirmDelete );
		}

		// Форма товара
		const productForm = document.getElementById( 'productForm' );
		if ( productForm ) {
			productForm.removeEventListener( 'submit', this.handleFormSubmit );
			this.handleFormSubmit = ( e ) => {
				e.preventDefault();
				this.saveProduct();
			};
			productForm.addEventListener( 'submit', this.handleFormSubmit );
		}

		// Закрытие по клику вне модального окна
		window.removeEventListener( 'click', this.handleOutsideClick );
		this.handleOutsideClick = ( e ) => {
			if ( e.target.classList.contains( 'modal' ) ) {
				this.closeAllModals();
			}
		};
		window.addEventListener( 'click', this.handleOutsideClick );
	}

	// ========== РАБОТА С МОДАЛЬНЫМИ ОКНАМИ ==========
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

		// Сброс формы
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

		// Активируем первую вкладку
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
		// Основные поля
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

		// Чекбоксы
		const isNewCheck = document.getElementById( 'productIsNew' );
		if ( isNewCheck ) isNewCheck.checked = product.isNew || false;

		const isHitCheck = document.getElementById( 'productIsHit' );
		if ( isHitCheck ) isHitCheck.checked = product.isHit || false;

		// Изображение
		this.updateImagePreview( product.image );
	}

	saveProduct() {
		const nameInput = document.getElementById( 'productName' );
		const priceInput = document.getElementById( 'productPrice' );

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

		if ( this.currentProductId ) {
			store.updateProduct( this.currentProductId, productData );
			API.showNotification( 'Товар обновлен' );
		} else {
			store.addProduct( productData );
			API.showNotification( 'Товар добавлен' );
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
			API.showNotification( 'Товар удален' );
			this.closeAllModals();
		}
	}

	// ========== ВКЛАДКИ ФОРМЫ ==========
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

	// ========== ЗАГРУЗКА ИЗОБРАЖЕНИЙ ==========
	initImageUpload() {
		const uploadBtn = document.getElementById( 'uploadImageBtn' );
		const imageFile = document.getElementById( 'productImageFile' );
		const imageUrl = document.getElementById( 'productImageUrl' );

		if ( uploadBtn && imageFile ) {
			uploadBtn.addEventListener( 'click', () => imageFile.click() );

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

		if ( imageUrl ) {
			imageUrl.addEventListener( 'input', ( e ) => this.updateImagePreview( e.target.value ) );
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

// Создаем глобальный экземпляр
window.productManager = new ProductManager();