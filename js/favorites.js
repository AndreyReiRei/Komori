/**
 * Функционал страницы избранного
 * Сайт "Комори" - азиатский магазинчик
 */

class FavoritesPage {
	constructor() {
		this.favorites = [];
		this.init();
	}

	init() {
		this.loadFavorites();
		this.bindEvents();
		this.updateFavoritesDisplay();
	}

	loadFavorites() {
		// Загрузка данных из localStorage
		const savedFavorites = localStorage.getItem( 'komori_favorites' );
		if ( savedFavorites ) {
			this.favorites = JSON.parse( savedFavorites );
		} else {
			// Пример данных для демонстрации
			this.favorites = [
				{ id: 1, name: 'Аниме фигурка Наруто', price: 2499, oldPrice: 2999, category: 'Аниме фигурки', rating: 4.5, reviews: 124, inStock: true },
				{ id: 2, name: 'Чай маття премиум', price: 899, category: 'Японский чай', rating: 5, reviews: 89, inStock: true },
				{ id: 3, name: 'Моти клубничные', price: 550, category: 'Азиатские сладости', rating: 4, reviews: 56, inStock: true, stock: 'low' },
				{ id: 4, name: 'Пиала для чая "Сакура"', price: 890, category: 'Японская посуда', rating: 4, reviews: 34, inStock: true },
				{ id: 5, name: 'Фигурка Саске', price: 2799, oldPrice: 3299, category: 'Аниме фигурки', rating: 4, reviews: 67, inStock: true },
				{ id: 6, name: 'Набор для чайной церемонии', price: 3450, category: 'Японская посуда', rating: 5, reviews: 42, inStock: true }
			];
		}
	}

	bindEvents() {
		// Удаление из избранного
		document.querySelectorAll( '.favorite-remove' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.removeFromFavorites( e ) );
		} );

		// Очистка избранного
		const clearBtn = document.getElementById( 'clearFavoritesBtn' );
		if ( clearBtn ) {
			clearBtn.addEventListener( 'click', () => this.clearFavorites() );
		}

		// Добавление в корзину
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.addToCart( e ) );
		} );

		// Копирование ссылки
		const copyLinkBtn = document.getElementById( 'copyFavoritesLink' );
		if ( copyLinkBtn ) {
			copyLinkBtn.addEventListener( 'click', () => this.copyFavoritesLink() );
		}

		// Быстрый просмотр
		document.querySelectorAll( '.favorite-quick-view' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.quickView( e ) );
		} );

		// Добавление к сравнению
		document.querySelectorAll( '.add-to-compare' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.addToCompare( e ) );
		} );

		// Рекомендации
		document.querySelectorAll( '.recommendation-add' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.addRecommendedToFavorites( e ) );
		} );

		// Пагинация
		const prevBtn = document.querySelector( '.pagination-btn.prev' );
		const nextBtn = document.querySelector( '.pagination-btn.next' );

		if ( prevBtn ) {
			prevBtn.addEventListener( 'click', () => this.changePage( 'prev' ) );
		}

		if ( nextBtn ) {
			nextBtn.addEventListener( 'click', () => this.changePage( 'next' ) );
		}
	}

	removeFromFavorites( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;
		const card = document.querySelector( `.favorite-card[data-id="${id}"]` );

		// Анимация удаления
		card.style.animation = 'fadeOut 0.3s ease forwards';

		setTimeout( () => {
			// Удаляем из массива
			this.favorites = this.favorites.filter( item => item.id != id );

			// Удаляем из DOM
			card.remove();

			// Обновляем счетчик в шапке
			this.updateFavoritesCounter();

			// Обновляем общую информацию
			this.updateFavoritesInfo();

			// Проверяем, пустое ли избранное
			this.checkIfEmpty();

			// Сохраняем в localStorage
			this.saveFavorites();

			// Показываем уведомление
			this.showNotification( 'Товар удален из избранного', 'info' );
		}, 300 );
	}

	clearFavorites() {
		if ( confirm( 'Вы уверены, что хотите очистить избранное?' ) ) {
			const cards = document.querySelectorAll( '.favorite-card' );

			cards.forEach( ( card, index ) => {
				setTimeout( () => {
					card.style.animation = 'fadeOut 0.3s ease forwards';
				}, index * 100 );
			} );

			setTimeout( () => {
				this.favorites = [];
				document.querySelector( '.favorites-with-items' ).style.display = 'none';
				document.getElementById( 'favoritesEmptyState' ).style.display = 'block';
				this.updateFavoritesCounter();
				this.saveFavorites();

				this.showNotification( 'Избранное очищено', 'info' );
			}, cards.length * 100 + 300 );
		}
	}

	addToCart( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;

		// Получаем информацию о товаре
		const item = this.favorites.find( item => item.id == id );

		if ( item ) {
			// Получаем текущую корзину
			let cart = JSON.parse( localStorage.getItem( 'komori_cart' ) || '[]' );

			// Проверяем, есть ли уже такой товар в корзине
			const existingItem = cart.find( cartItem => cartItem.id == id );

			if ( existingItem ) {
				existingItem.quantity = ( existingItem.quantity || 1 ) + 1;
			} else {
				cart.push( {
					id: item.id,
					name: item.name,
					price: item.price,
					quantity: 1,
					oldPrice: item.oldPrice
				} );
			}

			// Сохраняем корзину
			localStorage.setItem( 'komori_cart', JSON.stringify( cart ) );

			// Обновляем счетчик в шапке
			this.updateCartCounter();

			// Анимация кнопки
			btn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
			btn.style.background = '#2ecc71';

			setTimeout( () => {
				btn.innerHTML = '<i class="fas fa-shopping-cart"></i> В корзину';
				btn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%)';
			}, 2000 );

			this.showNotification( 'Товар добавлен в корзину', 'success' );
		}
	}

	copyFavoritesLink() {
		// Создаем временную ссылку
		const dummyLink = window.location.href + '?share=' + Date.now();

		navigator.clipboard.writeText( dummyLink ).then( () => {
			const btn = document.getElementById( 'copyFavoritesLink' );
			const originalIcon = btn.innerHTML;

			btn.innerHTML = '<i class="fas fa-check"></i>';
			btn.style.background = '#2ecc71';

			setTimeout( () => {
				btn.innerHTML = originalIcon;
				btn.style.background = '#666';
			}, 2000 );

			this.showNotification( 'Ссылка скопирована в буфер обмена', 'success' );
		} );
	}

	quickView( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;
		const item = this.favorites.find( item => item.id == id );

		if ( item ) {
			const modal = document.getElementById( 'quickViewModal' );
			const container = document.getElementById( 'quickViewContainer' );

			container.innerHTML = `
                <div class="quick-view-image">
                    <img src="https://via.placeholder.com/400x400" alt="${item.name}">
                </div>
                <div class="quick-view-info">
                    <h2 class="quick-view-title">${item.name}</h2>
                    <div class="quick-view-category">${item.category}</div>
                    <div class="quick-view-rating">
                        <div class="stars">${this.getStarsHTML( item.rating )}</div>
                        <span class="rating-count">${item.reviews} отзывов</span>
                    </div>
                    <div class="quick-view-price">${this.formatPrice( item.price )}</div>
                    ${item.oldPrice ? `<div class="quick-view-old-price">${this.formatPrice( item.oldPrice )}</div>` : ''}
                    <div class="quick-view-stock ${item.inStock ? 'in-stock' : 'out-of-stock'}">
                        <i class="fas ${item.inStock ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${item.inStock ? 'В наличии' : 'Нет в наличии'}
                    </div>
                    <div class="quick-view-description">
                        Краткое описание товара. Здесь будет основная информация о товаре, его характеристики и особенности.
                    </div>
                    <div class="quick-view-actions">
                        <button class="quick-view-add-to-cart" data-id="${item.id}">
                            <i class="fas fa-shopping-cart"></i> Добавить в корзину
                        </button>
                    </div>
                </div>
            `;

			modal.style.display = 'block';

			// Добавляем обработчик для кнопки в модальном окне
			container.querySelector( '.quick-view-add-to-cart' ).addEventListener( 'click', () => {
				this.addToCart( { currentTarget: { dataset: { id: item.id } } } );
			} );
		}
	}

	addToCompare( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;

		btn.style.background = '#ff6b6b';
		btn.style.color = 'white';

		setTimeout( () => {
			btn.style.background = 'transparent';
			btn.style.color = '#666';
		}, 500 );

		this.showNotification( 'Товар добавлен к сравнению', 'success' );
	}

	addRecommendedToFavorites( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;

		// Здесь можно добавить логику добавления рекомендуемого товара в избранное
		btn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
		btn.style.background = '#2ecc71';
		btn.style.borderColor = '#2ecc71';
		btn.style.color = 'white';

		setTimeout( () => {
			btn.innerHTML = '<i class="fas fa-heart"></i> В избранное';
			btn.style.background = 'transparent';
			btn.style.borderColor = '#ff6b6b';
			btn.style.color = '#ff6b6b';
		}, 2000 );

		this.showNotification( 'Товар добавлен в избранное', 'success' );
	}

	changePage( direction ) {
		const currentElement = document.querySelector( '.pagination-current' );
		const totalElement = document.querySelector( '.pagination-total' );
		const prevBtn = document.querySelector( '.pagination-btn.prev' );
		const nextBtn = document.querySelector( '.pagination-btn.next' );

		let current = parseInt( currentElement.textContent );
		const total = parseInt( totalElement.textContent );

		if ( direction === 'next' && current < total ) {
			current++;
		} else if ( direction === 'prev' && current > 1 ) {
			current--;
		}

		currentElement.textContent = current;

		// Обновляем состояние кнопок
		prevBtn.disabled = current === 1;
		nextBtn.disabled = current === total;

		// Здесь можно загружать новые товары для этой страницы
		this.showNotification( `Страница ${current} из ${total}`, 'info' );
	}

	updateFavoritesInfo() {
		const itemsCount = this.favorites.length;
		const totalSum = this.favorites.reduce( ( sum, item ) => sum + item.price, 0 );

		const countElement = document.querySelector( '.favorites-items-count' );
		const totalElement = document.querySelector( '.favorites-total-amount' );

		if ( countElement ) {
			countElement.textContent = this.getDeclension( itemsCount, ['товар', 'товара', 'товаров'] );
		}

		if ( totalElement ) {
			totalElement.textContent = `на сумму ${this.formatPrice( totalSum )}`;
		}
	}

	checkIfEmpty() {
		const cards = document.querySelectorAll( '.favorite-card' );

		if ( cards.length === 0 ) {
			document.querySelector( '.favorites-with-items' ).style.display = 'none';
			document.getElementById( 'favoritesEmptyState' ).style.display = 'block';
		}
	}

	updateFavoritesDisplay() {
		if ( this.favorites.length === 0 ) {
			document.querySelector( '.favorites-with-items' ).style.display = 'none';
			document.getElementById( 'favoritesEmptyState' ).style.display = 'block';
		} else {
			document.querySelector( '.favorites-with-items' ).style.display = 'block';
			document.getElementById( 'favoritesEmptyState' ).style.display = 'none';
		}

		this.updateFavoritesInfo();
		this.updateFavoritesCounter();
	}

	updateFavoritesCounter() {
		const favoritesCount = document.getElementById( 'favoritesCount' );
		if ( favoritesCount ) {
			favoritesCount.textContent = this.favorites.length;
		}
	}

	updateCartCounter() {
		const cart = JSON.parse( localStorage.getItem( 'komori_cart' ) || '[]' );
		const totalItems = cart.reduce( ( sum, item ) => sum + ( item.quantity || 1 ), 0 );

		const cartCount = document.getElementById( 'cartCount' );
		if ( cartCount ) {
			cartCount.textContent = totalItems;
		}
	}

	saveFavorites() {
		localStorage.setItem( 'komori_favorites', JSON.stringify( this.favorites ) );
	}

	showNotification( message, type = 'info' ) {
		// Проверяем, есть ли уже контейнер для уведомлений
		let container = document.querySelector( '.notification-container' );

		if ( !container ) {
			container = document.createElement( 'div' );
			container.className = 'notification-container';
			document.body.appendChild( container );

			// Добавляем стили для уведомлений
			const style = document.createElement( 'style' );
			style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .notification {
                    background: white;
                    border-radius: 10px;
                    padding: 15px 25px;
                    margin-bottom: 10px;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: slideIn 0.3s ease forwards;
                    border-left: 4px solid;
                }
                
                .notification.success {
                    border-left-color: #2ecc71;
                }
                
                .notification.success i {
                    color: #2ecc71;
                }
                
                .notification.info {
                    border-left-color: #3498db;
                }
                
                .notification.info i {
                    color: #3498db;
                }
                
                .notification.error {
                    border-left-color: #e74c3c;
                }
                
                .notification.error i {
                    color: #e74c3c;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
                
                @keyframes fadeOutCard {
                    from {
                        opacity: 1;
                        transform: scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                }
            `;
			document.head.appendChild( style );
		}

		const notification = document.createElement( 'div' );
		notification.className = `notification ${type}`;

		let icon = '';
		if ( type === 'success' ) icon = 'fa-check-circle';
		else if ( type === 'info' ) icon = 'fa-info-circle';
		else if ( type === 'error' ) icon = 'fa-exclamation-circle';

		notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

		container.appendChild( notification );

		setTimeout( () => {
			notification.style.animation = 'fadeOut 0.3s ease forwards';
			setTimeout( () => notification.remove(), 300 );
		}, 3000 );
	}

	getStarsHTML( rating ) {
		const fullStars = Math.floor( rating );
		const hasHalf = rating % 1 !== 0;
		let stars = '';

		for ( let i = 0; i < fullStars; i++ ) {
			stars += '<i class="fas fa-star"></i>';
		}

		if ( hasHalf ) {
			stars += '<i class="fas fa-star-half-alt"></i>';
		}

		const emptyStars = 5 - Math.ceil( rating );
		for ( let i = 0; i < emptyStars; i++ ) {
			stars += '<i class="far fa-star"></i>';
		}

		return stars;
	}

	formatPrice( price ) {
		return price.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ' ' ) + ' ₽';
	}

	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}
}

// Инициализация при загрузке страницы
document.addEventListener( 'DOMContentLoaded', function () {
	window.favoritesPage = new FavoritesPage();
} );