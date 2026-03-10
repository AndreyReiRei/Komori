/**
 * ProductManager - класс для управления товарами
 * Для сайта "Комори" - азиатский магазинчик
 */

class ProductManager {
	constructor() {
		console.log( 'ProductManager инициализируется...' );

		this.products = [];
		this.cart = [];
		this.currentProductId = null;
		this.currentSort = {
			by: 'default',
			order: 'asc'
		};

		// Флаг для отслеживания состояния модального окна
		this.modalInitialized = false;

		// Категории магазина
		this.categories = {
			'figures': 'Аниме фигурки',
			'tea': 'Японский чай',
			'sweets': 'Азиатские сладости',
			'manga': 'Манга и книги',
			'clothing': 'Аниме одежда',
			'tableware': 'Японская посуда',
			'games': 'Японские игры',
			'stationery': 'Канцелярия кавай',
			'cosmetics': 'Косметика из Азии',
			'decor': 'Азиатский декор',
			'anime': 'Аниме на дисках',
			'music': 'Азиатская музыка',
			'other': 'Другое'
		};

		// Путь к папке с изображениями
		this.imageFolderPath = '/image/';

		// Добавляем стили для уведомлений если их нет
		this.addNotificationStyles();

		// Ждем полной загрузки DOM
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', () => this.init() );
		} else {
			this.init();
		}
	}

	addNotificationStyles() {
		if ( !document.getElementById( 'notification-styles' ) ) {
			const style = document.createElement( 'style' );
			style.id = 'notification-styles';
			style.textContent = `
                @keyframes notificationSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes notificationFadeOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
                .notification {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 25px;
                    border-radius: 10px;
                    margin-bottom: 10px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                    animation: notificationSlideIn 0.3s ease;
                    cursor: pointer;
                    max-width: 350px;
                }
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                }
            `;
			document.head.appendChild( style );
		}
	}

	init() {
		console.log( 'ProductManager инициализация...' );

		this.loadProducts();
		this.loadCart();
		this.renderProducts();
		this.bindEvents();
		this.updateCartCount();

		console.log( 'ProductManager готов!' );
	}

	loadProducts() {
		const savedProducts = localStorage.getItem( 'products' );
		if ( savedProducts ) {
			this.products = JSON.parse( savedProducts );
			console.log( 'Загружено товаров:', this.products.length );
		} else {
			// Добавляем тестовые товары с изображениями из папки image
			this.products = [
				{
					id: this.generateId(),
					name: 'Фигурка Наруто Узумаки',
					category: 'figures',
					sku: 'FIG-NAR-001',
					price: 1890,
					oldPrice: 2390,
					description: 'Детализированная фигурка главного героя из аниме "Наруто"',
					status: 'in-stock',
					quantity: 15,
					isNew: true,
					isHit: true,
					isSale: true,
					image: '/image/figures.jpg'
				},
				{
					id: this.generateId(),
					name: 'Чай маття премиум',
					category: 'tea',
					sku: 'TEA-MAT-001',
					price: 890,
					oldPrice: 1190,
					description: 'Настоящий японский зелёный чай высшего сорта',
					status: 'in-stock',
					quantity: 45,
					isNew: true,
					isHit: false,
					isSale: true,
					image: '/image/tea.jpg'
				},
				{
					id: this.generateId(),
					name: 'Набор японских сладостей',
					category: 'sweets',
					sku: 'SWT-SET-001',
					price: 1490,
					oldPrice: 1990,
					description: 'Ассорти из моти, рамена и традиционных десертов',
					status: 'in-stock',
					quantity: 23,
					isNew: false,
					isHit: true,
					isSale: true,
					image: '/image/swits.jpg'
				},
				{
					id: this.generateId(),
					name: 'Манга "Наруто" том 1',
					category: 'manga',
					sku: 'MANGA-NAR-001',
					price: 690,
					oldPrice: 890,
					description: 'Первый том легендарной манги на русском языке',
					status: 'out-of-stock',
					quantity: 0,
					isNew: false,
					isHit: false,
					isSale: false,
					image: '/image/manga.jpg'
				}
			];
			this.saveProducts();
			console.log( 'Созданы тестовые товары' );
		}
	}

	loadCart() {
		const savedCart = localStorage.getItem( 'cart' );
		if ( savedCart ) {
			this.cart = JSON.parse( savedCart );
		} else {
			this.cart = [];
		}
	}

	saveProducts() {
		localStorage.setItem( 'products', JSON.stringify( this.products ) );
		this.renderProducts();

		// Отправляем событие об обновлении товаров
		window.dispatchEvent( new CustomEvent( 'productsUpdated' ) );
		console.log( 'Товары сохранены' );
	}

	saveCart() {
		localStorage.setItem( 'cart', JSON.stringify( this.cart ) );
		this.updateCartCount();

		// Отправляем событие об обновлении корзины
		window.dispatchEvent( new CustomEvent( 'cartUpdated' ) );
		console.log( 'Корзина сохранена' );
	}

	generateId() {
		return Date.now() + '-' + Math.random().toString( 36 ).substr( 2, 9 );
	}

	getCategoryName( category ) {
		return this.categories[category] || category;
	}

	getStatusText( status ) {
		return status === 'in-stock' ? 'В наличии' : 'Нет в наличии';
	}

	// Сортировка товаров
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

	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		if ( !grid ) {
			console.error( 'Элемент productsGrid не найден' );
			return;
		}

		const searchTerm = document.getElementById( 'searchInput' )?.value.toLowerCase() || '';
		const categoryFilter = document.getElementById( 'categoryFilter' )?.value || 'all';
		const statusFilter = document.getElementById( 'statusFilter' )?.value || 'all';

		let filteredProducts = this.products.filter( product => {
			const matchesSearch = product.name.toLowerCase().includes( searchTerm ) ||
				( product.description && product.description.toLowerCase().includes( searchTerm ) ) ||
				( product.sku && product.sku.toLowerCase().includes( searchTerm ) );
			const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
			const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
			return matchesSearch && matchesCategory && matchesStatus;
		} );

		// Применяем сортировку
		filteredProducts = this.sortProducts( filteredProducts );

		if ( filteredProducts.length === 0 ) {
			grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Товары не найдены</p>
                    <button class="btn-primary" onclick="window.productManager.openModal()">
                        <i class="fas fa-plus"></i> Добавить первый товар
                    </button>
                </div>
            `;
			return;
		}

		grid.innerHTML = filteredProducts.map( product => {
			const cartItem = this.cart.find( item => item.id === product.id );
			const inCartQuantity = cartItem ? cartItem.quantity : 0;
			const availableQuantity = product.quantity - inCartQuantity;

			return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-badges">
                    ${product.isNew ? '<span class="badge new">Новинка</span>' : ''}
                    ${product.isHit ? '<span class="badge hit">Хит</span>' : ''}
                    ${product.isSale ? '<span class="badge sale">Скидка</span>' : ''}
                </div>
                <div class="product-image">
                    <img src="${this.getSafeImageUrl( product.image )}" 
                         alt="${product.name}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='${this.getFallbackSvg( product.name )}'">
                </div>
                <div class="product-info">
                    <div class="product-category">${this.getCategoryName( product.category )}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-sku">Артикул: ${product.sku || 'Нет'}</div>
                    <div class="product-description">${product.description || 'Нет описания'}</div>
                    <div class="product-price">
                        <span class="current-price">${product.price.toLocaleString()} ₽</span>
                        ${product.oldPrice > 0 ? `<span class="old-price">${product.oldPrice.toLocaleString()} ₽</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas ${product.status === 'in-stock' ? 'fa-check-circle in-stock' : 'fa-times-circle out-of-stock'}"></i>
                        <span class="${product.status === 'in-stock' ? 'in-stock' : 'out-of-stock'}">
                            ${this.getStatusText( product.status )}
                        </span>
                        ${product.quantity > 0 ? `<span class="product-quantity">${availableQuantity} шт.</span>` : ''}
                    </div>
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" 
                            onclick="window.productManager.addToCart('${product.id}')"
                            ${product.status !== 'in-stock' || availableQuantity <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> В корзину
                    </button>
                    <button class="edit-btn" onclick="window.productManager.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="window.productManager.deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `} ).join( '' );
	}

	getSafeImageUrl( url ) {
		if ( !url ) return this.getFallbackSvg();
		// Если URL уже начинается с http или data:, оставляем как есть
		if ( url.startsWith( 'http' ) || url.startsWith( 'data:' ) ) return url;
		// Если URL начинается с /, это путь из корня
		if ( url.startsWith( '/' ) ) return url;
		// Иначе добавляем путь к папке image
		return this.imageFolderPath + url;
	}

	getFallbackSvg( text = 'Нет фото' ) {
		return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='16' font-family='Arial'%3E${encodeURIComponent( text )}%3C/text%3E%3C/svg%3E`;
	}

	bindEvents() {
		console.log( 'Привязка событий...' );

		// Удаляем старые обработчики, если они были
		this.removeExistingEventListeners();

		// Кнопка добавления товара
		const addBtn = document.getElementById( 'addProductBtn' );
		if ( addBtn ) {
			addBtn.removeEventListener( 'click', this.handleAddClick );
			this.handleAddClick = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				console.log( 'Клик по кнопке добавления товара' );
				this.openModal();
			};
			addBtn.addEventListener( 'click', this.handleAddClick );
		} else {
			console.error( 'Кнопка addProductBtn не найдена' );
		}

		// Поиск и фильтры
		const searchInput = document.getElementById( 'searchInput' );
		if ( searchInput ) {
			searchInput.removeEventListener( 'input', this.handleSearch );
			this.handleSearch = () => this.renderProducts();
			searchInput.addEventListener( 'input', this.handleSearch );
		}

		const categoryFilter = document.getElementById( 'categoryFilter' );
		if ( categoryFilter ) {
			categoryFilter.removeEventListener( 'change', this.handleCategoryChange );
			this.handleCategoryChange = () => this.renderProducts();
			categoryFilter.addEventListener( 'change', this.handleCategoryChange );
		}

		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.removeEventListener( 'change', this.handleStatusChange );
			this.handleStatusChange = () => this.renderProducts();
			statusFilter.addEventListener( 'change', this.handleStatusChange );
		}

		// Сортировка
		const sortBy = document.getElementById( 'sortBy' );
		if ( sortBy ) {
			sortBy.removeEventListener( 'change', this.handleSortChange );
			this.handleSortChange = ( e ) => {
				const [by, order] = e.target.value.split( '-' );
				this.currentSort.by = by;
				if ( order ) {
					this.currentSort.order = order;
				}
				this.renderProducts();
			};
			sortBy.addEventListener( 'change', this.handleSortChange );
		}

		const sortOrderBtn = document.getElementById( 'sortOrderBtn' );
		if ( sortOrderBtn ) {
			sortOrderBtn.removeEventListener( 'click', this.handleSortOrder );
			this.handleSortOrder = () => {
				this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
				this.renderProducts();

				// Обновляем иконку
				const icon = sortOrderBtn.querySelector( 'i' );
				if ( icon ) {
					icon.className = this.currentSort.order === 'asc' ? 'fas fa-arrow-up-wide-short' : 'fas fa-arrow-down-wide-short';
				}
			};
			sortOrderBtn.addEventListener( 'click', this.handleSortOrder );
		}

		// Вкладки формы
		this.initFormTabs();

		// Форма товара
		const productForm = document.getElementById( 'productForm' );
		if ( productForm ) {
			productForm.removeEventListener( 'submit', this.handleFormSubmit );
			this.handleFormSubmit = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				console.log( 'Форма отправлена' );
				this.saveProduct();
			};
			productForm.addEventListener( 'submit', this.handleFormSubmit );
		}

		// Загрузка изображения
		this.initImageUpload();

		// Выбор изображения из папки - ВСТАВЛЕНО ЗДЕСЬ
		const imageFolderSelect = document.getElementById( 'imageFromFolder' );
		if ( imageFolderSelect ) {
			imageFolderSelect.removeEventListener( 'change', this.handleFolderSelect );
			this.handleFolderSelect = ( e ) => {
				const value = e.target.value;
				if ( value ) {
					const imageUrl = document.getElementById( 'productImageUrl' );
					if ( imageUrl ) {
						imageUrl.value = value;
						this.updateImagePreview( value );
					}
				}
			};
			imageFolderSelect.addEventListener( 'change', this.handleFolderSelect );
		}

		// Закрытие модальных окон
		const closeModalBtn = document.getElementById( 'closeModal' );
		if ( closeModalBtn ) {
			closeModalBtn.removeEventListener( 'click', this.handleCloseModal );
			this.handleCloseModal = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				this.closeModal();
			};
			closeModalBtn.addEventListener( 'click', this.handleCloseModal );
		}

		const cancelModalBtn = document.getElementById( 'cancelModalBtn' );
		if ( cancelModalBtn ) {
			cancelModalBtn.removeEventListener( 'click', this.handleCancelModal );
			this.handleCancelModal = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				this.closeModal();
			};
			cancelModalBtn.addEventListener( 'click', this.handleCancelModal );
		}

		const closeDeleteBtn = document.getElementById( 'closeDeleteModal' );
		if ( closeDeleteBtn ) {
			closeDeleteBtn.removeEventListener( 'click', this.handleCloseDelete );
			this.handleCloseDelete = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				this.closeDeleteModal();
			};
			closeDeleteBtn.addEventListener( 'click', this.handleCloseDelete );
		}

		const cancelDeleteBtn = document.getElementById( 'cancelDeleteBtn' );
		if ( cancelDeleteBtn ) {
			cancelDeleteBtn.removeEventListener( 'click', this.handleCancelDelete );
			this.handleCancelDelete = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				this.closeDeleteModal();
			};
			cancelDeleteBtn.addEventListener( 'click', this.handleCancelDelete );
		}

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

		// Корзина
		const clearCartBtn = document.getElementById( 'clearCartBtn' );
		if ( clearCartBtn ) {
			clearCartBtn.removeEventListener( 'click', this.handleClearCart );
			this.handleClearCart = ( e ) => {
				e.preventDefault();
				this.clearCart();
			};
			clearCartBtn.addEventListener( 'click', this.handleClearCart );
		}

		const checkoutBtn = document.getElementById( 'checkoutBtn' );
		if ( checkoutBtn ) {
			checkoutBtn.removeEventListener( 'click', this.handleCheckout );
			this.handleCheckout = ( e ) => {
				e.preventDefault();
				this.openCheckoutModal();
			};
			checkoutBtn.addEventListener( 'click', this.handleCheckout );
		}

		// Закрытие по клику вне модального окна
		window.removeEventListener( 'click', this.handleOutsideClick );
		this.handleOutsideClick = ( e ) => {
			if ( e.target.classList.contains( 'modal' ) ) {
				this.closeModal();
				this.closeDeleteModal();
				this.closeCheckoutModal();
			}
		};
		window.addEventListener( 'click', this.handleOutsideClick );

		console.log( 'События привязаны' );
	}

	removeExistingEventListeners() {
		// Этот метод нужен для предотвращения дублирования обработчиков
		// при повторной инициализации
	}

	initFormTabs() {
		const tabs = document.querySelectorAll( '.form-tab' );
		if ( tabs.length === 0 ) {
			console.warn( 'Вкладки формы не найдены' );
			return;
		}

		// Удаляем старые обработчики
		tabs.forEach( tab => {
			if ( tab.handler ) {
				tab.removeEventListener( 'click', tab.handler );
			}
		} );

		// Добавляем новые
		tabs.forEach( tab => {
			tab.handler = ( e ) => {
				e.preventDefault();
				e.stopPropagation();

				// Убираем активный класс у всех вкладок
				tabs.forEach( t => t.classList.remove( 'active' ) );

				// Добавляем активный класс текущей вкладке
				tab.classList.add( 'active' );

				// Получаем имя вкладки
				const tabName = tab.dataset.tab;

				// Скрываем все контенты вкладок
				document.querySelectorAll( '.form-tab-content' ).forEach( content => {
					content.classList.remove( 'active' );
				} );

				// Показываем нужный контент
				const activeContent = document.querySelector( `.form-tab-content[data-tab="${tabName}"]` );
				if ( activeContent ) {
					activeContent.classList.add( 'active' );
				}
			};
			tab.addEventListener( 'click', tab.handler );
		} );
	}

	initImageUpload() {
		const uploadBtn = document.getElementById( 'uploadImageBtn' );
		const imageFile = document.getElementById( 'productImageFile' );

		if ( uploadBtn && imageFile ) {
			uploadBtn.removeEventListener( 'click', this.handleUploadClick );
			this.handleUploadClick = ( e ) => {
				e.preventDefault();
				imageFile.click();
			};
			uploadBtn.addEventListener( 'click', this.handleUploadClick );

			imageFile.removeEventListener( 'change', this.handleFileChange );
			this.handleFileChange = ( e ) => {
				this.handleImageUpload( e.target.files[0] );
			};
			imageFile.addEventListener( 'change', this.handleFileChange );
		}

		const imageUrl = document.getElementById( 'productImageUrl' );
		if ( imageUrl ) {
			imageUrl.removeEventListener( 'input', this.handleUrlInput );
			this.handleUrlInput = ( e ) => {
				this.updateImagePreview( e.target.value );
			};
			imageUrl.addEventListener( 'input', this.handleUrlInput );
		}
	}

	// Работа с изображениями
	handleImageUpload( file ) {
		if ( !file ) return;

		// Проверяем тип файла
		if ( !file.type.startsWith( 'image/' ) ) {
			this.showNotification( 'Пожалуйста, выберите изображение' );
			return;
		}

		// Проверяем размер (макс 5MB)
		if ( file.size > 5 * 1024 * 1024 ) {
			this.showNotification( 'Размер файла не должен превышать 5MB' );
			return;
		}

		const reader = new FileReader();
		reader.onload = ( e ) => {
			this.updateImagePreview( e.target.result );
			const imageUrl = document.getElementById( 'productImageUrl' );
			if ( imageUrl ) {
				imageUrl.value = e.target.result;
			}
			this.showNotification( 'Изображение загружено' );
		};
		reader.onerror = () => {
			this.showNotification( 'Ошибка загрузки изображения' );
		};
		reader.readAsDataURL( file );
	}

	selectImageFromFolder() {
		// Создаем временный input для выбора файла
		const input = document.createElement( 'input' );
		input.type = 'file';
		input.accept = 'image/*';
		input.style.display = 'none';

		input.onchange = ( e ) => {
			const file = e.target.files[0];
			if ( file ) {
				this.handleImageUpload( file );
			}
			document.body.removeChild( input );
		};

		document.body.appendChild( input );
		input.click();
	}

	updateImagePreview( src ) {
		const preview = document.getElementById( 'imagePreview' );
		if ( !preview ) return;

		const img = preview.querySelector( 'img' );
		const icon = preview.querySelector( 'i' );
		const span = preview.querySelector( 'span' );

		if ( src ) {
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

	// Работа с модальными окнами
	openModal( productId = null ) {
		console.log( 'Открытие модального окна, productId:', productId );

		const modal = document.getElementById( 'productModal' );
		if ( !modal ) {
			console.error( 'Модальное окно productModal не найдено' );
			return;
		}

		const title = document.getElementById( 'modalTitle' );
		const form = document.getElementById( 'productForm' );

		// Полностью сбрасываем форму
		if ( form ) {
			form.reset();

			// Очищаем все поля ввода
			const inputs = form.querySelectorAll( 'input, select, textarea' );
			inputs.forEach( input => {
				if ( input.type !== 'button' && input.type !== 'submit' ) {
					if ( input.type === 'checkbox' ) {
						input.checked = false;
					} else {
						input.value = '';
					}
				}
			} );
		}

		// Сбрасываем выбор в выпадающем списке изображений
		const imageFolderSelect = document.getElementById( 'imageFromFolder' );
		if ( imageFolderSelect ) {
			imageFolderSelect.value = '';
		}

		if ( productId ) {
			const product = this.products.find( p => p.id === productId );
			if ( product ) {
				if ( title ) title.textContent = 'Редактировать товар';
				this.currentProductId = productId;
				this.fillForm( product );
			}
		} else {
			if ( title ) title.textContent = 'Добавить товар';
			this.currentProductId = null;
			this.updateImagePreview( null );
		}

		// Активируем первую вкладку
		const firstTab = document.querySelector( '.form-tab' );
		if ( firstTab ) {
			// Имитируем клик по первой вкладке
			firstTab.click();
		}

		// Показываем модальное окно
		modal.classList.add( 'show' );

		// Убираем возможные блокировки
		modal.style.display = 'flex';

		console.log( 'Модальное окно открыто' );
	}

	closeModal() {
		const modal = document.getElementById( 'productModal' );
		if ( modal ) {
			modal.classList.remove( 'show' );
			modal.style.display = 'none';

			// Сбрасываем форму при закрытии
			const form = document.getElementById( 'productForm' );
			if ( form ) {
				form.reset();
			}

			// Сбрасываем предпросмотр изображения
			this.updateImagePreview( null );

			// Сбрасываем выбор в выпадающем списке
			const imageFolderSelect = document.getElementById( 'imageFromFolder' );
			if ( imageFolderSelect ) {
				imageFolderSelect.value = '';
			}

			console.log( 'Модальное окно закрыто' );
		}
	}

	fillForm( product ) {
		// Заполняем основные поля
		const nameInput = document.getElementById( 'productName' );
		if ( nameInput ) nameInput.value = product.name || '';

		const categorySelect = document.getElementById( 'productCategory' );
		if ( categorySelect ) categorySelect.value = product.category || 'other';

		const skuInput = document.getElementById( 'productSKU' );
		if ( skuInput ) skuInput.value = product.sku || '';

		const priceInput = document.getElementById( 'productPrice' );
		if ( priceInput ) priceInput.value = product.price || '';

		const oldPriceInput = document.getElementById( 'productOldPrice' );
		if ( oldPriceInput ) oldPriceInput.value = product.oldPrice || '';

		const descInput = document.getElementById( 'productDescription' );
		if ( descInput ) descInput.value = product.description || '';

		const statusSelect = document.getElementById( 'productStatus' );
		if ( statusSelect ) statusSelect.value = product.status || 'in-stock';

		const quantityInput = document.getElementById( 'productQuantity' );
		if ( quantityInput ) quantityInput.value = product.quantity || 1;

		// Заполняем чекбоксы
		const isNewCheck = document.getElementById( 'productIsNew' );
		if ( isNewCheck ) isNewCheck.checked = product.isNew || false;

		const isHitCheck = document.getElementById( 'productIsHit' );
		if ( isHitCheck ) isHitCheck.checked = product.isHit || false;

		const isSaleCheck = document.getElementById( 'productIsSale' );
		if ( isSaleCheck ) isSaleCheck.checked = product.isSale || false;

		// Заполняем изображение
		const imageUrl = document.getElementById( 'productImageUrl' );
		if ( imageUrl ) {
			imageUrl.value = product.image || '';
			this.updateImagePreview( product.image || null );
		}

		// Устанавливаем значение в выпадающем списке, если изображение из папки
		const imageFolderSelect = document.getElementById( 'imageFromFolder' );
		if ( imageFolderSelect && product.image ) {
			const option = Array.from( imageFolderSelect.options ).find( opt => opt.value === product.image );
			if ( option ) {
				imageFolderSelect.value = product.image;
			}
		}
	}

	saveProduct() {
		console.log( 'Сохранение товара...' );

		const nameInput = document.getElementById( 'productName' );
		const priceInput = document.getElementById( 'productPrice' );

		if ( !nameInput || !priceInput ) {
			console.error( 'Не найдены обязательные поля формы' );
			return;
		}

		if ( !nameInput.value.trim() ) {
			this.showNotification( 'Пожалуйста, введите название товара' );
			return;
		}

		if ( !priceInput.value || parseFloat( priceInput.value ) <= 0 ) {
			this.showNotification( 'Пожалуйста, введите корректную цену' );
			return;
		}

		const productData = {
			id: this.currentProductId || this.generateId(),
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
			isSale: document.getElementById( 'productIsSale' )?.checked || false,
			image: document.getElementById( 'productImageUrl' )?.value.trim() || ''
		};

		if ( this.currentProductId ) {
			// Обновляем существующий товар
			const index = this.products.findIndex( p => p.id === this.currentProductId );
			if ( index !== -1 ) {
				this.products[index] = productData;
				console.log( 'Товар обновлен' );
			}
		} else {
			// Добавляем новый товар
			this.products.push( productData );
			console.log( 'Новый товар добавлен' );
		}

		this.saveProducts();
		this.closeModal();
		this.showNotification( this.currentProductId ? 'Товар обновлен' : 'Товар добавлен' );
	}

	editProduct( productId ) {
		this.openModal( productId );
	}

	deleteProduct( productId ) {
		const product = this.products.find( p => p.id === productId );
		if ( product ) {
			const nameSpan = document.getElementById( 'deleteProductName' );
			if ( nameSpan ) {
				nameSpan.textContent = product.name;
			}
			this.currentProductId = productId;

			const deleteModal = document.getElementById( 'deleteModal' );
			if ( deleteModal ) {
				deleteModal.classList.add( 'show' );
				deleteModal.style.display = 'flex';
			}
		}
	}

	confirmDelete() {
		if ( this.currentProductId ) {
			// Удаляем товар из корзины, если он там есть
			this.cart = this.cart.filter( item => item.id !== this.currentProductId );
			this.saveCart();

			// Удаляем товар
			this.products = this.products.filter( p => p.id !== this.currentProductId );
			this.saveProducts();
			this.closeDeleteModal();
			this.showNotification( 'Товар удален' );
		}
	}

	closeDeleteModal() {
		const deleteModal = document.getElementById( 'deleteModal' );
		if ( deleteModal ) {
			deleteModal.classList.remove( 'show' );
			deleteModal.style.display = 'none';
		}
		this.currentProductId = null;
	}

	// Работа с корзиной
	addToCart( productId ) {
		console.log( 'Добавление в корзину:', productId );

		const product = this.products.find( p => p.id === productId );
		if ( !product ) {
			console.error( 'Товар не найден' );
			return;
		}

		if ( product.status !== 'in-stock' || product.quantity <= 0 ) {
			this.showNotification( 'Товар отсутствует в наличии' );
			return;
		}

		const cartItem = this.cart.find( item => item.id === productId );
		const inCartQuantity = cartItem ? cartItem.quantity : 0;

		if ( inCartQuantity >= product.quantity ) {
			this.showNotification( 'Больше нельзя добавить в корзину' );
			return;
		}

		if ( cartItem ) {
			cartItem.quantity++;
		} else {
			this.cart.push( {
				id: product.id,
				name: product.name,
				price: product.price,
				image: product.image,
				quantity: 1
			} );
		}

		this.saveCart();
		this.renderProducts(); // Обновляем отображение количества
		this.showNotification( 'Товар добавлен в корзину' );
	}

	removeFromCart( productId ) {
		const index = this.cart.findIndex( item => item.id === productId );
		if ( index !== -1 ) {
			this.cart.splice( index, 1 );
			this.saveCart();
			this.renderProducts();
		}
	}

	updateCartQuantity( productId, change ) {
		const cartItem = this.cart.find( item => item.id === productId );
		if ( !cartItem ) return;

		const product = this.products.find( p => p.id === productId );
		const newQuantity = cartItem.quantity + change;

		if ( newQuantity <= 0 ) {
			this.removeFromCart( productId );
		} else if ( product && newQuantity <= product.quantity ) {
			cartItem.quantity = newQuantity;
			this.saveCart();
			this.renderProducts();
		}
	}

	clearCart() {
		this.cart = [];
		this.saveCart();
		this.renderProducts();
		this.showNotification( 'Корзина очищена' );
	}

	updateCartCount() {
		const countElement = document.getElementById( 'cartCount' );
		if ( countElement ) {
			const count = this.cart.reduce( ( sum, item ) => sum + item.quantity, 0 );
			countElement.textContent = count;
		}
	}

	renderCartPreview() {
		const cartItems = document.getElementById( 'cartPreviewItems' );
		const cartTotal = document.getElementById( 'cartPreviewTotal' );

		if ( !cartItems || !cartTotal ) return;

		if ( this.cart.length === 0 ) {
			cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Корзина пуста</p>';
			cartTotal.textContent = '0 ₽';
			return;
		}

		let total = 0;
		cartItems.innerHTML = this.cart.map( item => {
			total += item.price * item.quantity;
			return `
                <div class="cart-preview-item" data-id="${item.id}">
                    <img src="${this.getSafeImageUrl( item.image )}" alt="${item.name}">
                    <div class="cart-preview-item-info">
                        <div class="cart-preview-item-name">${item.name}</div>
                        <div class="cart-preview-item-price">${item.price.toLocaleString()} ₽</div>
                        <div class="cart-item-quantity">
                            <button onclick="window.productManager.updateCartQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="window.productManager.updateCartQuantity('${item.id}', 1)">+</button>
                        </div>
                    </div>
                </div>
            `;
		} ).join( '' );

		cartTotal.textContent = `${total.toLocaleString()} ₽`;
	}

	// Оформление заказа
	openCheckoutModal() {
		if ( this.cart.length === 0 ) {
			this.showNotification( 'Корзина пуста' );
			return;
		}

		const checkoutItems = document.getElementById( 'checkoutItems' );
		const checkoutTotal = document.getElementById( 'checkoutTotal' );

		if ( !checkoutItems || !checkoutTotal ) return;

		let total = 0;
		checkoutItems.innerHTML = this.cart.map( item => {
			total += item.price * item.quantity;
			return `
                <div class="checkout-item">
                    <span>${item.name} x${item.quantity}</span>
                    <span>${( item.price * item.quantity ).toLocaleString()} ₽</span>
                </div>
            `;
		} ).join( '' );

		checkoutTotal.innerHTML = `<span>Итого:</span> <span>${total.toLocaleString()} ₽</span>`;

		const checkoutModal = document.getElementById( 'checkoutModal' );
		if ( checkoutModal ) {
			checkoutModal.classList.add( 'show' );
			checkoutModal.style.display = 'flex';
		}
	}

	closeCheckoutModal() {
		const checkoutModal = document.getElementById( 'checkoutModal' );
		if ( checkoutModal ) {
			checkoutModal.classList.remove( 'show' );
			checkoutModal.style.display = 'none';
		}
	}

	checkout() {
		const name = document.getElementById( 'checkoutName' )?.value;
		const phone = document.getElementById( 'checkoutPhone' )?.value;
		const email = document.getElementById( 'checkoutEmail' )?.value;

		if ( !name || !phone || !email ) {
			this.showNotification( 'Пожалуйста, заполните все обязательные поля' );
			return;
		}

		// Здесь можно отправить данные на сервер
		console.log( 'Заказ оформлен:', {
			customer: { name, phone, email },
			items: this.cart,
			total: this.cart.reduce( ( sum, item ) => sum + item.price * item.quantity, 0 )
		} );

		// Очищаем корзину
		this.cart = [];
		this.saveCart();
		this.closeCheckoutModal();
		this.showNotification( 'Спасибо за заказ! Мы свяжемся с вами в ближайшее время.' );
	}

	showNotification( message ) {
		console.log( 'Уведомление:', message );

		// Проверяем, есть ли уже контейнер для уведомлений
		let container = document.querySelector( '.notification-container' );

		if ( !container ) {
			container = document.createElement( 'div' );
			container.className = 'notification-container';
			document.body.appendChild( container );
		}

		const notification = document.createElement( 'div' );
		notification.className = 'notification';
		notification.textContent = message;

		notification.addEventListener( 'click', () => {
			notification.style.animation = 'notificationFadeOut 0.3s ease forwards';
			setTimeout( () => {
				if ( notification.parentNode ) {
					notification.parentNode.removeChild( notification );
				}
			}, 300 );
		} );

		container.appendChild( notification );

		setTimeout( () => {
			if ( notification.parentNode ) {
				notification.style.animation = 'notificationFadeOut 0.3s ease forwards';
				setTimeout( () => {
					if ( notification.parentNode ) {
						notification.parentNode.removeChild( notification );
					}
				}, 300 );
			}
		}, 3000 );
	}
}

// Создаем глобальный экземпляр
console.log( 'Скрипт product-manager.js загружен' );

// Функция для безопасной инициализации
function initProductManager() {
	if ( !window.productManager ) {
		window.productManager = new ProductManager();
	} else {
		// Если экземпляр уже существует, переинициализируем его
		window.productManager.init();
	}
}

// Инициализация с задержкой для гарантии загрузки DOM
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initProductManager );
} else {
	setTimeout( initProductManager, 100 );
}

// Дополнительная страховка
window.addEventListener( 'load', () => {
	setTimeout( initProductManager, 200 );
} );