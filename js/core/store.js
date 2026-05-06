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
				// ========== АНИМЕ ФИГУРКИ (figures) ==========
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
					name: 'Фигурка Саске Учиха',
					category: 'figures',
					sku: 'FIG-SAS-002',
					col: 'NARUTO',
					price: 1890,
					oldPrice: 2390,
					description: 'Фигурка главного антагониста и друга Наруто',
					status: 'in-stock',
					quantity: 12,
					isNew: false,
					isHit: true,
					image: '/image/figures.jpg'
				},
				{
					name: 'Фигурка Гоку Супер Сайян',
					category: 'figures',
					sku: 'FIG-GOK-003',
					col: 'DRAGON BALL',
					price: 2490,
					oldPrice: 2990,
					description: 'Легендарный воин из аниме "Жемчуг Дракона" в форме Супер Сайяна',
					status: 'in-stock',
					quantity: 8,
					isNew: true,
					isHit: false,
					image: '/image/figures.jpg'
				},

				// ========== ЯПОНСКИЙ ЧАЙ (tea) ==========
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
					isHit: false,
					image: '/image/tea.jpg'
				},
				{
					name: 'Сенча органический',
					category: 'tea',
					sku: 'TEA-SEN-002',
					col: 'TEA COLLECTION',
					price: 590,
					oldPrice: 790,
					description: 'Традиционный японский зеленый чай из первого урожая',
					status: 'in-stock',
					quantity: 30,
					isNew: false,
					isHit: true,
					image: '/image/tea.jpg'
				},
				{
					name: 'Ходзитя обжаренный',
					category: 'tea',
					sku: 'TEA-HOJ-003',
					col: 'TEA COLLECTION',
					price: 490,
					oldPrice: 690,
					description: 'Обжаренный зеленый чай с ореховым ароматом',
					status: 'in-stock',
					quantity: 25,
					isNew: true,
					isHit: false,
					image: '/image/tea.jpg'
				},

				// ========== АЗИАТСКИЕ СЛАДОСТИ (sweets) ==========
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
					isNew: false,
					isHit: true,
					image: '/image/swits.jpg'
				},
				{
					name: 'Моти клубничные',
					category: 'sweets',
					sku: 'SWT-MOC-002',
					col: 'SWEETS',
					price: 550,
					oldPrice: 690,
					description: 'Нежные рисовые пирожные с клубничной начинкой',
					status: 'in-stock',
					quantity: 35,
					isNew: true,
					isHit: false,
					image: '/image/swits.jpg'
				},
				{
					name: 'Дораяки с красной фасолью',
					category: 'sweets',
					sku: 'SWT-DOR-003',
					col: 'SWEETS',
					price: 320,
					oldPrice: 450,
					description: 'Традиционные японские блинчики со сладкой начинкой',
					status: 'in-stock',
					quantity: 28,
					isNew: false,
					isHit: false,
					image: '/image/swits.jpg'
				},

				// ========== МАНГА И КНИГИ (manga) ==========
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
					isNew: false,
					isHit: false,
					image: '/image/manga.jpg'
				},
				{
					name: 'Манга "Атака Титанов" том 1',
					category: 'manga',
					sku: 'MANGA-ATK-002',
					col: 'MANGA',
					price: 750,
					oldPrice: 950,
					description: 'Популярная манга о борьбе человечества с гигантскими титанами',
					status: 'in-stock',
					quantity: 18,
					isNew: true,
					isHit: true,
					image: '/image/manga.jpg'
				},
				{
					name: 'Манга "Клинок, рассекающий демонов" том 1',
					category: 'manga',
					sku: 'MANGA-DEM-003',
					col: 'MANGA',
					price: 720,
					oldPrice: 920,
					description: 'История о молодом охотнике на демонов',
					status: 'in-stock',
					quantity: 22,
					isNew: true,
					isHit: false,
					image: '/image/manga.jpg'
				},

				// ========== АНИМЕ ОДЕЖДА (clothing) ==========
				{
					name: 'Футболка "Наруто"',
					category: 'clothing',
					sku: 'CLO-NAR-001',
					col: 'NARUTO',
					price: 1290,
					oldPrice: 1590,
					description: 'Хлопковая футболка с принтом Наруто',
					status: 'in-stock',
					quantity: 25,
					isNew: false,
					isHit: true,
					image: '/image/T-shirt.webp'
				},
				{
					name: 'Худи "Атака Титанов"',
					category: 'clothing',
					sku: 'CLO-ATK-002',
					col: 'CLOTHING',
					price: 2990,
					oldPrice: 3990,
					description: 'Теплое худи с символикой Разведкорпуса',
					status: 'in-stock',
					quantity: 12,
					isNew: true,
					isHit: false,
					image: '/image/T-shirt.webp'
				},
				{
					name: 'Футболка "Демон-убийца"',
					category: 'clothing',
					sku: 'CLO-DEM-003',
					col: 'CLOTHING',
					price: 1390,
					oldPrice: 1690,
					description: 'Футболка с персонажами из "Клинка, рассекающего демонов"',
					status: 'in-stock',
					quantity: 20,
					isNew: true,
					isHit: false,
					image: '/image/T-shirt.webp'
				},

				// ========== ЯПОНСКАЯ ПОСУДА (tableware) ==========
				{
					name: 'Чайный набор "Сакура"',
					category: 'tableware',
					sku: 'TBL-SAK-001',
					col: 'TABLEWARE',
					price: 3490,
					oldPrice: 4490,
					description: 'Керамический набор для чайной церемонии с росписью сакуры',
					status: 'in-stock',
					quantity: 10,
					isNew: true,
					isHit: true,
					image: '/image/sakura.jpg'
				},
				{
					name: 'Пиала для чая "Сакура"',
					category: 'tableware',
					sku: 'TBL-CUP-002',
					col: 'TABLEWARE',
					price: 890,
					oldPrice: 1190,
					description: 'Традиционная японская пиала для чая с узором сакуры',
					status: 'in-stock',
					quantity: 35,
					isNew: false,
					isHit: false,
					image: '/image/sakura.jpg'
				},
				{
					name: 'Набор палочек для еды',
					category: 'tableware',
					sku: 'TBL-CHP-003',
					col: 'TABLEWARE',
					price: 590,
					oldPrice: 790,
					description: 'Лакированные деревянные палочки в подарочной упаковке',
					status: 'in-stock',
					quantity: 40,
					isNew: false,
					isHit: false,
					image: '/image/sakura.jpg'
				},

				// ========== ЯПОНСКИЕ ИГРЫ (games) ==========
				{
					name: 'Го классическое',
					category: 'games',
					sku: 'GAM-GO-001',
					col: 'GAMES',
					price: 2490,
					oldPrice: 2990,
					description: 'Традиционная японская стратегическая игра для двоих',
					status: 'in-stock',
					quantity: 8,
					isNew: false,
					isHit: false,
					image: '/image/games.jpg'
				},
				{
					name: 'Нинтендо Свитч Про контроллер',
					category: 'games',
					sku: 'GAM-NSW-002',
					col: 'GAMES',
					price: 3490,
					oldPrice: 4490,
					description: 'Официальный беспроводной контроллер для Nintendo Switch',
					status: 'in-stock',
					quantity: 15,
					isNew: true,
					isHit: true,
					image: '/image/games.jpg'
				},
				{
					name: 'Коллекционная карточная игра "Pokémon"',
					category: 'games',
					sku: 'GAM-POK-003',
					col: 'GAMES',
					price: 1290,
					oldPrice: 1590,
					description: 'Бустер с коллекционными карточками покемонов',
					status: 'in-stock',
					quantity: 30,
					isNew: true,
					isHit: false,
					image: '/image/games.jpg'
				},

				// ========== КАНЦЕЛЯРИЯ КАВАЙ (stationery) ==========
				{
					name: 'Тетрадь в стиле кавай',
					category: 'stationery',
					sku: 'STA-NOT-001',
					col: 'STATIONERY',
					price: 290,
					oldPrice: 390,
					description: 'Тетрадь с милыми азиатскими персонажами',
					status: 'in-stock',
					quantity: 50,
					isNew: false,
					isHit: false,
					image: '/image/kawai.jpg'
				},
				{
					name: 'Набор ручек "Кавай"',
					category: 'stationery',
					sku: 'STA-PEN-002',
					col: 'STATIONERY',
					price: 490,
					oldPrice: 690,
					description: 'Набор из 6 гелевых ручек с милым дизайном',
					status: 'in-stock',
					quantity: 45,
					isNew: true,
					isHit: false,
					image: '/image/kawai.jpg'
				},
				{
					name: 'Наклейки "Аниме" набор 50шт',
					category: 'stationery',
					sku: 'STA-STK-003',
					col: 'STATIONERY',
					price: 190,
					oldPrice: 290,
					description: 'Коллекция наклеек с популярными аниме персонажами',
					status: 'in-stock',
					quantity: 100,
					isNew: true,
					isHit: true,
					image: '/image/kawai.jpg'
				},

				// ========== КОСМЕТИКА ИЗ АЗИИ (cosmetics) ==========
				{
					name: 'Корейская маска для лица',
					category: 'cosmetics',
					sku: 'COS-MSK-001',
					col: 'COSMETICS',
					price: 150,
					oldPrice: 250,
					description: 'Увлажняющая тканевая маска с экстрактом алоэ',
					status: 'in-stock',
					quantity: 80,
					isNew: true,
					isHit: false,
					image: '/image/cosmetics.jpg'
				},
				{
					name: 'Тональный крем BB',
					category: 'cosmetics',
					sku: 'COS-BB-002',
					col: 'COSMETICS',
					price: 1290,
					oldPrice: 1690,
					description: 'Корейский BB-крем с SPF 50',
					status: 'in-stock',
					quantity: 25,
					isNew: false,
					isHit: true,
					image: '/image/cosmetics.jpg'
				},
				{
					name: 'Патчи для глаз с коллагеном',
					category: 'cosmetics',
					sku: 'COS-PAT-003',
					col: 'COSMETICS',
					price: 890,
					oldPrice: 1190,
					description: 'Гель-патчи для ухода за кожей вокруг глаз',
					status: 'in-stock',
					quantity: 35,
					isNew: true,
					isHit: false,
					image: '/image/cosmetics.jpg'
				},

				// ========== АЗИАТСКИЙ ДЕКОР (decor) ==========
				{
					name: 'Китайский фонарик "Красный дракон"',
					category: 'decor',
					sku: 'DEC-LAN-001',
					col: 'DECOR',
					price: 890,
					oldPrice: 1190,
					description: 'Традиционный китайский бумажный фонарик',
					status: 'in-stock',
					quantity: 20,
					isNew: true,
					isHit: false,
					image: '/image/decor.jpg'
				},
				{
					name: 'Фигурка "Дракон" из нефрита',
					category: 'decor',
					sku: 'DEC-DRA-002',
					col: 'DECOR',
					price: 3490,
					oldPrice: 4490,
					description: 'Декоративная фигурка дракона из искусственного нефрита',
					status: 'in-stock',
					quantity: 5,
					isNew: false,
					isHit: true,
					image: '/image/decor.jpg'
				},
				{
					name: 'Веер японский "Весна"',
					category: 'decor',
					sku: 'DEC-FAN-003',
					col: 'DECOR',
					price: 590,
					oldPrice: 790,
					description: 'Традиционный японский веер с росписью',
					status: 'in-stock',
					quantity: 30,
					isNew: false,
					isHit: false,
					image: '/image/decor.jpg'
				},

				// ========== АНИМЕ НА ДИСКАХ (anime) ==========
				{
					name: 'Наруто: Коллекция фильмов DVD',
					category: 'anime',
					sku: 'ANM-NAR-001',
					col: 'ANIME',
					price: 2490,
					oldPrice: 2990,
					description: 'Сборник полнометражных фильмов о Наруто',
					status: 'in-stock',
					quantity: 12,
					isNew: false,
					isHit: false,
					image: '/image/anime.jpg'
				},
				{
					name: 'Унесённые призраками Blu-ray',
					category: 'anime',
					sku: 'ANM-SPI-002',
					col: 'ANIME',
					price: 1890,
					oldPrice: 2390,
					description: 'Знаменитое аниме Хаяо Миядзаки в HD качестве',
					status: 'in-stock',
					quantity: 18,
					isNew: true,
					isHit: true,
					image: '/image/anime.jpg'
				},
				{
					name: 'Атака Титанов Сезон 1 DVD',
					category: 'anime',
					sku: 'ANM-ATK-003',
					col: 'ANIME',
					price: 1490,
					oldPrice: 1990,
					description: 'Первый сезон культового аниме',
					status: 'in-stock',
					quantity: 15,
					isNew: false,
					isHit: false,
					image: '/image/anime.jpg'
				},

				// ========== АЗИАТСКАЯ МУЗЫКА (music) ==========
				{
					name: 'K-POP альбом BTS "BE"',
					category: 'music',
					sku: 'MUS-BTS-001',
					col: 'MUSIC',
					price: 2490,
					oldPrice: 2990,
					description: 'Альбом популярной корейской группы BTS',
					status: 'in-stock',
					quantity: 20,
					isNew: true,
					isHit: true,
					image: '/image/BTS.jpg'
				},
				{
					name: 'J-POP альбом LiSA "Best"',
					category: 'music',
					sku: 'MUS-LIS-002',
					col: 'MUSIC',
					price: 1890,
					oldPrice: 2390,
					description: 'Сборник лучших песен исполнительницы из "Клинка, рассекающего демонов"',
					status: 'in-stock',
					quantity: 15,
					isNew: true,
					isHit: false,
					image: '/image/music.jpg'
				},
				{
					name: 'OST аниме "Наруто" на виниле',
					category: 'music',
					sku: 'MUS-NAR-003',
					col: 'MUSIC',
					price: 3490,
					oldPrice: 4490,
					description: 'Коллекционное издание саундтрека на виниле',
					status: 'in-stock',
					quantity: 5,
					isNew: false,
					isHit: true,
					image: '/image/music.jpg'
				},

				// ========== ДРУГОЕ (other) ==========
				{
					name: 'Подарочный набор "Комори"',
					category: 'other',
					sku: 'OTH-GFT-001',
					col: 'OTHER',
					price: 1990,
					oldPrice: 2990,
					description: 'Набор из чая, сладостей и сувенира',
					status: 'in-stock',
					quantity: 10,
					isNew: true,
					isHit: false,
					image: '/image/other.jpg'
				},
				{
					name: 'Сертификат на 1000 ₽',
					category: 'other',
					sku: 'OTH-CRT-002',
					col: 'OTHER',
					price: 1000,
					oldPrice: 1000,
					description: 'Подарочный сертификат на покупки в магазине',
					status: 'in-stock',
					quantity: 50,
					isNew: false,
					isHit: false,
					image: '/image/other.jpg'
				},
				{
					name: 'Сумка-шоппер "Аниме"',
					category: 'other',
					sku: 'OTH-BAG-003',
					col: 'OTHER',
					price: 690,
					oldPrice: 990,
					description: 'Экосумка с аниме принтом из плотной ткани',
					status: 'in-stock',
					quantity: 25,
					isNew: true,
					isHit: false,
					image: '/image/other.jpg'
				}
			];

			demos.forEach( demo => {
				this.addProduct( demo );
			} );

			console.log( `📦 Добавлено ${demos.length} демонстрационных товаров` );
		}
	}
}

// Создаем глобальный экземпляр
window.store = new Store();
console.log( '✅ Store инициализирован' );