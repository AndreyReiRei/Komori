/**
 * ============================================================================
 * ЕДИНОЕ ХРАНИЛИЩЕ ДАННЫХ ДЛЯ САЙТА "КОМОРИ"
 * ============================================================================
 */

class Store {
	constructor() {
		// ========== ОСНОВНЫЕ ХРАНИЛИЩА ==========
		this.products = [];
		this.cart = [];
		this.favorites = [];
		this.users = [];

		// ========== КАТЕГОРИИ ТОВАРОВ ==========
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

		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	init() {
		this.loadFromStorage();
		this.addDemoProductsIfNeeded();
	}

	// =========================================================================
	// РАБОТА С LOCALSTORAGE
	// =========================================================================

	loadFromStorage() {
		try {
			this.products = JSON.parse( localStorage.getItem( 'komori_products' ) ) || [];
			this.cart = JSON.parse( localStorage.getItem( 'komori_cart' ) ) || [];
			this.favorites = JSON.parse( localStorage.getItem( 'komori_favorites' ) ) || [];
			this.users = JSON.parse( localStorage.getItem( 'komori_users' ) ) || [];
		} catch ( e ) {
			console.error( '❌ Ошибка загрузки из localStorage:', e );
			this.products = [];
			this.cart = [];
			this.favorites = [];
			this.users = [];
		}
	}

	/**
	 * Сохраняет данные с проверкой размера
	 */
	saveToStorage() {
		try {
			const productsStr = JSON.stringify( this.products );
			const productsSizeKB = ( productsStr.length / 1024 ).toFixed( 2 );

			if ( productsStr.length > 4.5 * 1024 * 1024 ) {
				console.warn( `⚠️ Размер товаров: ${productsSizeKB} KB, приближается к лимиту (5MB)` );
			}

			localStorage.setItem( 'komori_products', productsStr );
			localStorage.setItem( 'komori_cart', JSON.stringify( this.cart ) );
			localStorage.setItem( 'komori_favorites', JSON.stringify( this.favorites ) );
			localStorage.setItem( 'komori_users', JSON.stringify( this.users ) );

			this.dispatchEvents();
		} catch ( e ) {
			if ( e.name === 'QuotaExceededError' ) {
				console.error( '❌ Превышен лимит localStorage!' );
				this.showStorageWarning();
			} else {
				console.error( '❌ Ошибка сохранения:', e );
			}
		}
	}

	/**
	 * Показывает предупреждение о переполнении хранилища
	 */
	showStorageWarning() {
		const warning = document.createElement( 'div' );
		warning.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			background: #ff4757;
			color: white;
			padding: 15px 20px;
			border-radius: 8px;
			z-index: 10000;
			font-size: 14px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		`;
		warning.innerHTML = `
			<strong>⚠️ Внимание!</strong><br>
			Превышен лимит хранилища.<br>
			Удалите старые товары или используйте внешние изображения.
		`;
		document.body.appendChild( warning );
		setTimeout( () => warning.remove(), 5000 );
	}

	dispatchEvents() {
		window.dispatchEvent( new CustomEvent( 'store:productsUpdated', { detail: this.products } ) );
		window.dispatchEvent( new CustomEvent( 'store:cartUpdated', { detail: this.cart } ) );
		window.dispatchEvent( new CustomEvent( 'store:favoritesUpdated', { detail: this.favorites } ) );
	}

	// =========================================================================
	// УПРАВЛЕНИЕ ТОВАРАМИ
	// =========================================================================

	/**
	 * Возвращает отфильтрованный список товаров (для админки)
	 */
	getProducts( filters = {} ) {
		let filtered = [...this.products];

		if ( filters.search ) {
			const term = filters.search.toLowerCase();
			filtered = filtered.filter( p =>
				p.name.toLowerCase().includes( term ) ||
				( p.description && p.description.toLowerCase().includes( term ) ) ||
				( p.sku && p.sku.toLowerCase().includes( term ) ) ||
				( p.col && p.col.toLowerCase().includes( term ) )
			);
		}

		if ( filters.category && filters.category !== 'all' ) {
			filtered = filtered.filter( p => p.category === filters.category );
		}

		if ( filters.status && filters.status !== 'all' ) {
			filtered = filtered.filter( p => p.status === filters.status );
		}

		if ( filters.sortBy && filters.sortBy !== 'default' ) {
			filtered.sort( ( a, b ) => {
				let comparison = 0;
				switch ( filters.sortBy ) {
					case 'name': comparison = a.name.localeCompare( b.name ); break;
					case 'price': comparison = a.price - b.price; break;
					case 'quantity': comparison = a.quantity - b.quantity; break;
				}
				return filters.sortOrder === 'desc' ? -comparison : comparison;
			} );
		}

		return filtered;
	}

	/**
	 * Получение товаров для каталога (главная страница)
	 */
	getCatalogProducts( filters = {} ) {
		let filtered = [...this.products];

		if ( filters.search ) {
			const term = filters.search.toLowerCase();
			filtered = filtered.filter( p =>
				p.name.toLowerCase().includes( term ) ||
				( p.description && p.description.toLowerCase().includes( term ) )
			);
		}

		if ( filters.category && filters.category !== 'all' ) {
			filtered = filtered.filter( p => p.category === filters.category );
		}

		if ( filters.showOnlyInStock ) {
			filtered = filtered.filter( p => p.status === 'in-stock' && p.quantity > 0 );
		}

		return filtered;
	}

	/**
	 * Получение товара по ID
	 */
	getProduct( id ) {
		return this.products.find( p => p.id == id );
	}

	/**
	 * Добавляет новый товар
	 */
	addProduct( productData ) {
		const newProduct = {
			id: this.generateId(),
			...productData,
			createdAt: new Date().toISOString()
		};
		this.products.push( newProduct );
		this.saveToStorage();
		return newProduct;
	}

	/**
	 * Обновляет существующий товар
	 */
	updateProduct( id, productData ) {
		const index = this.products.findIndex( p => p.id == id );
		if ( index !== -1 ) {
			this.products[index] = { ...this.products[index], ...productData };
			this.saveToStorage();
			return true;
		}
		return false;
	}

	/**
	 * Удаляет товар из всех хранилищ
	 */
	deleteProduct( id ) {
		this.cart = this.cart.filter( item => item.id != id );
		this.favorites = this.favorites.filter( favId => favId != id );
		this.products = this.products.filter( p => p.id != id );
		this.saveToStorage();
	}

	// =========================================================================
	// УПРАВЛЕНИЕ КОРЗИНОЙ
	// =========================================================================

	/**
	 * Возвращает товары в корзине с полной информацией
	 */
	getCart() {
		return this.cart.map( item => {
			const product = this.getProduct( item.id );
			return {
				...item,
				name: product?.name,
				price: product?.price,
				image: product?.image,
				maxQuantity: product?.quantity || 0
			};
		} ).filter( item => item.name );
	}

	/**
	 * Общая сумма корзины без скидки
	 */
	getCartTotal() {
		return this.getCart().reduce( ( sum, item ) => sum + ( item.price * item.quantity ), 0 );
	}

	/**
	 * Общее количество товаров в корзине
	 */
	getCartCount() {
		return this.cart.reduce( ( sum, item ) => sum + item.quantity, 0 );
	}

	/**
	 * Проверяет, есть ли товар в корзине
	 */
	isInCart( productId ) {
		return this.cart.some( item => item.id == productId );
	}

	/**
	 * Получает количество конкретного товара в корзине
	 */
	getCartItemQuantity( productId ) {
		const item = this.cart.find( i => i.id == productId );
		return item ? item.quantity : 0;
	}

	/**
	 * Получает общую сумму корзины со скидкой
	 */
	getCartTotals( promo = null ) {
		const subtotal = this.getCartTotal();
		let discount = 0;

		if ( promo ) {
			if ( promo.type === 'percent' ) {
				discount = subtotal * promo.discount;
			} else if ( promo.type === 'fixed' ) {
				discount = promo.discount;
			}
			discount = Math.min( discount, subtotal );
		}

		return { subtotal, discount, total: subtotal - discount };
	}

	/**
	 * Получает все ID товаров в корзине
	 */
	getCartProductIds() {
		return this.cart.map( item => item.id );
	}

	/**
	 * Добавляет товар в корзину
	 */
	addToCart( productId, quantity = 1 ) {
		const product = this.getProduct( productId );
		if ( !product || product.status !== 'in-stock' || product.quantity < quantity ) {
			return false;
		}

		const existingItem = this.cart.find( item => item.id == productId );

		if ( existingItem ) {
			if ( existingItem.quantity + quantity <= product.quantity ) {
				existingItem.quantity += quantity;
			} else {
				return false;
			}
		} else {
			this.cart.push( { id: productId, quantity } );
		}

		this.saveToStorage();
		return true;
	}

	/**
	 * Обновляет количество товара в корзине
	 */
	updateCartQuantity( productId, newQuantity ) {
		const product = this.getProduct( productId );
		const itemIndex = this.cart.findIndex( i => i.id == productId );

		if ( itemIndex === -1 ) return false;

		if ( newQuantity <= 0 ) {
			this.cart.splice( itemIndex, 1 );
		} else if ( product && newQuantity <= product.quantity ) {
			this.cart[itemIndex].quantity = newQuantity;
		} else {
			return false;
		}

		this.saveToStorage();
		return true;
	}

	/**
	 * Удаляет товар из корзины
	 */
	removeFromCart( productId ) {
		this.cart = this.cart.filter( item => item.id != productId );
		this.saveToStorage();
	}

	/**
	 * Полностью очищает корзину
	 */
	clearCart() {
		this.cart = [];
		this.saveToStorage();
		console.log( '🧹 Корзина полностью очищена' );
	}

	// =========================================================================
	// УПРАВЛЕНИЕ ИЗБРАННЫМ
	// =========================================================================

	/**
	 * Возвращает избранные товары с полной информацией
	 */
	getFavorites() {
		return this.products.filter( p => this.favorites.includes( p.id ) );
	}

	/**
	 * Проверяет, есть ли товар в избранном
	 */
	isFavorite( productId ) {
		return this.favorites.includes( productId );
	}

	/**
	 * Получает количество товаров в избранном
	 */
	getFavoritesCount() {
		return this.favorites.length;
	}

	/**
	 * Переключает статус избранного для товара
	 */
	toggleFavorite( productId ) {
		const index = this.favorites.indexOf( productId );

		if ( index === -1 ) {
			this.favorites.push( productId );
			console.log( '❤️ Товар добавлен в избранное:', productId );
			this.saveToStorage();
			return true;
		} else {
			this.favorites.splice( index, 1 );
			console.log( '💔 Товар удален из избранного:', productId );
			this.saveToStorage();
			return false;
		}
	}

	// =========================================================================
	// УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
	// =========================================================================

	registerUser( userData ) {
		if ( this.users.some( u => u.email === userData.email ) ) {
			return { success: false, error: 'Пользователь с таким email уже существует' };
		}

		const newUser = {
			id: Date.now(),
			name: userData.name,
			email: userData.email,
			password: userData.password,
			phone: userData.phone || '',
			addresses: [],
			defaultAddressId: null,
			defaultAddress: null,
			avatar: null,
			subscribe: userData.subscribe || false,
			createdAt: new Date().toISOString(),
			lastLogin: new Date().toISOString()
		};

		this.users.push( newUser );
		this.saveToStorage();
		localStorage.setItem( 'komori_current_user', JSON.stringify( newUser ) );

		return { success: true, user: newUser };
	}

	loginUser( email, password ) {
		const user = this.users.find( u => u.email === email && u.password === password );

		if ( user ) {
			user.lastLogin = new Date().toISOString();
			this.saveToStorage();
			localStorage.setItem( 'komori_current_user', JSON.stringify( user ) );
			return { success: true, user };
		}

		return { success: false, error: 'Неверный email или пароль' };
	}

	getCurrentUser() {
		const savedUser = localStorage.getItem( 'komori_current_user' );
		return savedUser ? JSON.parse( savedUser ) : null;
	}

	updateUser( userId, userData ) {
		const index = this.users.findIndex( u => u.id === userId );
		if ( index !== -1 ) {
			this.users[index] = { ...this.users[index], ...userData };
			this.saveToStorage();

			const currentUser = this.getCurrentUser();
			if ( currentUser && currentUser.id === userId ) {
				localStorage.setItem( 'komori_current_user', JSON.stringify( this.users[index] ) );
			}
			return true;
		}
		return false;
	}

	logoutUser() {
		localStorage.removeItem( 'komori_current_user' );
		localStorage.removeItem( 'komori_remembered_user' );
	}

	// =========================================================================
	// ОБЩИЕ УТИЛИТЫ
	// =========================================================================

	/**
	 * Очищает "битые" ссылки в корзине и избранном
	 */
	cleanInvalidReferences() {
		const validProductIds = this.products.map( p => p.id );

		const originalCartLength = this.cart.length;
		this.cart = this.cart.filter( item => validProductIds.includes( item.id ) );

		const originalFavoritesLength = this.favorites.length;
		this.favorites = this.favorites.filter( id => validProductIds.includes( id ) );

		const result = {
			cartCleaned: originalCartLength - this.cart.length,
			favoritesCleaned: originalFavoritesLength - this.favorites.length,
			totalRemoved: ( originalCartLength - this.cart.length ) + ( originalFavoritesLength - this.favorites.length )
		};

		if ( result.totalRemoved > 0 ) {
			this.saveToStorage();
			console.log( `🧹 Очищено: корзина (${result.cartCleaned}), избранное (${result.favoritesCleaned})` );
		}

		return result;
	}

	/**
	 * Генерирует уникальный ID
	 */
	generateId() {
		return Date.now() + '-' + Math.random().toString( 36 ).substr( 2, 9 );
	}

	/**
	 * Возвращает название категории
	 */
	getCategoryName( categoryKey ) {
		return this.categories[categoryKey] || categoryKey;
	}

	/**
	 * Возвращает URL страницы категории
	 */
	getCategoryUrl( categoryKey ) {
		const urls = {
			'figures': '/pages html/catalog pages/figurines.html',
			'tea': '/pages html/catalog pages/tea.html',
			'sweets': '/pages html/catalog pages/sweets.html',
			'manga': '/pages html/catalog pages/manga.html',
			'clothing': '/pages html/catalog pages/clothes.html',
			'tableware': '/pages html/catalog pages/dishes.html',
			'games': '/pages html/catalog pages/games.html',
			'stationery': '/pages html/catalog pages/office.html',
			'cosmetics': '/pages html/catalog pages/cosmetics.html',
			'decor': '/pages html/catalog pages/decor.html',
			'anime': '/pages html/catalog pages/disks.html',
			'music': '/pages html/catalog pages/music.html',
			'other': '/pages html/catalog.html'
		};
		return urls[categoryKey] || '/pages html/catalog.html';
	}

	/**
	 * Добавляет демонстрационные товары
	 */
	addDemoProductsIfNeeded() {
		if ( this.products.length === 0 ) {
			const demos = [
				{
					name: 'Фигурка Наруто Узумаки',
					category: 'figures',
					sku: 'FIG-NAR-001',
					col: 'NARUTO',
					price: 1890,
					oldPrice: 2390,
					description: 'Детализированная фигурка главного героя из аниме "Наруто"',
					status: 'in-stock',
					quantity: 15,
					isNew: true,
					isHit: true,
					image: '/image/figures.jpg'
				},
				{
					name: 'Чай маття премиум',
					category: 'tea',
					sku: 'TEA-MAT-001',
					col: 'TEA COLLECTION',
					price: 890,
					oldPrice: 1190,
					description: 'Настоящий японский зелёный чай высшего сорта',
					status: 'in-stock',
					quantity: 45,
					isNew: true,
					image: '/image/tea.jpg'
				},
				{
					name: 'Набор японских сладостей',
					category: 'sweets',
					sku: 'SWT-SET-001',
					col: 'SWEETS',
					price: 1490,
					oldPrice: 1990,
					description: 'Ассорти из моти, рамена и традиционных десертов',
					status: 'in-stock',
					quantity: 23,
					isHit: true,
					image: '/image/swits.jpg'
				},
				{
					name: 'Манга "Наруто" том 1',
					category: 'manga',
					sku: 'MANGA-NAR-001',
					col: 'MANGA',
					price: 690,
					oldPrice: 890,
					description: 'Первый том легендарной манги на русском языке',
					status: 'out-of-stock',
					quantity: 0,
					image: '/image/manga.jpg'
				}
			];

			demos.forEach( demo => {
				this.addProduct( demo );
			} );

			console.log( '📦 Добавлены демонстрационные товары' );
		}
	}
}

// Создаем глобальный экземпляр
window.store = new Store();
console.log( '✅ Store инициализирован' );