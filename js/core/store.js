/**
 * Единое хранилище данных для сайта "Комори"
 * Управляет всеми данными: товары, корзина, избранное, пользователи
 */

class Store {
	constructor() {
		this.products = [];
		this.cart = [];
		this.favorites = [];
		this.users = [];
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

	init() {
		this.loadFromStorage();
		this.addDemoProductsIfNeeded();
	}

	// ========== Работа с localStorage ==========
	loadFromStorage() {
		try {
			this.products = JSON.parse( localStorage.getItem( 'komori_products' ) ) || [];
			this.cart = JSON.parse( localStorage.getItem( 'komori_cart' ) ) || [];
			this.favorites = JSON.parse( localStorage.getItem( 'komori_favorites' ) ) || [];
			this.users = JSON.parse( localStorage.getItem( 'komori_users' ) ) || [];
		} catch ( e ) {
			console.error( 'Ошибка загрузки из localStorage:', e );
			this.products = [];
			this.cart = [];
			this.favorites = [];
			this.users = [];
		}
	}

	saveToStorage() {
		try {
			localStorage.setItem( 'komori_products', JSON.stringify( this.products ) );
			localStorage.setItem( 'komori_cart', JSON.stringify( this.cart ) );
			localStorage.setItem( 'komori_favorites', JSON.stringify( this.favorites ) );
			localStorage.setItem( 'komori_users', JSON.stringify( this.users ) );

			// Отправляем события об обновлении
			this.dispatchEvents();
		} catch ( e ) {
			console.error( 'Ошибка сохранения в localStorage:', e );
		}
	}

	dispatchEvents() {
		window.dispatchEvent( new CustomEvent( 'store:productsUpdated', { detail: this.products } ) );
		window.dispatchEvent( new CustomEvent( 'store:cartUpdated', { detail: this.cart } ) );
		window.dispatchEvent( new CustomEvent( 'store:favoritesUpdated', { detail: this.favorites } ) );
	}

	// ========== Управление товарами ==========
	getProducts( filters = {} ) {
		let filtered = [...this.products];

		if ( filters.search ) {
			const term = filters.search.toLowerCase();
			filtered = filtered.filter( p =>
				p.name.toLowerCase().includes( term ) ||
				( p.description && p.description.toLowerCase().includes( term ) ) ||
				( p.sku && p.sku.toLowerCase().includes( term ) )
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
	 * Получение товара по ID (используем == для совместимости)
	 */
	getProduct( id ) {
		// Используем ==, так как ID могут быть числами или строками
		return this.products.find( p => p.id == id );
	}

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

	updateProduct( id, productData ) {
		const index = this.products.findIndex( p => p.id == id );
		if ( index !== -1 ) {
			this.products[index] = { ...this.products[index], ...productData };
			this.saveToStorage();
			return true;
		}
		return false;
	}

	deleteProduct( id ) {
		// Удаляем товар из корзины и избранного
		this.cart = this.cart.filter( item => item.id != id );
		this.favorites = this.favorites.filter( favId => favId != id );
		this.products = this.products.filter( p => p.id != id );
		this.saveToStorage();
	}

	// ========== Управление корзиной ==========
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

	getCartTotal() {
		return this.getCart().reduce( ( sum, item ) => sum + ( item.price * item.quantity ), 0 );
	}

	getCartCount() {
		return this.cart.reduce( ( sum, item ) => sum + item.quantity, 0 );
	}

	addToCart( productId, quantity = 1 ) {
		const product = this.getProduct( productId );
		if ( !product || product.status !== 'in-stock' || product.quantity < quantity ) {
			return false;
		}

		// ВАЖНО: используем == для сравнения
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

	updateCartQuantity( productId, newQuantity ) {
		const product = this.getProduct( productId );
		// ВАЖНО: используем == для сравнения
		const item = this.cart.find( i => i.id == productId );

		if ( !item ) return false;

		if ( newQuantity <= 0 ) {
			this.cart = this.cart.filter( i => i.id != productId );
		} else if ( product && newQuantity <= product.quantity ) {
			item.quantity = newQuantity;
		} else {
			return false;
		}

		this.saveToStorage();
		return true;
	}

	removeFromCart( productId ) {
		this.cart = this.cart.filter( item => item.id != productId );
		this.saveToStorage();
	}

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

	// ========== Управление избранным ==========
	getFavorites() {
		return this.products.filter( p => this.favorites.includes( p.id ) );
	}

	isFavorite( productId ) {
		return this.favorites.includes( productId );
	}

	toggleFavorite( productId ) {
		const index = this.favorites.indexOf( productId );
		let isNowFavorite;

		if ( index === -1 ) {
			this.favorites.push( productId );
			isNowFavorite = true;
			console.log( '❤️ Товар добавлен в избранное:', productId );
		} else {
			this.favorites.splice( index, 1 );
			isNowFavorite = false;
			console.log( '💔 Товар удален из избранного:', productId );
		}

		this.saveToStorage();
		return isNowFavorite;
	}

	// ========== Управление пользователями ==========
	registerUser( userData ) {
		// Проверяем, существует ли пользователь с таким email
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

		// Сохраняем текущего пользователя
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

	// ========== Вспомогательные методы ==========
	generateId() {
		return Date.now() + '-' + Math.random().toString( 36 ).substr( 2, 9 );
	}

	getCategoryName( categoryKey ) {
		return this.categories[categoryKey] || categoryKey;
	}

	addDemoProductsIfNeeded() {
		if ( this.products.length === 0 ) {
			const demos = [
				{
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
					image: '/image/figures.jpg'
				},
				{
					name: 'Чай маття премиум',
					category: 'tea',
					sku: 'TEA-MAT-001',
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
		}
	}
}

// Создаем глобальный экземпляр
window.store = new Store();