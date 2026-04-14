/**
 * ============================================================================
 * СТРАНИЦЫ КОРЗИНЫ И ИЗБРАННОГО
 * ============================================================================
 * 
 * Этот класс управляет всем функционалом на страницах корзины и избранного:
 * 
 * 1. КОРЗИНА (cart.html):
 *    - Отображение списка товаров
 *    - Изменение количества товаров (кнопки + / -)
 *    - Удаление отдельных товаров
 *    - Очистка всей корзины
 *    - Применение промокодов
 *    - Расчет итоговой суммы (с учетом скидки)
 * 
 * 2. ИЗБРАННОЕ (favorites.html):
 *    - Отображение списка избранных товаров
 *    - Удаление товаров из избранного
 *    - Очистка всего избранного
 *    - Копирование списка избранного
 *    - Поделиться в соцсетях (ВК, Telegram, WhatsApp)
 * 
 * 3. ОБЩИЙ ФУНКЦИОНАЛ:
 *    - Рекомендации (похожие товары)
 *    - Обновление счетчиков в шапке сайта
 *    - Анимации при удалении товаров
 * 
 * ============================================================================
 */

class CartFavoritesPage {
	constructor() {
		// Текущая страница: 'cart' (корзина) или 'favorites' (избранное)
		this.currentPage = 'cart';

		// Объект с данными примененного промокода (хранится в localStorage)
		// Пример: { discount: 0.1, type: 'percent', code: 'SAKURA10', id: 123 }
		this.appliedPromo = null;

		// Флаг для предотвращения множественной привязки событий
		// Используется при делегировании событий на document
		this.cartEventsBound = false;

		// Инициализация страницы (вызывается при создании экземпляра класса)
		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Главный метод инициализации.
	 * Определяет тип страницы (корзина или избранное) и запускает соответствующие методы.
	 */
	init() {
		// ПРОВЕРКА: какая страница загружена?
		// Ищем элемент с классом .cart-page-content (есть только на странице корзины)
		if ( document.querySelector( '.cart-page-content' ) ) {
			// === МЫ НА СТРАНИЦЕ КОРЗИНЫ ===
			this.currentPage = 'cart';
			console.log( '🛒 Определена страница корзины' );

			// Загружаем примененный промокод из localStorage (если есть)
			this.loadPromoCode();

			// Отрисовываем содержимое корзины
			this.renderCart();

			// Привязываем обработчики событий для корзины (кнопки +, -, удаление)
			this.bindCartEvents();

			// Рендерим блок рекомендаций (похожие товары)
			setTimeout( () => this.renderRecommendations(), 100 );

		} else if ( document.querySelector( '.favorites-page-content' ) ) {
			// === МЫ НА СТРАНИЦЕ ИЗБРАННОГО ===
			this.currentPage = 'favorites';
			console.log( '❤️ Определена страница избранного' );

			// Отрисовываем содержимое избранного
			this.renderFavorites();

			// Привязываем обработчики событий для избранного
			this.bindFavoritesEvents();

			// Рендерим блок рекомендаций
			setTimeout( () => this.renderRecommendations(), 100 );
		}

		// === ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ СОБЫТИЙ ===
		// Эти слушатели работают на обеих страницах

		// Слушаем обновление корзины (когда товар добавлен/удален из любого места сайта)
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( '🔄 Корзина обновлена' );
			if ( this.currentPage === 'cart' ) {
				this.renderCart();              // Перерисовываем корзину
				this.renderRecommendations();   // Обновляем рекомендации
			}
			this.updateHeaderCounters();         // Обновляем счетчики в шапке
		} );

		// Слушаем обновление избранного
		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( '🔄 Избранное обновлено' );
			if ( this.currentPage === 'favorites' ) {
				this.renderFavorites();         // Перерисовываем избранное
				this.renderRecommendations();   // Обновляем рекомендации
			}
			this.updateHeaderCounters();         // Обновляем счетчики в шапке
		} );

		// Слушаем обновление товаров (добавление/редактирование в админке)
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '🔄 Товары обновлены' );
			this.renderRecommendations();       // Обновляем рекомендации
		} );

		// Инициализируем обработчики модальных окон (из API)
		API.initModalHandlers();

		// Обновляем счетчики в шапке сайта (корзина и избранное)
		this.updateHeaderCounters();
	}

	// =========================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// =========================================================================

	/**
	 * ПОЛУЧАЕТ URL СТРАНИЦЫ КАТЕГОРИИ ПО КЛЮЧУ
	 * Используется для создания ссылок на товары
	 * 
	 * @param {string} categoryKey - ключ категории (figures, tea, sweets и т.д.)
	 * @returns {string} URL страницы категории
	 */
	getCategoryUrl( categoryKey ) {
		// Соответствие ключей категорий URL страниц
		const categoryUrls = {
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

		// Если категория не найдена, возвращаем общий каталог
		return categoryUrls[categoryKey] || '/pages html/catalog.html';
	}

	/**
	 * Обновляет счетчики в шапке сайта (корзина и избранное)
	 * Вызывается после любого изменения корзины или избранного
	 */
	updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );

		if ( cartCount ) {
			cartCount.textContent = store.getCartCount();
		}

		if ( favoritesCount ) {
			favoritesCount.textContent = store.favorites.length;
		}
	}

	/**
	 * Склонение слов (1 товар, 2 товара, 5 товаров)
	 * 
	 * @param {number} number - число
	 * @param {Array} words - варианты слов ['товар', 'товара', 'товаров']
	 * @returns {string} правильная форма
	 */
	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}

	/**
	 * Анимация удаления элемента
	 * 
	 * @param {HTMLElement} element - удаляемый элемент
	 * @param {Function} callback - функция, вызываемая после анимации
	 */
	animateRemove( element, callback ) {
		if ( !element ) return;

		// Добавляем CSS переход для плавного исчезания
		element.style.transition = 'all 0.3s ease';
		element.style.opacity = '0';
		element.style.transform = 'translateX(-20px)';

		// После завершения анимации (300 мс) вызываем callback
		setTimeout( () => {
			if ( callback ) callback();
			if ( element.parentNode ) element.remove();
		}, 300 );
	}

	// =========================================================================
	// КОРЗИНА: ОТОБРАЖЕНИЕ
	// =========================================================================

	/**
	 * Отрисовывает содержимое корзины
	 * Вызывается при загрузке страницы и после каждого изменения корзины
	 */
	renderCart() {
		console.log( '🛒 Рендерим корзину...' );

		// Получаем DOM-элементы
		const cartWithItems = document.getElementById( 'cartWithItems' );   // Контейнер с товарами
		const cartEmptyState = document.getElementById( 'cartEmptyState' ); // Состояние "пустая корзина"
		const cartItemsList = document.getElementById( 'cartItemsList' );   // Список товаров

		// Получаем сырые данные из store.cart (только ID и количество)
		const cartItems = store.cart; // [{ id: "123", quantity: 2 }, ...]

		console.log( '📦 Товары в корзине (сырые данные):', cartItems );

		// Если корзина пуста - показываем пустое состояние
		if ( !cartItems || cartItems.length === 0 ) {
			if ( cartWithItems ) cartWithItems.style.display = 'none';
			if ( cartEmptyState ) cartEmptyState.style.display = 'block';
			this.updateCartSummary(); // Обновляем итоги (будут нули)
			return;
		}

		// Корзина не пуста - показываем товары
		if ( cartWithItems ) cartWithItems.style.display = 'grid';
		if ( cartEmptyState ) cartEmptyState.style.display = 'none';

		// Генерируем HTML для каждого товара
		if ( cartItemsList ) {
			cartItemsList.innerHTML = cartItems.map( item => {
				// Получаем полную информацию о товаре из store.products
				const product = store.getProduct( item.id );
				if ( !product ) return ''; // Товар не найден - пропускаем
				return this.renderCartItem( product, item.quantity );
			} ).filter( html => html !== '' ).join( '' );
		}

		// Обновляем итоговые суммы в боковой панели
		this.updateCartSummary();
	}

	/**
	 * Отрисовка одной строки товара в корзине
	 * 
	 * @param {Object} product - полный объект товара из store.products
	 * @param {number} quantity - количество из корзины
	 * @returns {string} HTML-код строки товара
	 */
	renderCartItem( product, quantity ) {
		// Проверяем, осталось ли мало товара (<= 3 шт.)
		const isLowStock = product && product.quantity <= 3;

		// Получаем ссылку на страницу категории товара
		const categoryUrl = this.getCategoryUrl( product.category );

		return `
            <div class="cart-item-row" data-id="${product.id}">
                <!-- КОЛОНКА 1: Информация о товаре (изображение + название + категория) -->
                <div class="cart-col-product">
                    <div class="cart-product-info">
                        <!-- Ссылка на изображение ведет на страницу категории -->
                        <a href="${categoryUrl}" class="cart-product-image-link">
                            <img src="${API.getSafeImageUrl( product.image )}" 
                                 alt="${product.name}"
                                 class="cart-product-image"
                                 onerror="this.src='${API.getFallbackSvg( product.name )}'">
                        </a>
                        <div class="cart-product-details">
                            <h3 class="cart-product-title">
                                <!-- Название товара ведет на страницу категории -->
                                <a href="${categoryUrl}">${product.name}</a>
                            </h3>
                            <div class="cart-product-attributes">
                                <!-- Категория товара тоже является ссылкой -->
                                <span class="cart-product-category">
                                    <a href="${categoryUrl}">${store.getCategoryName( product.category || '' )}</a>
                                </span>
                                <span class="cart-product-stock ${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                    <i class="fas ${product.quantity > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                                    ${product.quantity > 0 ? 'В наличии' : 'Нет в наличии'}
                                    ${isLowStock ? '<span class="low-stock-warning"> (Осталось мало)</span>' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- КОЛОНКА 2: Цена -->
                <div class="cart-col-price">
                    <div class="cart-price-current">${API.formatPrice( product.price )}</div>
                    ${product.oldPrice ? `<div class="cart-price-old">${API.formatPrice( product.oldPrice )}</div>` : ''}
                </div>
                
                <!-- КОЛОНКА 3: Количество (кнопки + и -) -->
                <div class="cart-col-quantity">
                    <div class="cart-quantity-control">
                        <button class="cart-quantity-btn minus" data-id="${product.id}">-</button>
                        <input type="number" class="cart-quantity-input" value="${quantity}" 
                               min="1" max="${product.quantity}" data-id="${product.id}">
                        <button class="cart-quantity-btn plus" data-id="${product.id}" 
                                ${quantity >= product.quantity ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                
                <!-- КОЛОНКА 4: Сумма за этот товар (цена × количество) -->
                <div class="cart-col-total">
                    <div class="cart-item-total">${API.formatPrice( product.price * quantity )}</div>
                </div>
                
                <!-- КОЛОНКА 5: Кнопка удаления товара -->
                <div class="cart-col-remove">
                    <button class="cart-remove-item" data-id="${product.id}" title="Удалить товар">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
	}

	/**
	 * Обновляет итоговые суммы в корзине
	 * Рассчитывает: подытог (сумма без скидки), скидку, итог (с учетом скидки)
	 */
	updateCartSummary() {
		// Получаем количество товаров и общую сумму без скидки
		const count = store.getCartCount();           // Общее количество товаров
		const subtotal = store.getCartTotal();        // Сумма без скидки

		let discount = 0;      // Сумма скидки
		let total = subtotal;  // Итоговая сумма (с учетом скидки)

		// Если применен промокод - рассчитываем скидку
		if ( this.appliedPromo ) {
			if ( this.appliedPromo.type === 'percent' ) {
				// Процентная скидка (например, 0.1 = 10%)
				discount = subtotal * this.appliedPromo.discount;
			} else if ( this.appliedPromo.type === 'fixed' ) {
				// Фиксированная скидка (например, 500 ₽)
				discount = this.appliedPromo.discount;
			}
			// Скидка не может быть больше суммы заказа
			discount = Math.min( discount, subtotal );
			total = subtotal - discount;
		}

		// ========== ОБНОВЛЯЕМ ЗАГОЛОВОК СТРАНИЦЫ ==========
		const itemsCountElement = document.querySelector( '.cart-items-count' );
		const totalAmountElement = document.querySelector( '.cart-total-amount' );

		if ( itemsCountElement ) {
			itemsCountElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}

		if ( totalAmountElement ) {
			totalAmountElement.textContent = `на сумму ${API.formatPrice( subtotal )}`;
		}

		// ========== ОБНОВЛЯЕМ БОКОВУЮ ПАНЕЛЬ ==========
		const cartSubtotal = document.getElementById( 'cartSubtotal' );     // Подытог (Товары)
		const discountAmount = document.querySelector( '.discount-amount' ); // Сумма скидки
		const cartTotalById = document.getElementById( 'cartTotal' );       // Итог (по ID)
		const totalAmountByClass = document.querySelector( '.total-amount' ); // Итог (по классу)
		const cartItemsCount = document.getElementById( 'cartItemsCount' ); // Количество товаров

		// Подытог (сумма товаров без скидки)
		if ( cartSubtotal ) {
			cartSubtotal.textContent = API.formatPrice( subtotal );
		}

		// Строка со скидкой
		if ( discountAmount ) {
			discountAmount.textContent = discount > 0 ? `-${API.formatPrice( discount )}` : '0 ₽';
			discountAmount.style.color = discount > 0 ? '#2ecc71' : '';
		}

		// Итоговая сумма (по ID)
		if ( cartTotalById ) {
			cartTotalById.textContent = API.formatPrice( total );
		}

		// Итоговая сумма (по классу) - для надежности обновляем оба элемента
		if ( totalAmountByClass ) {
			totalAmountByClass.textContent = API.formatPrice( total );
		}

		// Количество товаров
		if ( cartItemsCount ) {
			cartItemsCount.textContent = count;
		}
	}

	/**
	 * Обновление суммы конкретного товара в корзине (без перерисовки всей таблицы)
	 * 
	 * @param {string|number} productId - ID товара
	 * @param {number} newQuantity - новое количество
	 */
	updateCartItemTotal( productId, newQuantity ) {
		// Находим строку товара по data-id
		const row = document.querySelector( `.cart-item-row[data-id="${productId}"]` );
		if ( !row ) return;

		// Получаем полные данные товара
		const product = store.getProduct( productId );
		if ( !product ) return;

		// Обновляем сумму в колонке "Сумма"
		const totalElement = row.querySelector( '.cart-item-total' );
		if ( totalElement ) {
			totalElement.textContent = API.formatPrice( product.price * newQuantity );
		}

		// Обновляем состояние кнопки "+" (блокируем, если достигнут максимум)
		const plusBtn = row.querySelector( '.cart-quantity-btn.plus' );
		if ( plusBtn ) {
			if ( newQuantity >= product.quantity ) {
				plusBtn.disabled = true;
			} else {
				plusBtn.disabled = false;
			}
		}
	}

	// =========================================================================
	// КОРЗИНА: ОБРАБОТЧИКИ СОБЫТИЙ
	// =========================================================================

	/**
	 * Привязывает обработчики событий для корзины
	 * Используется делегирование событий (один обработчик на document)
	 */
	bindCartEvents() {
		console.log( '🔗 Привязка событий корзины...' );

		// Удаляем старый обработчик, если он был (предотвращаем дублирование)
		if ( this.cartEventsBound ) {
			document.removeEventListener( 'click', this.handleDocumentClick );
		}

		// Создаем единый обработчик клика на document
		// Это называется "делегирование событий" - все клики обрабатываются здесь
		this.handleDocumentClick = ( e ) => {
			const target = e.target;

			// ===== ОБРАБОТКА КНОПКИ "+" (увеличение количества) =====
			const plusBtn = target.closest( '.cart-quantity-btn.plus' );
			if ( plusBtn && plusBtn.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = plusBtn.dataset.id;
				const input = plusBtn.closest( '.cart-quantity-control' ).querySelector( '.cart-quantity-input' );
				const currentValue = parseInt( input.value );
				const maxValue = parseInt( input.max );

				if ( currentValue < maxValue ) {
					const newValue = currentValue + 1;
					if ( store.updateCartQuantity( id, newValue ) ) {
						input.value = newValue;
						this.updateCartItemTotal( id, newValue );
						this.updateCartSummary();
						this.renderRecommendations();
					}
				}
				return;
			}

			// ===== ОБРАБОТКА КНОПКИ "-" (уменьшение количества) =====
			const minusBtn = target.closest( '.cart-quantity-btn.minus' );
			if ( minusBtn && minusBtn.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = minusBtn.dataset.id;
				const input = minusBtn.closest( '.cart-quantity-control' ).querySelector( '.cart-quantity-input' );
				const currentValue = parseInt( input.value );

				if ( currentValue > 1 ) {
					const newValue = currentValue - 1;
					if ( store.updateCartQuantity( id, newValue ) ) {
						input.value = newValue;
						this.updateCartItemTotal( id, newValue );
						this.updateCartSummary();
						this.renderRecommendations();
					}
				}
				return;
			}

			// ===== ОБРАБОТКА РУЧНОГО ВВОДА КОЛИЧЕСТВА =====
			const quantityInput = target.closest( '.cart-quantity-input' );
			if ( quantityInput && quantityInput.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = quantityInput.dataset.id;
				let newValue = parseInt( quantityInput.value );
				const maxValue = parseInt( quantityInput.max );
				const minValue = parseInt( quantityInput.min ) || 1;

				// Валидация введенного значения
				if ( isNaN( newValue ) ) newValue = minValue;
				if ( newValue < minValue ) newValue = minValue;
				if ( newValue > maxValue ) newValue = maxValue;

				if ( store.updateCartQuantity( id, newValue ) ) {
					quantityInput.value = newValue;
					this.updateCartItemTotal( id, newValue );
					this.updateCartSummary();
					this.renderRecommendations();
				}
				return;
			}

			// ===== ОБРАБОТКА УДАЛЕНИЯ ТОВАРА =====
			const removeBtn = target.closest( '.cart-remove-item' );
			if ( removeBtn && removeBtn.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = removeBtn.dataset.id;
				const row = removeBtn.closest( '.cart-item-row' );

				// Анимированное удаление
				this.animateRemove( row, () => {
					store.removeFromCart( id );
					this.renderRecommendations();
				} );
				return;
			}
		};

		// Привязываем обработчик
		document.addEventListener( 'click', this.handleDocumentClick );
		this.cartEventsBound = true;

		// ===== КНОПКА ОЧИСТКИ ВСЕЙ КОРЗИНЫ =====
		const clearCartBtn = document.getElementById( 'clearCartBtn' );
		if ( clearCartBtn ) {
			clearCartBtn.removeEventListener( 'click', this.handleClearCart );
			this.handleClearCart = () => {
				if ( confirm( '🗑️ Вы уверены, что хотите очистить корзину?' ) ) {
					store.clearCart();
					this.resetPromoCode();      // Сбрасываем промокод
					this.renderRecommendations();
				}
			};
			clearCartBtn.addEventListener( 'click', this.handleClearCart );
		}

		// ===== КНОПКА ОФОРМЛЕНИЯ ЗАКАЗА =====
		const checkoutBtn = document.getElementById( 'checkoutBtn' );
		if ( checkoutBtn ) {
			checkoutBtn.removeEventListener( 'click', this.handleCheckout );
			this.handleCheckout = () => this.openCheckoutModal();
			checkoutBtn.addEventListener( 'click', this.handleCheckout );
		}

		// ===== КНОПКА ПРИМЕНЕНИЯ ПРОМОКОДА =====
		const applyPromoBtn = document.getElementById( 'applyPromoBtn' );
		if ( applyPromoBtn ) {
			applyPromoBtn.removeEventListener( 'click', this.handleApplyPromo );
			this.handleApplyPromo = () => this.applyPromoCode();
			applyPromoBtn.addEventListener( 'click', this.handleApplyPromo );
		}
	}

	// =========================================================================
	// ИЗБРАННОЕ: ОТОБРАЖЕНИЕ
	// =========================================================================

	/**
	 * Отрисовывает содержимое избранного
	 * Вызывается при загрузке страницы и после каждого изменения избранного
	 */
	renderFavorites() {
		console.log( '❤️ Рендерим избранное...' );

		// Получаем DOM-элементы
		const container = document.getElementById( 'favoritesItems' );    // Контейнер с товарами
		const emptyState = document.getElementById( 'favoritesEmpty' );  // Состояние "пустое избранное"
		const countElement = document.getElementById( 'favoritesCount' ); // Счетчик товаров
		const totalElement = document.getElementById( 'favoritesTotal' ); // Общая сумма

		// Получаем избранные товары из store
		const favorites = store.getFavorites();

		console.log( '📦 Товаров в избранном:', favorites.length );

		// Если избранное пусто
		if ( favorites.length === 0 ) {
			if ( container ) {
				container.style.display = 'none';
				container.innerHTML = '';
			}
			if ( emptyState ) emptyState.style.display = 'block';
			if ( countElement ) countElement.textContent = '0 товаров';
			if ( totalElement ) totalElement.textContent = 'на сумму 0 ₽';
			return;
		}

		// Показываем товары
		if ( container ) {
			container.style.display = 'grid';
			container.innerHTML = favorites.map( product => this.renderFavoriteCard( product ) ).join( '' );
		}
		if ( emptyState ) emptyState.style.display = 'none';

		// Рассчитываем общую сумму избранных товаров
		const total = favorites.reduce( ( sum, item ) => sum + item.price, 0 );
		const count = favorites.length;

		// Обновляем информацию
		if ( countElement ) {
			countElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}
		if ( totalElement ) {
			totalElement.textContent = `на сумму ${API.formatPrice( total )}`;
		}

		// Обновляем счетчик в шапке
		this.updateHeaderCounters();
	}

	/**
	 * Отрисовка карточки избранного товара
	 * 
	 * @param {Object} product - полный объект товара
	 * @returns {string} HTML-код карточки
	 */
	renderFavoriteCard( product ) {
		// Проверяем, есть ли товар в корзине
		const inCart = store.cart.find( item => item.id == product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		// Получаем ссылку на страницу категории товара
		const categoryUrl = this.getCategoryUrl( product.category );

		// Определяем статус наличия товара
		let stockClass = 'in-stock';
		let stockText = 'В наличии';
		let stockIcon = 'fa-check-circle';

		if ( product.status !== 'in-stock' || product.quantity <= 0 ) {
			stockClass = 'out-of-stock';
			stockText = 'Нет в наличии';
			stockIcon = 'fa-times-circle';
		} else if ( product.quantity <= 3 ) {
			stockClass = 'low-stock';
			stockText = 'Осталось мало';
			stockIcon = 'fa-exclamation-triangle';
		}

		// Формируем бейджи (Новинка, Хит, Скидка)
		let badges = '';
		if ( product.isNew ) badges += '<span class="badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="badge hit">Хит</span>';
		if ( product.oldPrice ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="badge sale">-${discount}%</span>`;
		}

		return `
            <div class="favorite-item" data-id="${product.id}">
                <!-- Бейджи товара -->
                ${badges ? `<div class="favorite-item-badges">${badges}</div>` : ''}
                
                <!-- Кнопка удаления из избранного -->
                <button class="remove-favorite" data-id="${product.id}" title="Удалить из избранного">
                    <i class="fas fa-times"></i>
                </button>
                
                <!-- Ссылка на изображение ведет на страницу категории -->
                <a href="${categoryUrl}" class="favorite-item-link">
                    <img src="${API.getSafeImageUrl( product.image )}" 
                         alt="${product.name}" 
                         class="favorite-item-image"
                         onerror="this.src='${API.getFallbackSvg( product.name )}'">
                </a>
                
                <!-- Информация о товаре -->
                <div class="favorite-item-info">
                    <div class="favorite-item-category">
                        <a href="${categoryUrl}">${store.getCategoryName( product.category )}</a>
                    </div>
                    <h3 class="favorite-item-title">
                        <a href="${categoryUrl}">${product.name}</a>
                    </h3>
                    <div class="favorite-item-prices">
                        <span class="favorite-item-price">${API.formatPrice( product.price )}</span>
                        ${product.oldPrice ? `<span class="favorite-item-old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
                    </div>
                    <div class="favorite-item-stock ${stockClass}">
                        <i class="fas ${stockIcon}"></i>
                        <span>${stockText}</span>
                    </div>
                </div>
                
                <!-- Кнопка добавления в корзину -->
                <div class="favorite-item-actions">
                    <button class="add-to-cart-btn" data-id="${product.id}"
                            ${product.status !== 'in-stock' || availableQuantity <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </button>
                </div>
            </div>
        `;
	}

	// =========================================================================
	// ИЗБРАННОЕ: ОБРАБОТЧИКИ СОБЫТИЙ
	// =========================================================================

	/**
	 * Привязывает обработчики событий для избранного
	 */
	bindFavoritesEvents() {
		console.log( '🔗 Привязка событий избранного...' );

		// ===== УДАЛЕНИЕ ИЗ ИЗБРАННОГО =====
		document.querySelectorAll( '.remove-favorite' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRemoveFavorite );
			this.handleRemoveFavorite = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;
				const card = e.currentTarget.closest( '.favorite-item' );

				// Анимация удаления
				if ( card ) {
					card.style.transition = 'all 0.3s ease';
					card.style.opacity = '0';
					card.style.transform = 'scale(0.8)';
					setTimeout( () => {
						store.toggleFavorite( id );
					}, 300 );
				} else {
					store.toggleFavorite( id );
				}
			};
			btn.addEventListener( 'click', this.handleRemoveFavorite );
		} );

		// ===== ДОБАВЛЕНИЕ В КОРЗИНУ ИЗ ИЗБРАННОГО =====
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddToCart );
			this.handleAddToCart = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект на кнопке
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
						e.currentTarget.style.background = '';
					}, 2000 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleAddToCart );
		} );

		// ===== ОЧИСТКА ВСЕГО ИЗБРАННОГО =====
		const clearBtn = document.getElementById( 'clearFavoritesBtn' );
		if ( clearBtn ) {
			clearBtn.removeEventListener( 'click', this.handleClearFavorites );
			this.handleClearFavorites = ( e ) => {
				e.preventDefault();
				if ( confirm( '❤️ Вы уверены, что хотите очистить избранное?' ) ) {
					store.favorites = [];
					store.saveToStorage();
					API.showNotification( 'Избранное очищено' );
				}
			};
			clearBtn.addEventListener( 'click', this.handleClearFavorites );
		}
	}

	// =========================================================================
	// ПРОМОКОДЫ
	// =========================================================================

	/**
	 * Загружает примененный промокод из localStorage
	 */
	loadPromoCode() {
		const savedPromo = localStorage.getItem( 'appliedPromoCode' );
		if ( savedPromo ) {
			try {
				this.appliedPromo = JSON.parse( savedPromo );
				console.log( '🏷️ Загружен промокод:', this.appliedPromo );
			} catch ( e ) {
				console.error( 'Ошибка загрузки промокода:', e );
				this.appliedPromo = null;
			}
		}
	}

	/**
	 * Применяет промокод (проверяет валидность и рассчитывает скидку)
	 */
	applyPromoCode() {
		const input = document.getElementById( 'promoCodeInput' );
		const message = document.getElementById( 'promoMessage' );

		if ( !input || !message ) return;

		const code = input.value.trim().toUpperCase();

		// Загружаем промокоды из localStorage (созданные в админке)
		const promoCodes = JSON.parse( localStorage.getItem( 'komori_promocodes' ) || '[]' );

		// Ищем промокод по коду
		const promo = promoCodes.find( p => p.code === code );

		// Проверка: промокод не найден
		if ( !promo ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Неверный промокод';
			setTimeout( () => {
				if ( message.textContent === '❌ Неверный промокод' ) message.textContent = '';
			}, 3000 );
			return;
		}

		// Проверка: промокод неактивен
		if ( !promo.isActive ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Промокод неактивен';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверка: промокод еще не активен (дата начала)
		const now = new Date();
		if ( promo.validFrom && new Date( promo.validFrom ) > now ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Промокод еще не активен';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверка: срок действия промокода истек
		if ( promo.validUntil && new Date( promo.validUntil ) < now ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Срок действия промокода истек';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверка: минимальная сумма заказа
		const subtotal = store.getCartTotal();
		if ( promo.minOrder > 0 && subtotal < promo.minOrder ) {
			message.style.color = '#ff4757';
			message.textContent = `❌ Минимальная сумма заказа для этого промокода: ${API.formatPrice( promo.minOrder )}`;
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Применяем промокод (пересчитываем скидку)
		let discountValue;
		let discountType;

		if ( promo.type === 'percent' ) {
			// Для процентной скидки - делим на 100 (например, 15 -> 0.15)
			discountValue = promo.discount / 100;
			discountType = 'percent';
		} else {
			// Для фиксированной скидки - оставляем как есть
			discountValue = promo.discount;
			discountType = 'fixed';
		}

		this.appliedPromo = {
			discount: discountValue,
			type: discountType,
			description: promo.description,
			code: promo.code,
			id: promo.id
		};

		// Сохраняем примененный промокод в localStorage
		localStorage.setItem( 'appliedPromoCode', JSON.stringify( this.appliedPromo ) );

		message.style.color = '#2ecc71';
		message.textContent = `✅ Промокод "${promo.code}" применен! ${promo.description || ''}`;

		// Увеличиваем счетчик использований промокода
		promo.usedCount = ( promo.usedCount || 0 ) + 1;
		localStorage.setItem( 'komori_promocodes', JSON.stringify( promoCodes ) );

		// Обновляем итоговые суммы
		this.updateCartSummary();

		// Добавляем кнопку сброса промокода
		this.addPromoCodeResetButton();

		// Очищаем поле ввода
		input.value = '';

		// Скрываем сообщение через 3 секунды
		setTimeout( () => {
			if ( message.textContent.includes( 'Промокод применен' ) ) message.textContent = '';
		}, 3000 );
	}

	/**
	 * Сбрасывает примененный промокод
	 */
	resetPromoCode() {
		this.appliedPromo = null;
		localStorage.removeItem( 'appliedPromoCode' );

		// Очищаем поле ввода промокода
		const promoInput = document.getElementById( 'promoCodeInput' );
		if ( promoInput ) promoInput.value = '';

		const message = document.getElementById( 'promoMessage' );
		if ( message ) {
			message.style.color = '#2ecc71';
			message.textContent = '🏷️ Промокод отменен';
			setTimeout( () => {
				message.textContent = '';
			}, 2000 );
		}

		// Удаляем кнопку сброса
		const resetBtn = document.getElementById( 'resetPromoBtn' );
		if ( resetBtn ) resetBtn.remove();

		// Обновляем итоговые суммы
		this.updateCartSummary();
	}

	/**
	 * Добавляет кнопку сброса промокода под полем ввода
	 */
	addPromoCodeResetButton() {
		const promoSection = document.querySelector( '.promo-code-section' );
		const existingResetBtn = document.getElementById( 'resetPromoBtn' );

		// Если кнопка уже есть, не добавляем повторно
		if ( existingResetBtn ) return;

		const resetBtn = document.createElement( 'button' );
		resetBtn.id = 'resetPromoBtn';
		resetBtn.className = 'promo-code-reset';
		resetBtn.innerHTML = `<i class="fas fa-ticket-alt"></i> ${this.appliedPromo?.code || ''} <i class="fas fa-times"></i>`;

		// Стили для кнопки
		resetBtn.style.cssText = `
            margin-top: 10px;
            padding: 8px 15px;
            background: transparent;
            border: 1px solid #ff3366;
            color: #ff3366;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            width: 100%;
            transition: all 0.3s ease;
        `;

		// Эффекты при наведении
		resetBtn.addEventListener( 'mouseenter', () => {
			resetBtn.style.background = '#ff3366';
			resetBtn.style.color = 'white';
		} );

		resetBtn.addEventListener( 'mouseleave', () => {
			resetBtn.style.background = 'transparent';
			resetBtn.style.color = '#ff3366';
		} );

		// Обработчик клика
		resetBtn.addEventListener( 'click', () => this.resetPromoCode() );

		promoSection.appendChild( resetBtn );
	}

	// =========================================================================
	// РЕКОМЕНДАЦИИ
	// =========================================================================

	/**
	 * Рендерит блок рекомендаций (похожие товары)
	 * Работает и для корзины, и для избранного
	 */
	renderRecommendations() {
		// Ищем контейнер для рекомендаций
		let grid = document.getElementById( 'recommendationsGrid' );

		if ( !grid ) {
			const container = document.getElementById( 'favoritesRecommendations' );
			if ( container ) {
				grid = container.querySelector( '.recommendations-grid' );
			}
		}

		if ( !grid ) {
			console.log( '⚠️ Контейнер для рекомендаций не найден' );
			return;
		}

		console.log( '🎯 Рендерим рекомендации для страницы:', this.currentPage );

		// Получаем все товары
		const allProducts = store.products;

		// Получаем ID избранных товаров
		const favorites = store.favorites;

		// Получаем ID товаров в корзине
		const cartItems = store.cart;
		const cartIds = cartItems.map( item => item.id );

		// Фильтруем товары для рекомендаций
		let recommendations = allProducts
			.filter( p => {
				// Исключаем товары, которых нет в наличии
				if ( p.status !== 'in-stock' || p.quantity <= 0 ) return false;
				// Исключаем товары, которые уже в избранном
				if ( favorites.includes( p.id ) ) return false;
				// Для страницы корзины - исключаем товары, которые уже в корзине
				if ( this.currentPage === 'cart' && cartIds.includes( p.id ) ) return false;
				return true;
			} )
			.sort( () => 0.5 - Math.random() ) // Перемешиваем для случайных рекомендаций
			.slice( 0, 4 ); // Берем 4 товара

		// Если рекомендаций меньше 4, добавляем дополнительные
		if ( recommendations.length < 4 ) {
			const moreProducts = allProducts
				.filter( p => {
					if ( p.status !== 'in-stock' || p.quantity <= 0 ) return false;
					if ( recommendations.includes( p ) ) return false;
					if ( favorites.includes( p.id ) ) return false;
					if ( this.currentPage === 'cart' && cartIds.includes( p.id ) ) return false;
					return true;
				} )
				.sort( () => 0.5 - Math.random() )
				.slice( 0, 4 - recommendations.length );

			recommendations = [...recommendations, ...moreProducts];
		}

		// Если нет рекомендаций - показываем сообщение
		if ( recommendations.length === 0 ) {
			grid.innerHTML = '<div class="no-recommendations"><p>😊 Пока нет рекомендаций</p></div>';
			return;
		}

		// Рендерим карточки рекомендаций
		grid.innerHTML = recommendations.map( product => this.renderRecommendationCard( product ) ).join( '' );

		// Прикрепляем обработчики событий к кнопкам
		this.attachRecommendationEvents();
	}

	/**
	 * Отрисовка карточки рекомендации
	 * 
	 * @param {Object} product - полный объект товара
	 * @returns {string} HTML-код карточки
	 */
	renderRecommendationCard( product ) {
		// Кнопка различается в зависимости от страницы
		const buttonText = this.currentPage === 'cart' ? 'В корзину' : 'В избранное';
		const buttonIcon = this.currentPage === 'cart' ? 'fa-shopping-cart' : 'fa-heart';
		const buttonAction = this.currentPage === 'cart' ? 'add-to-cart' : 'add-to-favorites';

		// Получаем ссылку на страницу категории товара
		const categoryUrl = this.getCategoryUrl( product.category );

		return `
            <div class="recommendation-item" data-id="${product.id}">
                <a href="${categoryUrl}" class="recommendation-link">
                    <img src="${API.getSafeImageUrl( product.image )}" 
                         alt="${product.name}" 
                         class="recommendation-image"
                         loading="lazy"
                         onerror="this.src='${API.getFallbackSvg( product.name )}'">
                </a>
                <div class="recommendation-content">
                    <h4 class="recommendation-name">
                        <a href="${categoryUrl}">${product.name}</a>
                    </h4>
                    <div class="recommendation-price">${API.formatPrice( product.price )}</div>
                    <button class="recommendation-add ${buttonAction}" data-id="${product.id}">
                        <i class="fas ${buttonIcon}"></i> ${buttonText}
                    </button>
                </div>
            </div>
        `;
	}

	/**
	 * Прикрепляет обработчики событий к кнопкам рекомендаций
	 */
	attachRecommendationEvents() {
		// Кнопки "В корзину" (для страницы корзины)
		document.querySelectorAll( '.recommendation-add.add-to-cart' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAddToCart );
			this.handleRecommendationAddToCart = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект
					const originalHTML = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';
					e.currentTarget.style.color = 'white';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalHTML;
						e.currentTarget.style.background = '';
						e.currentTarget.style.color = '';
						this.renderRecommendations(); // Обновляем рекомендации
					}, 1500 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleRecommendationAddToCart );
		} );

		// Кнопки "В избранное" (для страницы избранного)
		document.querySelectorAll( '.recommendation-add.add-to-favorites' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAddToFavorites );
			this.handleRecommendationAddToFavorites = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				const isFavorite = store.toggleFavorite( id );
				API.showNotification( isFavorite ? '✅ Добавлено в избранное' : '❌ Удалено из избранного' );

				// Визуальный эффект
				const originalHTML = e.currentTarget.innerHTML;
				e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
				e.currentTarget.style.background = '#2ecc71';
				e.currentTarget.style.color = 'white';

				setTimeout( () => {
					e.currentTarget.innerHTML = originalHTML;
					e.currentTarget.style.background = '';
					e.currentTarget.style.color = '';
					this.renderRecommendations(); // Обновляем рекомендации
				}, 1500 );

				this.updateHeaderCounters();
			};
			btn.addEventListener( 'click', this.handleRecommendationAddToFavorites );
		} );
	}

	// =========================================================================
	// ОФОРМЛЕНИЕ ЗАКАЗА (ЗАГЛУШКА)
	// =========================================================================

	/**
	 * Открывает модальное окно оформления заказа
	 * В текущей версии - заглушка
	 */
	openCheckoutModal() {
		const cart = store.getCart();

		// Проверяем, есть ли товары в корзине
		if ( cart.length === 0 ) {
			API.showNotification( '🛒 Корзина пуста', 'error' );
			return;
		}

		// Здесь будет открытие модального окна оформления заказа
		// Пока просто заглушка
		alert( '🚚 Функция оформления заказа в разработке' );
	}
}

// =========================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// =========================================================================

/**
 * Создаем экземпляр класса при загрузке страницы
 * Проверяем, есть ли на странице элементы корзины или избранного
 */
document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.querySelector( '.cart-page-content' ) || document.querySelector( '.favorites-page-content' ) ) {
		window.cartFavoritesPage = new CartFavoritesPage();
		console.log( '✅ Страница корзины/избранного инициализирована' );
	}
} );