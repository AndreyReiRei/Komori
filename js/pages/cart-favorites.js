/**
 * ============================================================================
 * СТРАНИЦЫ КОРЗИНЫ И ИЗБРАННОГО
 * ============================================================================
 */

class CartFavoritesPage {
	constructor() {
		// Текущая страница: 'cart' или 'favorites'
		this.currentPage = 'cart';

		// Примененный промокод (хранится в localStorage)
		this.appliedPromo = null;

		// Флаг для предотвращения множественной инициализации событий
		this.eventsBound = false;

		// Инициализация страницы
		this.init();
	}

	/**
	 * ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ
	 */
	init() {
		// Проверяем, какая страница загружена
		if ( document.querySelector( '.cart-page-content' ) ) {
			this.currentPage = 'cart';
			console.log( '🛒 Определена страница корзины' );

			this.loadPromoCode();
			this.renderCart();
			this.bindCartEvents();
			setTimeout( () => this.renderRecommendations(), 100 );

		} else if ( document.querySelector( '.favorites-page-content' ) ) {
			this.currentPage = 'favorites';
			console.log( '❤️ Определена страница избранного' );

			this.renderFavorites();
			this.bindFavoritesEvents();
			setTimeout( () => this.renderRecommendations(), 100 );
		}

		// Глобальные слушатели
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( '🔄 Корзина обновлена' );
			if ( this.currentPage === 'cart' ) {
				this.renderCart();
				this.renderRecommendations();
			}
			this.updateHeaderCounters();
		} );

		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( '🔄 Избранное обновлено' );
			if ( this.currentPage === 'favorites' ) {
				this.renderFavorites();
				this.renderRecommendations();
			}
			this.updateHeaderCounters();
		} );

		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '🔄 Товары обновлены' );
			this.renderRecommendations();
		} );

		API.initModalHandlers();
		this.updateHeaderCounters();
	}

	/**
	 * =========================================================================
	 * ОТОБРАЖЕНИЕ КОРЗИНЫ
	 * =========================================================================
	 */
	renderCart() {
		console.log( '🛒 Рендерим корзину...' );

		const cartWithItems = document.getElementById( 'cartWithItems' );
		const cartEmptyState = document.getElementById( 'cartEmptyState' );
		const cartItemsList = document.getElementById( 'cartItemsList' );

		// Получаем ТОЛЬКО ID и количество из store.cart
		const cartItems = store.cart; // [{ id: "123", quantity: 2 }, ...]

		console.log( '📦 Товары в корзине (сырые данные):', cartItems );

		if ( !cartItems || cartItems.length === 0 ) {
			if ( cartWithItems ) cartWithItems.style.display = 'none';
			if ( cartEmptyState ) cartEmptyState.style.display = 'block';
			this.updateCartSummary();
			return;
		}

		if ( cartWithItems ) cartWithItems.style.display = 'grid';
		if ( cartEmptyState ) cartEmptyState.style.display = 'none';

		// Генерируем HTML для каждого товара, получая актуальные данные из products
		if ( cartItemsList ) {
			cartItemsList.innerHTML = cartItems.map( item => {
				const product = store.getProduct( item.id );
				if ( !product ) return ''; // Товар не найден - пропускаем
				return this.renderCartItem( product, item.quantity );
			} ).filter( html => html !== '' ).join( '' );
		}

		this.updateCartSummary();
	}

	/**
	 * Отрисовка одной строки товара в корзине
	 * @param {Object} product - полный объект товара из store.products
	 * @param {number} quantity - количество из корзины
	 */
	renderCartItem( product, quantity ) {
		const isLowStock = product && product.quantity <= 3;

		return `
            <div class="cart-item-row" data-id="${product.id}">
                <div class="cart-col-product">
                    <div class="cart-product-info">
                        <img src="${API.getSafeImageUrl( product.image )}" 
                             alt="${product.name}"
                             class="cart-product-image"
                             onerror="this.src='${API.getFallbackSvg( product.name )}'">
                        <div class="cart-product-details">
                            <h3 class="cart-product-title">
                                <a href="/pages html/product.html?id=${product.id}">${product.name}</a>
                            </h3>
                            <div class="cart-product-attributes">
                                <span class="cart-product-category">${store.getCategoryName( product.category || '' )}</span>
                                <span class="cart-product-stock ${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                    <i class="fas ${product.quantity > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                                    ${product.quantity > 0 ? 'В наличии' : 'Нет в наличии'}
                                    ${isLowStock ? '<span class="low-stock-warning"> (Осталось мало)</span>' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cart-col-price">
                    <div class="cart-price-current">${API.formatPrice( product.price )}</div>
                    ${product.oldPrice ? `<div class="cart-price-old">${API.formatPrice( product.oldPrice )}</div>` : ''}
                </div>
                <div class="cart-col-quantity">
                    <div class="cart-quantity-control">
                        <button class="cart-quantity-btn minus" data-id="${product.id}">-</button>
                        <input type="number" class="cart-quantity-input" value="${quantity}" 
                               min="1" max="${product.quantity}" data-id="${product.id}">
                        <button class="cart-quantity-btn plus" data-id="${product.id}" 
                                ${quantity >= product.quantity ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <div class="cart-col-total">
                    <div class="cart-item-total">${API.formatPrice( product.price * quantity )}</div>
                </div>
                <div class="cart-col-remove">
                    <button class="cart-remove-item" data-id="${product.id}" title="Удалить товар">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
	}

	/**
	 * =========================================================================
	 * ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ КОРЗИНЫ (исправленная версия)
	 * =========================================================================
	 */
	bindCartEvents() {
		console.log( '🔗 Привязка событий корзины...' );

		// Используем делегирование событий на уровне document
		// Это решает проблему с обновлением обработчиков после перерисовки

		// Удаляем старые обработчики, если они были
		if ( this.cartEventsBound ) {
			document.removeEventListener( 'click', this.handleDocumentClick );
		}

		// Создаем обработчик клика на document
		this.handleDocumentClick = ( e ) => {
			const target = e.target;

			// Обработка кнопки "+"
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

			// Обработка кнопки "-"
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

			// Обработка ручного ввода количества
			const quantityInput = target.closest( '.cart-quantity-input' );
			if ( quantityInput && quantityInput.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = quantityInput.dataset.id;
				let newValue = parseInt( quantityInput.value );
				const maxValue = parseInt( quantityInput.max );
				const minValue = parseInt( quantityInput.min ) || 1;

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

			// Обработка удаления товара
			const removeBtn = target.closest( '.cart-remove-item' );
			if ( removeBtn && removeBtn.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = removeBtn.dataset.id;
				const row = removeBtn.closest( '.cart-item-row' );
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

		// Кнопка очистки корзины
		const clearCartBtn = document.getElementById( 'clearCartBtn' );
		if ( clearCartBtn ) {
			clearCartBtn.removeEventListener( 'click', this.handleClearCart );
			this.handleClearCart = () => {
				if ( confirm( '🗑️ Вы уверены, что хотите очистить корзину?' ) ) {
					store.clearCart();
					this.resetPromoCode();
					this.renderRecommendations();
				}
			};
			clearCartBtn.addEventListener( 'click', this.handleClearCart );
		}

		// Кнопка оформления заказа
		const checkoutBtn = document.getElementById( 'checkoutBtn' );
		if ( checkoutBtn ) {
			checkoutBtn.removeEventListener( 'click', this.handleCheckout );
			this.handleCheckout = () => this.openCheckoutModal();
			checkoutBtn.addEventListener( 'click', this.handleCheckout );
		}

		// Кнопка применения промокода
		const applyPromoBtn = document.getElementById( 'applyPromoBtn' );
		if ( applyPromoBtn ) {
			applyPromoBtn.removeEventListener( 'click', this.handleApplyPromo );
			this.handleApplyPromo = () => this.applyPromoCode();
			applyPromoBtn.addEventListener( 'click', this.handleApplyPromo );
		}
	}

	/**
	 * Обновление суммы конкретного товара в корзине
	 * @param {string|number} productId - ID товара
	 * @param {number} newQuantity - новое количество
	 */
	updateCartItemTotal( productId, newQuantity ) {
		const row = document.querySelector( `.cart-item-row[data-id="${productId}"]` );
		if ( !row ) return;

		const product = store.getProduct( productId );
		if ( !product ) return;

		const totalElement = row.querySelector( '.cart-item-total' );
		if ( totalElement ) {
			totalElement.textContent = API.formatPrice( product.price * newQuantity );
		}

		// Обновляем состояние кнопки "+"
		const plusBtn = row.querySelector( '.cart-quantity-btn.plus' );
		if ( plusBtn ) {
			if ( newQuantity >= product.quantity ) {
				plusBtn.disabled = true;
			} else {
				plusBtn.disabled = false;
			}
		}
	}

	/**
	 * =========================================================================
	 * ОБНОВЛЕНИЕ ИТОГОВЫХ СУММ В КОРЗИНЕ (исправленная версия)
	 * =========================================================================
	 */
	updateCartSummary() {
		// Получаем количество товаров и общую сумму без скидки
		const count = store.getCartCount();
		const subtotal = store.getCartTotal();

		let discount = 0;
		let total = subtotal;

		// Если применен промокод - рассчитываем скидку
		if ( this.appliedPromo ) {
			if ( this.appliedPromo.type === 'percent' ) {
				// Процентная скидка (например, 0.1 = 10%)
				discount = subtotal * this.appliedPromo.discount;
			} else if ( this.appliedPromo.type === 'fixed' ) {
				// Фиксированная скидка (например, 500)
				discount = this.appliedPromo.discount;
			}
			// Скидка не может быть больше суммы заказа
			discount = Math.min( discount, subtotal );
			total = subtotal - discount;
		}

		// Обновляем элементы DOM...
		const cartSubtotal = document.getElementById( 'cartSubtotal' );
		const discountAmount = document.querySelector( '.discount-amount' );
		const cartTotalById = document.getElementById( 'cartTotal' );
		const totalAmountByClass = document.querySelector( '.total-amount' );
		const cartItemsCount = document.getElementById( 'cartItemsCount' );
		const itemsCountElement = document.querySelector( '.cart-items-count' );
		const totalAmountElement = document.querySelector( '.cart-total-amount' );

		if ( itemsCountElement ) {
			itemsCountElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}

		if ( totalAmountElement ) {
			totalAmountElement.textContent = `на сумму ${API.formatPrice( subtotal )}`;
		}

		if ( cartSubtotal ) {
			cartSubtotal.textContent = API.formatPrice( subtotal );
		}

		if ( discountAmount ) {
			discountAmount.textContent = discount > 0 ? `-${API.formatPrice( discount )}` : '0 ₽';
			discountAmount.style.color = discount > 0 ? '#2ecc71' : '';
		}

		if ( cartTotalById ) {
			cartTotalById.textContent = API.formatPrice( total );
		}

		if ( totalAmountByClass ) {
			totalAmountByClass.textContent = API.formatPrice( total );
		}

		if ( cartItemsCount ) {
			cartItemsCount.textContent = count;
		}
	}

	loadPromoCode() {
		const savedPromo = localStorage.getItem( 'appliedPromoCode' );
		if ( savedPromo ) {
			try {
				this.appliedPromo = JSON.parse( savedPromo );
				console.log( '🏷️ Загружен промокод:', this.appliedPromo );

				// Восстанавливаем поле ввода с кодом промокода
				const promoInput = document.getElementById( 'promoCodeInput' );
				if ( promoInput && this.appliedPromo.code ) {
					promoInput.value = this.appliedPromo.code;
				}
			} catch ( e ) {
				console.error( 'Ошибка загрузки промокода:', e );
				this.appliedPromo = null;
			}
		}
	}

	resetPromoCode() {
		this.appliedPromo = null;
		localStorage.removeItem( 'appliedPromoCode' );

		// Очищаем поле ввода промокода
		const promoInput = document.getElementById( 'promoCodeInput' );
		if ( promoInput ) {
			promoInput.value = '';
		}

		const message = document.getElementById( 'promoMessage' );
		if ( message ) {
			message.style.color = '#2ecc71';
			message.textContent = '🏷️ Промокод отменен';
			setTimeout( () => {
				message.textContent = '';
			}, 2000 );
		}

		const resetBtn = document.getElementById( 'resetPromoBtn' );
		if ( resetBtn ) resetBtn.remove();

		this.updateCartSummary();
	}


	applyPromoCode() {
		const input = document.getElementById( 'promoCodeInput' );
		const message = document.getElementById( 'promoMessage' );

		if ( !input || !message ) return;

		const code = input.value.trim().toUpperCase();

		// Загружаем промокоды из localStorage
		const promoCodes = JSON.parse( localStorage.getItem( 'komori_promocodes' ) || '[]' );

		// Ищем промокод
		const promo = promoCodes.find( p => p.code === code );

		if ( !promo ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Неверный промокод';
			setTimeout( () => { if ( message.textContent === '❌ Неверный промокод' ) message.textContent = ''; }, 3000 );
			return;
		}

		// Проверяем активность
		if ( !promo.isActive ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Промокод неактивен';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверяем даты
		const now = new Date();
		if ( promo.validFrom && new Date( promo.validFrom ) > now ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Промокод еще не активен';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		if ( promo.validUntil && new Date( promo.validUntil ) < now ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Срок действия промокода истек';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверяем минимальную сумму заказа
		const subtotal = store.getCartTotal();
		if ( promo.minOrder > 0 && subtotal < promo.minOrder ) {
			message.style.color = '#ff4757';
			message.textContent = `❌ Минимальная сумма заказа для этого промокода: ${API.formatPrice( promo.minOrder )}`;
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// ========== ИСПРАВЛЕНИЕ ЗДЕСЬ ==========
		// Применяем промокод в зависимости от типа
		let discountValue;
		let discountType;

		if ( promo.type === 'percent' ) {
			// Для процентной скидки - делим на 100 (например, 15 -> 0.15)
			discountValue = promo.discount / 100;
			discountType = 'percent';
		} else {
			// Для фиксированной скидки - оставляем как есть (например, 1500)
			discountValue = promo.discount;
			discountType = 'fixed';
		}

		this.appliedPromo = {
			discount: discountValue,
			type: discountType,
			description: promo.description,
			code: promo.code,  // ДОБАВЛЯЕМ КОД ПРОМОКОДА
			id: promo.id
		};

		localStorage.setItem( 'appliedPromoCode', JSON.stringify( this.appliedPromo ) );

		message.style.color = '#2ecc71';
		message.textContent = `✅ Промокод "${promo.code}" применен! ${promo.description || ''}`;

		// Увеличиваем счетчик использований
		promo.usedCount = ( promo.usedCount || 0 ) + 1;
		localStorage.setItem( 'komori_promocodes', JSON.stringify( promoCodes ) );

		this.updateCartSummary();
		this.addPromoCodeResetButton();

		setTimeout( () => {
			if ( message.textContent.includes( 'Промокод применен' ) ) message.textContent = '';
		}, 3000 );
	}

	addPromoCodeResetButton() {
		const promoSection = document.querySelector( '.promo-code-section' );
		const existingResetBtn = document.getElementById( 'resetPromoBtn' );
		if ( existingResetBtn ) return;

		const resetBtn = document.createElement( 'button' );
		resetBtn.id = 'resetPromoBtn';
		resetBtn.className = 'promo-code-reset';
		// Показываем название примененного промокода на кнопке
		const promoCode = this.appliedPromo?.code || '';
		resetBtn.innerHTML = `<i class="fas fa-ticket-alt"></i> ${promoCode} <i class="fas fa-times"></i>`;
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

		resetBtn.addEventListener( 'mouseenter', () => {
			resetBtn.style.background = '#ff3366';
			resetBtn.style.color = 'white';
		} );
		resetBtn.addEventListener( 'mouseleave', () => {
			resetBtn.style.background = 'transparent';
			resetBtn.style.color = '#ff3366';
		} );
		resetBtn.addEventListener( 'click', () => this.resetPromoCode() );

		promoSection.appendChild( resetBtn );
	}

	// ========== ИЗБРАННОЕ ==========
	renderFavorites() {
		const container = document.getElementById( 'favoritesItems' );
		const emptyState = document.getElementById( 'favoritesEmpty' );
		const countElement = document.getElementById( 'favoritesCount' );
		const totalElement = document.getElementById( 'favoritesTotal' );

		const favorites = store.getFavorites();

		console.log( '❤️ Рендерим избранное:', favorites.length );

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

		if ( container ) {
			container.style.display = 'grid';
			container.innerHTML = favorites.map( product => this.renderFavoriteCard( product ) ).join( '' );
		}
		if ( emptyState ) emptyState.style.display = 'none';

		const total = favorites.reduce( ( sum, item ) => sum + item.price, 0 );
		const count = favorites.length;

		if ( countElement ) {
			countElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}
		if ( totalElement ) {
			totalElement.textContent = `на сумму ${API.formatPrice( total )}`;
		}

		this.updateHeaderCounters();
	}

	renderFavoriteCard( product ) {
		const inCart = store.cart.find( item => item.id == product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

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

		let badges = '';
		if ( product.isNew ) badges += '<span class="badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="badge hit">Хит</span>';
		if ( product.oldPrice ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="badge sale">-${discount}%</span>`;
		}

		return `
            <div class="favorite-item" data-id="${product.id}">
                ${badges ? `<div class="favorite-item-badges">${badges}</div>` : ''}
                <button class="remove-favorite" data-id="${product.id}" title="Удалить из избранного">
                    <i class="fas fa-times"></i>
                </button>
                <img src="${API.getSafeImageUrl( product.image )}" 
                     alt="${product.name}" 
                     class="favorite-item-image"
                     onerror="this.src='${API.getFallbackSvg( product.name )}'">
                <div class="favorite-item-info">
                    <div class="favorite-item-category">${store.getCategoryName( product.category )}</div>
                    <h3 class="favorite-item-title">${product.name}</h3>
                    <div class="favorite-item-prices">
                        <span class="favorite-item-price">${API.formatPrice( product.price )}</span>
                        ${product.oldPrice ? `<span class="favorite-item-old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
                    </div>
                    <div class="favorite-item-stock ${stockClass}">
                        <i class="fas ${stockIcon}"></i>
                        <span>${stockText}</span>
                    </div>
                </div>
                <div class="favorite-item-actions">
                    <button class="add-to-cart-btn" data-id="${product.id}"
                            ${product.status !== 'in-stock' || availableQuantity <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </button>
                </div>
            </div>
        `;
	}

	bindFavoritesEvents() {
		console.log( '🔗 Привязка событий избранного...' );

		document.querySelectorAll( '.remove-favorite' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRemoveFavorite );
			this.handleRemoveFavorite = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;
				const card = e.currentTarget.closest( '.favorite-item' );

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

		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddToCart );
			this.handleAddToCart = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );
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

	// ========== РЕКОМЕНДАЦИИ ==========
	renderRecommendations() {
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

		const allProducts = store.products;
		const favorites = store.favorites;
		const cartItems = store.cart;
		const cartIds = cartItems.map( item => item.id );

		let recommendations = allProducts
			.filter( p => {
				if ( p.status !== 'in-stock' || p.quantity <= 0 ) return false;
				if ( favorites.includes( p.id ) ) return false;
				if ( this.currentPage === 'cart' && cartIds.includes( p.id ) ) return false;
				return true;
			} )
			.sort( () => 0.5 - Math.random() )
			.slice( 0, 4 );

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

		if ( recommendations.length === 0 ) {
			grid.innerHTML = '<div class="no-recommendations"><p>😊 Пока нет рекомендаций</p></div>';
			return;
		}

		grid.innerHTML = recommendations.map( product => this.renderRecommendationCard( product ) ).join( '' );
		this.attachRecommendationEvents();
	}

	renderRecommendationCard( product ) {
		const buttonText = this.currentPage === 'cart' ? 'В корзину' : 'В избранное';
		const buttonIcon = this.currentPage === 'cart' ? 'fa-shopping-cart' : 'fa-heart';
		const buttonAction = this.currentPage === 'cart' ? 'add-to-cart' : 'add-to-favorites';

		return `
            <div class="recommendation-item" data-id="${product.id}">
                <img src="${API.getSafeImageUrl( product.image )}" 
                     alt="${product.name}" 
                     class="recommendation-image"
                     loading="lazy"
                     onerror="this.src='${API.getFallbackSvg( product.name )}'">
                <div class="recommendation-content">
                    <h4 class="recommendation-name">${product.name}</h4>
                    <div class="recommendation-price">${API.formatPrice( product.price )}</div>
                    <button class="recommendation-add ${buttonAction}" data-id="${product.id}">
                        <i class="fas ${buttonIcon}"></i> ${buttonText}
                    </button>
                </div>
            </div>
        `;
	}

	attachRecommendationEvents() {
		document.querySelectorAll( '.recommendation-add.add-to-cart' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAddToCart );
			this.handleRecommendationAddToCart = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );
					const originalHTML = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';
					e.currentTarget.style.color = 'white';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalHTML;
						e.currentTarget.style.background = '';
						e.currentTarget.style.color = '';
						this.renderRecommendations();
					}, 1500 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleRecommendationAddToCart );
		} );

		document.querySelectorAll( '.recommendation-add.add-to-favorites' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAddToFavorites );
			this.handleRecommendationAddToFavorites = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				const isFavorite = store.toggleFavorite( id );
				API.showNotification( isFavorite ? '✅ Добавлено в избранное' : '❌ Удалено из избранного' );

				const originalHTML = e.currentTarget.innerHTML;
				e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
				e.currentTarget.style.background = '#2ecc71';
				e.currentTarget.style.color = 'white';

				setTimeout( () => {
					e.currentTarget.innerHTML = originalHTML;
					e.currentTarget.style.background = '';
					e.currentTarget.style.color = '';
					this.renderRecommendations();
				}, 1500 );

				this.updateHeaderCounters();
			};
			btn.addEventListener( 'click', this.handleRecommendationAddToFavorites );
		} );
	}

	// ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
	openCheckoutModal() {
		const cart = store.getCart();
		if ( cart.length === 0 ) {
			API.showNotification( '🛒 Корзина пуста', 'error' );
			return;
		}
		alert( '🚚 Функция оформления заказа в разработке' );
	}

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

	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}

	animateRemove( element, callback ) {
		if ( !element ) return;
		element.style.transition = 'all 0.3s ease';
		element.style.opacity = '0';
		element.style.transform = 'translateX(-20px)';
		setTimeout( () => {
			if ( callback ) callback();
			if ( element.parentNode ) element.remove();
		}, 300 );
	}
}

// Инициализация
document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.querySelector( '.cart-page-content' ) || document.querySelector( '.favorites-page-content' ) ) {
		window.cartFavoritesPage = new CartFavoritesPage();
		console.log( '✅ Страница корзины/избранного инициализирована' );
	}
} );