/**
 * Страница профиля пользователя
 * Сайт "Комори" - азиатский магазинчик
 */

class ProfilePage {
	constructor() {
		this.currentUser = null;
		this.userOrders = [];
		this.addresses = [];
		this.currentEditingAddressId = null;
		this.init();
	}

	// ========== ИНИЦИАЛИЗАЦИЯ ==========

	/**
	 * Инициализация страницы профиля
	 */
	init() {
		// Проверяем авторизацию
		this.checkAuth();

		if ( this.currentUser ) {
			this.loadUserData();
			this.loadAddresses();
			this.bindEvents();
			this.loadUserOrders();
			this.loadAvatar();
		}
	}

	/**
	 * Проверка авторизации пользователя
	 */
	checkAuth() {
		const savedUser = localStorage.getItem( 'komori_current_user' );

		if ( !savedUser ) {
			// Не авторизован - перенаправляем на страницу входа
			window.location.href = '/pages html/login.html';
			return;
		}

		this.currentUser = JSON.parse( savedUser );
	}

	// ========== ЗАГРУЗКА ДАННЫХ ==========

	/**
	 * Загрузка данных пользователя на страницу
	 */
	loadUserData() {
		// Заполняем информацию о пользователе
		document.getElementById( 'userName' ).textContent = this.currentUser.name;
		document.getElementById( 'userEmail' ).textContent = this.currentUser.email;
		document.getElementById( 'userPhone' ).textContent = this.currentUser.phone || '-';

		// Заполняем адрес в правой колонке
		if ( this.currentUser.defaultAddress ) {
			document.getElementById( 'userCity' ).textContent = this.currentUser.defaultAddress.city || 'Не указан';
			document.getElementById( 'userStreet' ).textContent = this.currentUser.defaultAddress.street || 'Не указана';
			document.getElementById( 'userHouse' ).textContent = this.currentUser.defaultAddress.house || 'Не указан';
			document.getElementById( 'userZip' ).textContent = this.currentUser.defaultAddress.zip || 'Не указан';
		}

		// Дата регистрации
		if ( this.currentUser.createdAt ) {
			const date = new Date( this.currentUser.createdAt );
			const formattedDate = date.toLocaleDateString( 'ru-RU', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			} );
			document.getElementById( 'memberSince' ).textContent = formattedDate;
		}

		// Заполняем форму настроек
		document.getElementById( 'profileName' ).value = this.currentUser.name;
		document.getElementById( 'profileEmail' ).value = this.currentUser.email;
		document.getElementById( 'profilePhone' ).value = this.currentUser.phone || '';
		document.getElementById( 'profileSubscribe' ).checked = this.currentUser.subscribe || false;

		// Обновляем аватар в шапке
		this.updateHeaderAvatar();
	}

	/**
	 * Загрузка адресов пользователя
	 */
	loadAddresses() {
		this.addresses = this.currentUser.addresses || [];
		this.renderAddresses();
	}

	/**
	 * Отображение списка адресов
	 */
	renderAddresses() {
		const addressesList = document.getElementById( 'addressesList' );

		if ( !addressesList ) return;

		if ( this.addresses.length === 0 ) {
			addressesList.innerHTML = `
				<div class="empty-addresses">
					<i class="fas fa-map-marker-alt"></i>
					<p>Сохраненных адресов пока нет</p>
				</div>
			`;
			return;
		}

		addressesList.innerHTML = this.addresses.map( address => this.renderAddressCard( address ) ).join( '' );

		// Привязываем обработчики к кнопкам адресов
		this.bindAddressEvents();
	}

	/**
	 * Отображение карточки адреса
	 */
	renderAddressCard( address ) {
		const isDefault = this.currentUser.defaultAddressId === address.id;
		const fullAddress = `${address.zip ? address.zip + ', ' : ''}${address.city}, ${address.street}, ${address.house}${address.building ? ' корп.' + address.building : ''}${address.apartment ? ', кв.' + address.apartment : ''}`;

		return `
			<div class="address-item ${isDefault ? 'default' : ''}" data-id="${address.id}">
				${isDefault ? '<div class="address-badge">По умолчанию</div>' : ''}
				<div class="address-full">${this.escapeHtml( fullAddress )}</div>
				${address.comment ? `<div class="address-comment">📝 ${this.escapeHtml( address.comment )}</div>` : ''}
				<div class="address-actions">
					<button class="address-edit-btn" data-id="${address.id}">
						<i class="fas fa-edit"></i> Редактировать
					</button>
					${!isDefault ? `<button class="address-default-btn" data-id="${address.id}">
						<i class="fas fa-check-circle"></i> Сделать по умолчанию
					</button>` : ''}
					<button class="address-delete-btn" data-id="${address.id}">
						<i class="fas fa-trash"></i> Удалить
					</button>
				</div>
			</div>
		`;
	}

	/**
	 * Привязка событий для кнопок управления адресами
	 */
	bindAddressEvents() {
		// Редактирование адреса
		document.querySelectorAll( '.address-edit-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddressEdit );
			this.handleAddressEdit = ( e ) => {
				const id = parseInt( btn.dataset.id );
				this.editAddress( id );
			};
			btn.addEventListener( 'click', this.handleAddressEdit );
		} );

		// Удаление адреса
		document.querySelectorAll( '.address-delete-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddressDelete );
			this.handleAddressDelete = ( e ) => {
				const id = parseInt( btn.dataset.id );
				this.deleteAddress( id );
			};
			btn.addEventListener( 'click', this.handleAddressDelete );
		} );

		// Установка адреса по умолчанию
		document.querySelectorAll( '.address-default-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddressDefault );
			this.handleAddressDefault = ( e ) => {
				const id = parseInt( btn.dataset.id );
				this.setDefaultAddress( id );
			};
			btn.addEventListener( 'click', this.handleAddressDefault );
		} );
	}

	/**
	 * Редактирование адреса
	 */
	editAddress( id ) {
		const address = this.addresses.find( a => a.id === id );
		if ( !address ) return;

		this.currentEditingAddressId = id;

		// Заполняем форму
		document.getElementById( 'addressCountry' ).value = address.country || 'Россия';
		document.getElementById( 'addressZip' ).value = address.zip || '';
		document.getElementById( 'addressCity' ).value = address.city || '';
		document.getElementById( 'addressStreet' ).value = address.street || '';
		document.getElementById( 'addressHouse' ).value = address.house || '';
		document.getElementById( 'addressBuilding' ).value = address.building || '';
		document.getElementById( 'addressApartment' ).value = address.apartment || '';
		document.getElementById( 'addressComment' ).value = address.comment || '';
		document.getElementById( 'addressDefault' ).checked = this.currentUser.defaultAddressId === id;

		// Прокручиваем к форме
		document.querySelector( '.address-form' ).scrollIntoView( { behavior: 'smooth' } );

		// Меняем текст кнопки
		const submitBtn = document.querySelector( '#addressForm button[type="submit"]' );
		if ( submitBtn ) {
			submitBtn.innerHTML = '<i class="fas fa-save"></i> Обновить адрес';
		}
	}

	/**
	 * Удаление адреса
	 */
	deleteAddress( id ) {
		if ( !confirm( 'Вы уверены, что хотите удалить этот адрес?' ) ) return;

		const address = this.addresses.find( a => a.id === id );

		this.addresses = this.addresses.filter( a => a.id !== id );

		// Если удаляем адрес по умолчанию, снимаем метку
		if ( this.currentUser.defaultAddressId === id ) {
			delete this.currentUser.defaultAddressId;
			delete this.currentUser.defaultAddress;
		}

		this.currentUser.addresses = this.addresses;
		this.saveUserToStorage();
		this.loadAddresses();

		// Обновляем отображение адреса в правой колонке
		if ( this.currentUser.defaultAddress ) {
			document.getElementById( 'userCity' ).textContent = this.currentUser.defaultAddress.city || 'Не указан';
			document.getElementById( 'userStreet' ).textContent = this.currentUser.defaultAddress.street || 'Не указана';
			document.getElementById( 'userHouse' ).textContent = this.currentUser.defaultAddress.house || 'Не указан';
			document.getElementById( 'userZip' ).textContent = this.currentUser.defaultAddress.zip || 'Не указан';
		} else {
			document.getElementById( 'userCity' ).textContent = 'Не указан';
			document.getElementById( 'userStreet' ).textContent = 'Не указана';
			document.getElementById( 'userHouse' ).textContent = 'Не указан';
			document.getElementById( 'userZip' ).textContent = 'Не указан';
		}

		API.showNotification( 'Адрес удален', 'success' );
	}

	/**
	 * Установка адреса по умолчанию
	 */
	setDefaultAddress( id ) {
		const address = this.addresses.find( a => a.id === id );
		if ( !address ) return;

		this.currentUser.defaultAddressId = id;
		this.currentUser.defaultAddress = {
			city: address.city,
			street: address.street,
			house: address.house,
			building: address.building,
			apartment: address.apartment,
			zip: address.zip,
			country: address.country
		};

		this.currentUser.addresses = this.addresses;
		this.saveUserToStorage();

		// Обновляем отображение
		this.loadAddresses();

		// Обновляем правую колонку
		document.getElementById( 'userCity' ).textContent = address.city || 'Не указан';
		document.getElementById( 'userStreet' ).textContent = address.street || 'Не указана';
		document.getElementById( 'userHouse' ).textContent = address.house || 'Не указан';
		document.getElementById( 'userZip' ).textContent = address.zip || 'Не указан';

		API.showNotification( 'Адрес установлен по умолчанию', 'success' );
	}

	/**
	 * Сохранение адреса из формы
	 */
	saveAddress( e ) {
		e.preventDefault();

		const addressData = {
			id: this.currentEditingAddressId || Date.now(),
			country: document.getElementById( 'addressCountry' ).value,
			zip: document.getElementById( 'addressZip' ).value,
			city: document.getElementById( 'addressCity' ).value.trim(),
			street: document.getElementById( 'addressStreet' ).value.trim(),
			house: document.getElementById( 'addressHouse' ).value.trim(),
			building: document.getElementById( 'addressBuilding' ).value.trim(),
			apartment: document.getElementById( 'addressApartment' ).value.trim(),
			comment: document.getElementById( 'addressComment' ).value.trim(),
			createdAt: this.currentEditingAddressId ? undefined : new Date().toISOString()
		};

		// Валидация
		if ( !addressData.city || !addressData.street || !addressData.house ) {
			API.showNotification( 'Заполните город, улицу и дом', 'error' );
			return;
		}

		if ( this.currentEditingAddressId ) {
			// Обновляем существующий адрес
			const index = this.addresses.findIndex( a => a.id === this.currentEditingAddressId );
			if ( index !== -1 ) {
				this.addresses[index] = { ...this.addresses[index], ...addressData };
			}
		} else {
			// Добавляем новый адрес
			this.addresses.push( addressData );
		}

		// Если выбран как адрес по умолчанию или это первый адрес
		const isDefault = document.getElementById( 'addressDefault' ).checked;
		if ( isDefault || this.addresses.length === 1 ) {
			this.currentUser.defaultAddressId = addressData.id;
			this.currentUser.defaultAddress = {
				city: addressData.city,
				street: addressData.street,
				house: addressData.house,
				building: addressData.building,
				apartment: addressData.apartment,
				zip: addressData.zip,
				country: addressData.country
			};

			// Обновляем правую колонку
			document.getElementById( 'userCity' ).textContent = addressData.city;
			document.getElementById( 'userStreet' ).textContent = addressData.street;
			document.getElementById( 'userHouse' ).textContent = addressData.house;
			document.getElementById( 'userZip' ).textContent = addressData.zip || 'Не указан';
		}

		this.currentUser.addresses = this.addresses;
		this.saveUserToStorage();

		// Сбрасываем форму
		this.resetAddressForm();

		// Обновляем список адресов
		this.loadAddresses();

		API.showNotification( this.currentEditingAddressId ? 'Адрес обновлен' : 'Адрес добавлен', 'success' );
	}

	/**
	 * Сброс формы адреса
	 */
	resetAddressForm() {
		this.currentEditingAddressId = null;
		document.getElementById( 'addressForm' ).reset();
		document.getElementById( 'addressCountry' ).value = 'Россия';

		const submitBtn = document.querySelector( '#addressForm button[type="submit"]' );
		if ( submitBtn ) {
			submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить адрес';
		}
	}

	/**
	 * Отмена редактирования адреса
	 */
	cancelAddressEdit() {
		this.resetAddressForm();
	}

	/**
	 * Сохранение пользователя в хранилище
	 */
	saveUserToStorage() {
		// Обновляем в общем списке пользователей
		const allUsers = JSON.parse( localStorage.getItem( 'komori_users' ) || '[]' );
		const userIndex = allUsers.findIndex( u => u.id === this.currentUser.id );
		if ( userIndex !== -1 ) {
			allUsers[userIndex] = this.currentUser;
			localStorage.setItem( 'komori_users', JSON.stringify( allUsers ) );
		}

		// Обновляем текущего пользователя
		localStorage.setItem( 'komori_current_user', JSON.stringify( this.currentUser ) );
	}

	/**
	 * Загрузка аватара пользователя
	 */
	loadAvatar() {
		const avatarImg = document.getElementById( 'profileAvatar' );
		const avatarPlaceholder = document.getElementById( 'avatarPlaceholder' );

		if ( this.currentUser.avatar ) {
			// Если есть сохраненный аватар
			if ( avatarImg ) {
				avatarImg.src = this.currentUser.avatar;
				avatarImg.style.display = 'block';
			}
			if ( avatarPlaceholder ) {
				avatarPlaceholder.style.display = 'none';
			}
		} else {
			// Показываем иконку по умолчанию
			if ( avatarImg ) {
				avatarImg.style.display = 'none';
			}
			if ( avatarPlaceholder ) {
				avatarPlaceholder.style.display = 'block';
			}
		}
	}

	/**
	 * Обновление аватара в шапке сайта
	 */
	updateHeaderAvatar() {
		const headerAvatar = document.getElementById( 'headerAvatar' );
		const headerAvatarIcon = document.getElementById( 'headerAvatarIcon' );

		if ( headerAvatar && headerAvatarIcon ) {
			if ( this.currentUser.avatar ) {
				headerAvatar.src = this.currentUser.avatar;
				headerAvatar.style.display = 'block';
				headerAvatarIcon.style.display = 'none';
			} else {
				headerAvatar.style.display = 'none';
				headerAvatarIcon.style.display = 'block';
			}
		}
	}

	/**
	 * Загрузка заказов пользователя
	 */
	loadUserOrders() {
		// Загрузка заказов пользователя из localStorage
		const allOrders = JSON.parse( localStorage.getItem( 'komori_orders' ) || '[]' );
		this.userOrders = allOrders.filter( order => order.userId === this.currentUser.id );

		this.renderOrders();
	}

	// ========== ОТОБРАЖЕНИЕ ДАННЫХ ==========

	/**
	 * Отображение заказов на странице
	 */
	renderOrders() {
		const recentOrdersList = document.getElementById( 'recentOrdersList' );
		const allOrdersList = document.getElementById( 'allOrdersList' );

		if ( this.userOrders.length === 0 ) {
			const emptyHTML = `
                <div class="empty-orders">
                    <i class="fas fa-shopping-bag"></i>
                    <p>У вас пока нет заказов</p>
                    <a href="/pages html/catalog.html" class="btn-primary">Перейти в каталог</a>
                </div>
            `;
			if ( recentOrdersList ) recentOrdersList.innerHTML = emptyHTML;
			if ( allOrdersList ) allOrdersList.innerHTML = emptyHTML;
			return;
		}

		// Обновляем статистику
		const totalSpent = this.userOrders.reduce( ( sum, order ) => sum + order.total, 0 );
		document.getElementById( 'totalSpent' ).textContent = `${totalSpent.toLocaleString()} ₽`;
		document.getElementById( 'ordersCount' ).textContent = this.userOrders.length;

		// Последние 3 заказа
		const recentOrders = this.userOrders.slice( -3 ).reverse();
		if ( recentOrdersList ) {
			recentOrdersList.innerHTML = recentOrders.map( order => this.renderOrderCard( order ) ).join( '' );
		}

		// Все заказы
		if ( allOrdersList ) {
			const allOrdersReversed = [...this.userOrders].reverse();
			allOrdersList.innerHTML = allOrdersReversed.map( order => this.renderOrderCard( order ) ).join( '' );
		}
	}

	/**
	 * Отображение карточки заказа
	 */
	renderOrderCard( order ) {
		const date = new Date( order.createdAt );
		const formattedDate = date.toLocaleDateString( 'ru-RU', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		} );

		const statusClass = this.getOrderStatusClass( order.status );
		const statusText = this.getOrderStatusText( order.status );

		return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <span class="order-number">Заказ №${order.id}</span>
                        <span class="order-date">от ${formattedDate}</span>
                    </div>
                    <div class="order-status ${statusClass}">
                        <i class="fas ${this.getOrderStatusIcon( order.status )}"></i>
                        ${statusText}
                    </div>
                </div>
                <div class="order-items">
                    ${order.items.map( item => `
                        <div class="order-item">
                            <img src="${API.getSafeImageUrl( item.image )}" alt="${item.name}" class="order-item-image">
                            <div class="order-item-info">
                                <div class="order-item-name">${this.escapeHtml( item.name )}</div>
                                <div class="order-item-quantity">${item.quantity} шт.</div>
                            </div>
                            <div class="order-item-price">${API.formatPrice( item.price * item.quantity )}</div>
                        </div>
                    ` ).join( '' )}
                </div>
                <div class="order-footer">
                    <div class="order-total">
                        <span>Итого:</span>
                        <strong>${API.formatPrice( order.total )}</strong>
                    </div>
                    <button class="order-repeat-btn" data-order-id="${order.id}">
                        <i class="fas fa-repeat"></i>
                        Повторить заказ
                    </button>
                </div>
            </div>
        `;
	}

	/**
	 * Получение класса статуса заказа
	 */
	getOrderStatusClass( status ) {
		const classes = {
			'pending': 'status-pending',
			'processing': 'status-processing',
			'shipped': 'status-shipped',
			'delivered': 'status-delivered',
			'cancelled': 'status-cancelled'
		};
		return classes[status] || 'status-pending';
	}

	/**
	 * Получение текста статуса заказа
	 */
	getOrderStatusText( status ) {
		const texts = {
			'pending': 'Ожидает обработки',
			'processing': 'В обработке',
			'shipped': 'Отправлен',
			'delivered': 'Доставлен',
			'cancelled': 'Отменен'
		};
		return texts[status] || 'Ожидает обработки';
	}

	/**
	 * Получение иконки статуса заказа
	 */
	getOrderStatusIcon( status ) {
		const icons = {
			'pending': 'fa-clock',
			'processing': 'fa-spinner',
			'shipped': 'fa-truck',
			'delivered': 'fa-check-circle',
			'cancelled': 'fa-times-circle'
		};
		return icons[status] || 'fa-clock';
	}

	/**
	 * Загрузка избранных товаров
	 */
	loadFavorites() {
		const favorites = store.getFavorites();
		const favoritesGrid = document.getElementById( 'profileFavoritesGrid' );

		if ( favorites.length === 0 ) {
			favoritesGrid.innerHTML = `
                <div class="empty-favorites">
                    <i class="far fa-heart"></i>
                    <p>В избранном пока ничего нет</p>
                    <a href="/pages html/catalog.html" class="btn-primary">Добавить товары</a>
                </div>
            `;
			return;
		}

		favoritesGrid.innerHTML = favorites.map( product => this.renderFavoriteCard( product ) ).join( '' );
	}

	/**
	 * Отображение карточки избранного товара
	 */
	renderFavoriteCard( product ) {
		return `
            <div class="favorite-card" data-id="${product.id}">
                <div class="favorite-image">
                    <img src="${API.getSafeImageUrl( product.image )}" alt="${product.name}"
                         onerror="this.src='${API.getFallbackSvg( product.name )}'">
                    <button class="remove-favorite" data-id="${product.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="favorite-info">
                    <h4 class="favorite-name">${this.escapeHtml( product.name )}</h4>
                    <div class="favorite-price">${API.formatPrice( product.price )}</div>
                    <button class="add-to-cart-btn" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </button>
                </div>
            </div>
        `;
	}

	// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

	/**
	 * Привязка всех событий на странице
	 */
	bindEvents() {
		// Переключение вкладок профиля
		const navBtns = document.querySelectorAll( '.profile-nav-btn' );
		const tabs = document.querySelectorAll( '.profile-tab' );

		navBtns.forEach( btn => {
			btn.addEventListener( 'click', () => {
				const tabId = btn.dataset.tab;

				navBtns.forEach( b => b.classList.remove( 'active' ) );
				btn.classList.add( 'active' );

				tabs.forEach( tab => tab.classList.remove( 'active' ) );
				const tabElement = document.getElementById( `${tabId}Tab` );
				if ( tabElement ) {
					tabElement.classList.add( 'active' );
				}

				// Если переключились на вкладку избранного - обновляем
				if ( tabId === 'favorites' ) {
					this.loadFavorites();
				}

				// Если переключились на вкладку адреса - обновляем
				if ( tabId === 'adres' ) {
					this.loadAddresses();
				}
			} );
		} );

		// Кнопка редактирования профиля
		const editBtn = document.getElementById( 'editProfileBtn' );
		if ( editBtn ) {
			editBtn.addEventListener( 'click', () => {
				// Переключаем на вкладку настроек
				const settingsBtn = document.querySelector( '.profile-nav-btn[data-tab="settings"]' );
				if ( settingsBtn ) settingsBtn.click();
			} );
		}

		// Кнопка редактирования адреса в правой колонке
		const editAddressBtn = document.getElementById( 'editAddressBtn' );
		if ( editAddressBtn ) {
			editAddressBtn.addEventListener( 'click', () => {
				// Переключаем на вкладку адреса
				const adresBtn = document.querySelector( '.profile-nav-btn[data-tab="adres"]' );
				if ( adresBtn ) adresBtn.click();
			} );
		}

		// Загрузка аватара
		this.initAvatarUpload();

		// Форма настроек профиля
		const settingsForm = document.getElementById( 'profileSettingsForm' );
		if ( settingsForm ) {
			settingsForm.addEventListener( 'submit', ( e ) => this.saveProfileSettings( e ) );
		}

		// Форма адреса
		const addressForm = document.getElementById( 'addressForm' );
		if ( addressForm ) {
			addressForm.addEventListener( 'submit', ( e ) => this.saveAddress( e ) );
		}

		// Кнопка отмены редактирования адреса
		const cancelAddressBtn = document.getElementById( 'cancelAddressBtn' );
		if ( cancelAddressBtn ) {
			cancelAddressBtn.addEventListener( 'click', () => this.cancelAddressEdit() );
		}

		// Кнопка выхода из аккаунта
		const logoutBtn = document.getElementById( 'logoutBtn' );
		if ( logoutBtn ) {
			logoutBtn.addEventListener( 'click', () => this.logout() );
		}

		// Кнопка смены пароля
		const changePasswordBtn = document.getElementById( 'changePasswordBtn' );
		if ( changePasswordBtn ) {
			changePasswordBtn.addEventListener( 'click', () => this.openChangePasswordModal() );
		}

		// Модальное окно смены пароля
		this.initChangePasswordModal();

		// Повтор заказа
		document.addEventListener( 'click', ( e ) => {
			if ( e.target.closest( '.order-repeat-btn' ) ) {
				const btn = e.target.closest( '.order-repeat-btn' );
				const orderId = btn.dataset.orderId;
				this.repeatOrder( orderId );
			}
		} );

		// Удаление из избранного
		document.addEventListener( 'click', ( e ) => {
			if ( e.target.closest( '.remove-favorite' ) ) {
				const btn = e.target.closest( '.remove-favorite' );
				const productId = btn.dataset.id;
				store.toggleFavorite( productId );
				this.loadFavorites();
				API.updateHeaderCounters();
				API.showNotification( 'Товар удален из избранного' );
			}
		} );

		// Добавление в корзину из избранного
		document.addEventListener( 'click', ( e ) => {
			if ( e.target.closest( '.add-to-cart-btn' ) ) {
				const btn = e.target.closest( '.add-to-cart-btn' );
				const productId = btn.dataset.id;
				if ( store.addToCart( productId, 1 ) ) {
					API.showNotification( 'Товар добавлен в корзину' );
					API.updateHeaderCounters();
				} else {
					API.showNotification( 'Не удалось добавить товар', 'error' );
				}
			}
		} );
	}

	/**
	 * Инициализация загрузки аватара
	 */
	initAvatarUpload() {
		const avatarUpload = document.getElementById( 'avatarUpload' );
		const changeAvatarBtn = document.getElementById( 'changeAvatarBtn' );

		if ( changeAvatarBtn && avatarUpload ) {
			changeAvatarBtn.addEventListener( 'click', () => {
				avatarUpload.click();
			} );
		}

		if ( avatarUpload ) {
			avatarUpload.addEventListener( 'change', ( e ) => this.handleAvatarUpload( e ) );
		}
	}

	/**
	 * Инициализация модального окна смены пароля
	 */
	initChangePasswordModal() {
		const modal = document.getElementById( 'changePasswordModal' );
		if ( !modal ) return;

		const closeModal = modal.querySelector( '.close-modal' );
		const cancelBtn = document.getElementById( 'cancelChangePassword' );
		const submitBtn = document.getElementById( 'submitChangePassword' );

		if ( closeModal ) {
			closeModal.addEventListener( 'click', () => this.closeChangePasswordModal() );
		}

		if ( cancelBtn ) {
			cancelBtn.addEventListener( 'click', () => this.closeChangePasswordModal() );
		}

		if ( submitBtn ) {
			submitBtn.addEventListener( 'click', () => this.changePassword() );
		}

		// Закрытие модалки по клику вне
		window.addEventListener( 'click', ( e ) => {
			if ( e.target === modal ) {
				this.closeChangePasswordModal();
			}
		} );
	}

	// ========== ЗАГРУЗКА АВАТАРА ==========

	/**
	 * Обработка загрузки аватара
	 */
	handleAvatarUpload( e ) {
		const file = e.target.files[0];
		if ( !file ) return;

		// Проверяем тип файла
		if ( !file.type.startsWith( 'image/' ) ) {
			API.showNotification( 'Пожалуйста, выберите изображение', 'error' );
			return;
		}

		// Проверяем размер (макс 2MB)
		if ( file.size > 2 * 1024 * 1024 ) {
			API.showNotification( 'Размер файла не должен превышать 2MB', 'error' );
			return;
		}

		const reader = new FileReader();
		reader.onload = ( e ) => {
			const avatarData = e.target.result;

			// Сохраняем аватар в объекте пользователя
			this.currentUser.avatar = avatarData;

			// Сохраняем в хранилище
			this.saveUserToStorage();

			// Обновляем отображение аватара на странице профиля
			const avatarImg = document.getElementById( 'profileAvatar' );
			const avatarPlaceholder = document.getElementById( 'avatarPlaceholder' );

			if ( avatarImg ) {
				avatarImg.src = avatarData;
				avatarImg.style.display = 'block';
			}
			if ( avatarPlaceholder ) {
				avatarPlaceholder.style.display = 'none';
			}

			// Обновляем аватар в шапке
			this.updateHeaderAvatar();

			API.showNotification( 'Аватар успешно загружен', 'success' );
		};

		reader.onerror = () => {
			API.showNotification( 'Ошибка загрузки изображения', 'error' );
		};

		reader.readAsDataURL( file );
	}

	// ========== НАСТРОЙКИ ПРОФИЛЯ ==========

	/**
	 * Сохранение настроек профиля
	 */
	saveProfileSettings( e ) {
		e.preventDefault();

		const newName = document.getElementById( 'profileName' ).value.trim();
		const newEmail = document.getElementById( 'profileEmail' ).value.trim();
		const newPhone = document.getElementById( 'profilePhone' ).value.trim();
		const newPassword = document.getElementById( 'profilePassword' ).value;
		const confirmPassword = document.getElementById( 'profileConfirmPassword' ).value;
		const subscribe = document.getElementById( 'profileSubscribe' ).checked;

		// Валидация
		if ( !newName || !newEmail ) {
			API.showNotification( 'Заполните имя и email', 'error' );
			return;
		}

		// Проверка email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if ( !emailRegex.test( newEmail ) ) {
			API.showNotification( 'Введите корректный email', 'error' );
			return;
		}

		// Если введен новый пароль
		if ( newPassword ) {
			if ( newPassword.length < 8 ) {
				API.showNotification( 'Пароль должен содержать минимум 8 символов', 'error' );
				return;
			}
			if ( newPassword !== confirmPassword ) {
				API.showNotification( 'Пароли не совпадают', 'error' );
				return;
			}
			this.currentUser.password = newPassword;
		}

		// Обновляем данные
		this.currentUser.name = newName;
		this.currentUser.email = newEmail;
		this.currentUser.phone = newPhone;
		this.currentUser.subscribe = subscribe;

		// Сохраняем
		this.saveUserToStorage();

		// Обновляем отображение
		this.loadUserData();

		// Очищаем поля пароля
		document.getElementById( 'profilePassword' ).value = '';
		document.getElementById( 'profileConfirmPassword' ).value = '';

		API.showNotification( 'Данные успешно обновлены', 'success' );
	}

	// ========== СМЕНА ПАРОЛЯ ==========

	/**
	 * Открытие модального окна смены пароля
	 */
	openChangePasswordModal() {
		const modal = document.getElementById( 'changePasswordModal' );
		if ( modal ) {
			modal.style.display = 'flex';
			document.getElementById( 'oldPassword' ).value = '';
			document.getElementById( 'newPassword' ).value = '';
			document.getElementById( 'confirmNewPassword' ).value = '';
		}
	}

	/**
	 * Закрытие модального окна смены пароля
	 */
	closeChangePasswordModal() {
		const modal = document.getElementById( 'changePasswordModal' );
		if ( modal ) {
			modal.style.display = 'none';
		}
	}

	/**
	 * Смена пароля пользователя
	 */
	changePassword() {
		const oldPassword = document.getElementById( 'oldPassword' ).value;
		const newPassword = document.getElementById( 'newPassword' ).value;
		const confirmPassword = document.getElementById( 'confirmNewPassword' ).value;

		if ( !oldPassword || !newPassword || !confirmPassword ) {
			API.showNotification( 'Заполните все поля', 'error' );
			return;
		}

		if ( oldPassword !== this.currentUser.password ) {
			API.showNotification( 'Неверный текущий пароль', 'error' );
			return;
		}

		if ( newPassword.length < 8 ) {
			API.showNotification( 'Новый пароль должен содержать минимум 8 символов', 'error' );
			return;
		}

		if ( newPassword !== confirmPassword ) {
			API.showNotification( 'Пароли не совпадают', 'error' );
			return;
		}

		// Обновляем пароль
		this.currentUser.password = newPassword;

		// Сохраняем
		this.saveUserToStorage();

		this.closeChangePasswordModal();
		API.showNotification( 'Пароль успешно изменен', 'success' );
	}

	// ========== ЗАКАЗЫ ==========

	/**
	 * Повтор заказа
	 */
	repeatOrder( orderId ) {
		const order = this.userOrders.find( o => o.id == orderId );
		if ( !order ) return;

		order.items.forEach( item => {
			store.addToCart( item.id, item.quantity );
		} );

		API.showNotification( 'Товары добавлены в корзину', 'success' );
		API.updateHeaderCounters();
	}

	// ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

	/**
	 * Экранирование HTML
	 */
	escapeHtml( str ) {
		if ( !str ) return '';
		return str
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' );
	}

	/**
	 * Выход из аккаунта
	 */
	logout() {
		if ( confirm( 'Вы уверены, что хотите выйти из аккаунта?' ) ) {
			localStorage.removeItem( 'komori_current_user' );
			localStorage.removeItem( 'komori_remembered_user' );
			window.location.href = '/pages html/login.html';
		}
	}
}

// Инициализация при загрузке страницы
document.addEventListener( 'DOMContentLoaded', () => {
	window.profilePage = new ProfilePage();
	console.log( 'Страница профиля инициализирована' );
} );