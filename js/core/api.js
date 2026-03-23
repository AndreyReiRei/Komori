/**
 * Вспомогательные функции для работы с API и изображениями
 */

const API = {
	imageFolderPath: '/image/',

	// ========== Работа с изображениями ==========
	getSafeImageUrl( url ) {
		if ( !url ) return this.getFallbackSvg();
		if ( url.startsWith( 'http' ) || url.startsWith( 'data:' ) ) return url;
		if ( url.startsWith( '/' ) ) return url;
		return this.imageFolderPath + url;
	},

	getFallbackSvg( text = 'Нет фото' ) {
		return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='16' font-family='Arial'%3E${encodeURIComponent( text )}%3C/text%3E%3C/svg%3E`;
	},

	handleImageUpload( file, callback ) {
		if ( !file ) return;

		if ( !file.type.startsWith( 'image/' ) ) {
			this.showNotification( 'Пожалуйста, выберите изображение', 'error' );
			return;
		}

		if ( file.size > 5 * 1024 * 1024 ) {
			this.showNotification( 'Размер файла не должен превышать 5MB', 'error' );
			return;
		}

		const reader = new FileReader();
		reader.onload = ( e ) => callback( e.target.result );
		reader.onerror = () => this.showNotification( 'Ошибка загрузки изображения', 'error' );
		reader.readAsDataURL( file );
	},

	// ========== Форматирование ==========
	formatPrice( price ) {
		return price.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ' ' ) + ' ₽';
	},

	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	},

	// ========== Уведомления ==========
	showNotification( message, type = 'success' ) {
		let container = document.querySelector( '.notification-container' );

		if ( !container ) {
			container = document.createElement( 'div' );
			container.className = 'notification-container';
			document.body.appendChild( container );

			const style = document.createElement( 'style' );
			style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                }
                
                .notification {
                    background: ${type === 'success' ? '#2ecc71' : '#ff4757'};
                    color: white;
                    padding: 15px 25px;
                    border-radius: 10px;
                    margin-bottom: 10px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                    animation: slideIn 0.3s ease;
                    cursor: pointer;
                    max-width: 350px;
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
                
                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
            `;
			document.head.appendChild( style );
		}

		const notification = document.createElement( 'div' );
		notification.className = 'notification';
		notification.textContent = message;

		notification.addEventListener( 'click', () => {
			notification.style.animation = 'slideOut 0.3s ease forwards';
			setTimeout( () => notification.remove(), 300 );
		} );

		container.appendChild( notification );

		setTimeout( () => {
			if ( notification.parentNode ) {
				notification.style.animation = 'slideOut 0.3s ease forwards';
				setTimeout( () => notification.remove(), 300 );
			}
		}, 3000 );
	},

	// ========== Общие функции для страниц ==========
	updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );

		if ( cartCount ) cartCount.textContent = store.getCartCount();
		if ( favoritesCount ) favoritesCount.textContent = store.favorites.length;
	},

	initModalHandlers() {
		// Закрытие модальных окон
		document.querySelectorAll( '.close-modal, .modal .close' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => {
				const modal = e.target.closest( '.modal' );
				if ( modal ) modal.classList.remove( 'show' );
			} );
		} );

		// Закрытие по клику вне модального окна
		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.addEventListener( 'click', ( e ) => {
				if ( e.target === modal ) modal.classList.remove( 'show' );
			} );
		} );
	}
};

window.API = API;