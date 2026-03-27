/**
 * Страницы корзины и избранного
 */

class CartFavoritesPage {
	constructor() {
		this.currentPage = 'cart'; // 'cart' или 'favorites'
		this.init();
	}

	init() {
		// Определяем текущую страницу
		if ( document.querySelector( '.cart-page-content' ) ) {
			this.currentPage = 'cart';
			console.log( 'Определена страница корзины' );
			this.renderCart();
			this.bindCartEvents();
			// Рендерим рекомендации
			setTimeout( () => this.renderRecommendations(), 100 );
		} else if ( document.querySelector( '.favorites-page-content' ) ) {
			this.currentPage = 'favorites';
			console.log( 'Определена страница избранного' );
			this.renderFavorites();
			this.bindFavoritesEvents();
			// Рендерим рекомендации
			setTimeout( () => this.renderRecommendations(), 100 );
		}

		// Общие события
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( 'Корзина обновлена' );
			if ( this.currentPage === 'cart' ) {
				this.renderCart();
				this.renderRecommendations();
			}
			this.updateHeaderCounters();
		} );

		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( 'Избранное обновлено' );
			if ( this.currentPage === 'favorites' ) {
				this.renderFavorites();
				this.renderRecommendations();
			}
			this.updateHeaderCounters();
		} );

		window.addEventListener( 'store:productsUpdated', () => {
			console.log( 'Товары обновлены, обновляем рекомендации' );
			this.renderRecommendations();
		} );

		API.initModalHandlers();

		// Обновляем счетчики при загрузке
		this.updateHeaderCounters();
	}

	// ========== КОРЗИНА ==========
	renderCart() {
		console.log( 'Рендерим корзину' );

		const cartWithItems = document.getElementById( 'cartWithItems' );
		const cartEmptyState = document.getElementById( 'cartEmptyState' );
		const cartItemsList = document.getElementById( 'cartItemsList' );
		const cartItems = store.getCart();

		console.log( 'Товары в корзине:', cartItems );

		if ( cartItems.length === 0 ) {
			// Показываем пустую корзину
			if ( cartWithItems ) cartWithItems.style.display = 'none';
			if ( cartEmptyState ) cartEmptyState.style.display = 'block';
			this.updateCartSummary();
			return;
		}

		// Показываем корзину с товарами
		if ( cartWithItems ) cartWithItems.style.display = 'grid';
		if ( cartEmptyState ) cartEmptyState.style.display = 'none';

		// Очищаем и заполняем список товаров
		if ( cartItemsList ) {
			cartItemsList.innerHTML = cartItems.map( item => this.renderCartItem( item ) ).join( '' );
		}

		this.updateCartSummary();
	}

	renderCartItem( item ) {
		const product = store.getProduct( item.id );
		const isLowStock = product && product.quantity <= 3;

		return `
            <div class="cart-item-row" data-id="${item.id}">
                <div class="cart-col-product">
                    <div class="cart-product-info">
                        <img src="${API.getSafeImageUrl( item.image )}" 
                             alt="${item.name}"
                             class="cart-product-image"
                             onerror="this.src='${API.getFallbackSvg( item.name )}'">
                        <div class="cart-product-details">
                            <h3 class="cart-product-title">
                                <a href="/pages html/product.html?id=${item.id}">${item.name}</a>
                            </h3>
                            <div class="cart-product-attributes">
                                <span class="cart-product-category">${store.getCategoryName( product?.category || '' )}</span>
                                <span class="cart-product-stock ${item.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                    <i class="fas ${item.quantity > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                                    ${item.quantity > 0 ? 'В наличии' : 'Нет в наличии'}
                                    ${isLowStock ? '<span class="low-stock-warning"> (Осталось мало)</span>' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cart-col-price">
                    <div class="cart-price-current">${API.formatPrice( item.price )}</div>
                    ${product?.oldPrice ? `<div class="cart-price-old">${API.formatPrice( product.oldPrice )}</div>` : ''}
                </div>
                <div class="cart-col-quantity">
                    <div class="cart-quantity-control">
                        <button class="cart-quantity-btn minus" data-id="${item.id}">-</button>
                        <input type="number" class="cart-quantity-input" value="${item.quantity}" 
                               min="1" max="${item.maxQuantity || 99}" data-id="${item.id}" readonly>
                        <button class="cart-quantity-btn plus" data-id="${item.id}" 
                                ${item.quantity >= item.maxQuantity ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <div class="cart-col-total">
                    <div class="cart-item-total">${API.formatPrice( item.price * item.quantity )}</div>
                </div>
                <div class="cart-col-remove">
                    <button class="cart-remove-item" data-id="${item.id}" title="Удалить товар">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
	}

	// Привязка событий для корзины
	bindCartEvents() {
		console.log( 'Привязка событий корзины...' );

		// Кнопки увеличения количества
		document.querySelectorAll( '.cart-quantity-btn.plus' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handlePlusClick );
			this.handlePlusClick = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				const input = document.querySelector( `.cart-quantity-input[data-id="${id}"]` );
				const newValue = parseInt( input.value ) + 1;
				if ( store.updateCartQuantity( id, newValue ) ) {
					this.renderCart();
					this.renderRecommendations();
				}
			};
			btn.addEventListener( 'click', this.handlePlusClick );
		} );

		// Кнопки уменьшения количества
		document.querySelectorAll( '.cart-quantity-btn.minus' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleMinusClick );
			this.handleMinusClick = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				const input = document.querySelector( `.cart-quantity-input[data-id="${id}"]` );
				const newValue = parseInt( input.value ) - 1;
				if ( store.updateCartQuantity( id, newValue ) ) {
					this.renderCart();
					this.renderRecommendations();
				}
			};
			btn.addEventListener( 'click', this.handleMinusClick );
		} );

		// Кнопки удаления
		document.querySelectorAll( '.cart-remove-item' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRemoveClick );
			this.handleRemoveClick = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				this.animateRemove( e.currentTarget.closest( '.cart-item-row' ), () => {
					store.removeFromCart( id );
					this.renderRecommendations();
				} );
			};
			btn.addEventListener( 'click', this.handleRemoveClick );
		} );

		// Очистка корзины
		const clearCartBtn = document.getElementById( 'clearCartBtn' );
		if ( clearCartBtn ) {
			clearCartBtn.removeEventListener( 'click', this.handleClearCart );
			this.handleClearCart = () => {
				if ( confirm( 'Очистить корзину?' ) ) {
					store.clearCart();
					this.renderRecommendations();
				}
			};
			clearCartBtn.addEventListener( 'click', this.handleClearCart );
		}

		// Оформление заказа
		const checkoutBtn = document.getElementById( 'checkoutBtn' );
		if ( checkoutBtn ) {
			checkoutBtn.removeEventListener( 'click', this.handleCheckout );
			this.handleCheckout = () => this.openCheckoutModal();
			checkoutBtn.addEventListener( 'click', this.handleCheckout );
		}

		// Применение промокода
		const applyPromoBtn = document.getElementById( 'applyPromoBtn' );
		if ( applyPromoBtn ) {
			applyPromoBtn.removeEventListener( 'click', this.handleApplyPromo );
			this.handleApplyPromo = () => this.applyPromoCode();
			applyPromoBtn.addEventListener( 'click', this.handleApplyPromo );
		}
	}

	updateCartSummary() {
		// Обновляем информацию в шапке страницы
		const itemsCountElement = document.querySelector( '.cart-items-count' );
		const totalAmountElement = document.querySelector( '.cart-total-amount' );

		const count = store.getCartCount();
		const total = store.getCartTotal();

		if ( itemsCountElement ) {
			itemsCountElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}

		if ( totalAmountElement ) {
			totalAmountElement.textContent = `на сумму ${API.formatPrice( total )}`;
		}

		// Обновляем итоги в боковой панели
		const cartSubtotal = document.getElementById( 'cartSubtotal' );
		const cartTotal = document.getElementById( 'cartTotal' );
		const cartItemsCount = document.getElementById( 'cartItemsCount' );

		if ( cartSubtotal ) {
			cartSubtotal.textContent = API.formatPrice( total );
		}
		if ( cartTotal ) {
			cartTotal.textContent = API.formatPrice( total );
		}
		if ( cartItemsCount ) {
			cartItemsCount.textContent = count;
		}
	}

	// ========== ИЗБРАННОЕ ==========
	renderFavorites() {
		const container = document.getElementById( 'favoritesItems' );
		const emptyState = document.getElementById( 'favoritesEmpty' );
		const countElement = document.getElementById( 'favoritesCount' );
		const totalElement = document.getElementById( 'favoritesTotal' );

		const favorites = store.getFavorites();

		console.log( 'Рендерим избранное:', favorites );

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
		const inCart = store.cart.find( item => item.id === product.id );
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
		console.log( 'Привязка событий избранного...' );

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
					API.showNotification( 'Товар добавлен в корзину' );
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
						e.currentTarget.style.background = '';
					}, 2000 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( 'Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleAddToCart );
		} );

		const clearBtn = document.getElementById( 'clearFavoritesBtn' );
		if ( clearBtn ) {
			clearBtn.removeEventListener( 'click', this.handleClearFavorites );
			this.handleClearFavorites = ( e ) => {
				e.preventDefault();
				if ( confirm( 'Вы уверены, что хотите очистить избранное?' ) ) {
					store.favorites = [];
					store.saveToStorage();
					API.showNotification( 'Избранное очищено' );
				}
			};
			clearBtn.addEventListener( 'click', this.handleClearFavorites );
		}

		const copyLinkBtn = document.getElementById( 'copyFavoritesLink' );
		if ( copyLinkBtn ) {
			copyLinkBtn.removeEventListener( 'click', this.handleCopyLink );
			this.handleCopyLink = ( e ) => {
				e.preventDefault();
				const favorites = store.getFavorites();
				if ( favorites.length === 0 ) {
					API.showNotification( 'Избранное пусто', 'error' );
					return;
				}
				const text = favorites.map( item => `${item.name} - ${API.formatPrice( item.price )}` ).join( '\n' );
				navigator.clipboard.writeText( text ).then( () => {
					API.showNotification( 'Список скопирован' );
				} );
			};
			copyLinkBtn.addEventListener( 'click', this.handleCopyLink );
		}
	}

	// ========== РЕКОМЕНДАЦИИ ==========
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
			console.log( 'Контейнер для рекомендаций не найден' );
			return;
		}

		console.log( 'Рендерим рекомендации для страницы:', this.currentPage );

		const allProducts = store.products;
		const favorites = store.favorites;
		const cartItems = store.getCart();
		const cartIds = cartItems.map( item => item.id );

		// Фильтруем товары для рекомендаций
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
			grid.innerHTML = '<div class="no-recommendations"><p>Пока нет рекомендаций</p></div>';
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
		// Кнопки "В корзину"
		document.querySelectorAll( '.recommendation-add.add-to-cart' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAddToCart );
			this.handleRecommendationAddToCart = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( 'Товар добавлен в корзину' );
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
					API.showNotification( 'Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleRecommendationAddToCart );
		} );

		// Кнопки "В избранное"
		document.querySelectorAll( '.recommendation-add.add-to-favorites' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAddToFavorites );
			this.handleRecommendationAddToFavorites = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				const isFavorite = store.toggleFavorite( id );
				API.showNotification( isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного' );

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
			API.showNotification( 'Корзина пуста', 'error' );
			return;
		}
		alert( 'Функция оформления заказа в разработке' );
	}

	applyPromoCode() {
		const input = document.getElementById( 'promoCodeInput' );
		const message = document.getElementById( 'promoMessage' );

		if ( !input || !message ) return;

		const code = input.value.trim().toUpperCase();
		const promoCodes = {
			'SAKURA10': { discount: 0.1, type: 'percent' },
			'KOMORI500': { discount: 500, type: 'fixed' },
			'WELCOME': { discount: 0.15, type: 'percent' }
		};

		if ( promoCodes[code] ) {
			message.style.color = '#2ecc71';
			message.textContent = 'Промокод применен!';
			console.log( 'Применена скидка:', promoCodes[code] );
			this.updateCartSummary();
		} else {
			message.style.color = '#ff4757';
			message.textContent = 'Неверный промокод';
		}
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
	}
} );