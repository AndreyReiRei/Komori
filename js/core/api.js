/**
 * ============================================================================
 * API.JS - ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ИЗОБРАЖЕНИЯМИ И УТИЛИТАМИ
 * ============================================================================
 * 
 * Этот файл содержит:
 * 1. Работу с изображениями (пути, заглушки)
 * 2. Форматирование (цены, склонения)
 * 3. Уведомления
 * 4. Общие функции для страниц
 * 
 * ============================================================================
 */

const API = {
	// =========================================================================
	// 1. РАБОТА С ПУТЯМИ И КОРНЕМ САЙТА
	// =========================================================================

	/**
	 * Динамическое определение корня сайта относительно текущей страницы
	 * 
	 * Как это работает:
	 * - Если страница в корне (index.html) -> возвращает './'
	 * - Если страница в папке pages html/ -> возвращает '../'
	 * - Если страница в подпапке (catalog pages/) -> возвращает '../../'
	 * 
	 * @returns {string} Относительный путь к корню сайта
	 */
	siteRoot: ( function () {
		// Получаем текущий путь страницы
		const path = window.location.pathname;

		console.log( '🔍 API: Определение корня сайта для пути:', path );

		// Проверяем, находимся ли мы в папке pages html/
		if ( path.includes( '/pages html/' ) || path.includes( '/pages/' ) ) {
			console.log( '📁 API: Страница в папке pages html/, siteRoot = "../"' );
			return '../';
		}

		// Проверяем, находимся ли мы в подпапке catalog pages/ или pages info/
		if ( path.includes( '/catalog pages/' ) || path.includes( '/pages info/' ) ) {
			console.log( '📁 API: Страница в подпапке, siteRoot = "../../"' );
			return '../../';
		}

		// По умолчанию - корень сайта
		console.log( '📁 API: Страница в корне, siteRoot = "./"' );
		return './';
	} )(),

	/**
	 * Путь к папке с изображениями (относительный)
	 */
	imageFolderPath: 'image/',

	// =========================================================================
	// 2. РАБОТА С ИЗОБРАЖЕНИЯМИ
	// =========================================================================

	/**
	 * Получает безопасный URL изображения
	 * 
	 * Алгоритм:
	 * 1. Если URL пустой - возвращаем заглушку
	 * 2. Если это внешняя ссылка (http://, https://) - возвращаем как есть
	 * 3. Если это base64 (data:image) - возвращаем как есть
	 * 4. Если это путь из папки /image/ - очищаем и подставляем правильный относительный путь
	 * 
	 * @param {string} url - исходный URL изображения
	 * @returns {string} корректный URL для отображения
	 */
	getSafeImageUrl( url ) {
		// Если URL не передан - показываем заглушку
		if ( !url ) {
			console.warn( '⚠️ API: Пустой URL изображения, используем заглушку' );
			return this.getFallbackSvg();
		}

		// Внешние ссылки и base64 оставляем без изменений
		if ( url.startsWith( 'http' ) || url.startsWith( 'https' ) || url.startsWith( 'data:' ) ) {
			return url;
		}

		// Очищаем путь от лишних символов
		let cleanUrl = url;

		// Убираем ведущие слеши (один или несколько)
		cleanUrl = cleanUrl.replace( /^\/+/, '' );

		// Убираем дублирование папки image (если путь начинается с image/)
		if ( cleanUrl.startsWith( 'image/' ) ) {
			cleanUrl = cleanUrl.substring( 6 ); // удаляем 'image/'
		}
		if ( cleanUrl.startsWith( 'image' ) ) {
			cleanUrl = cleanUrl.substring( 5 ); // удаляем 'image'
		}

		// Убираем лишние слеши внутри пути
		cleanUrl = cleanUrl.replace( /\/+/g, '/' );

		// Формируем полный путь относительно корня сайта
		const fullPath = this.siteRoot + this.imageFolderPath + cleanUrl;

		console.log( `🖼️ API: Преобразование пути: ${url} -> ${fullPath}` );

		return fullPath;
	},

	/**
	 * Генерирует SVG заглушку для отсутствующих изображений
	 * 
	 * Использует встроенный SVG, который отображает текст "Нет фото"
	 * Это позволяет не зависеть от внешних сервисов
	 * 
	 * @param {string} text - текст на заглушке (по умолчанию "Нет фото")
	 * @returns {string} data:image/svg+xml строка
	 */
	getFallbackSvg( text = 'Нет фото' ) {
		return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='16' font-family='Arial'%3E${encodeURIComponent( text )}%3C/text%3E%3C/svg%3E`;
	},

	/**
	 * Обработка загрузки изображения через input file
	 * Преобразует файл в base64 строку для предпросмотра
	 * 
	 * @param {File} file - загруженный файл изображения
	 * @param {Function} callback - функция, которая получит base64 строку
	 */
	handleImageUpload( file, callback ) {
		if ( !file ) {
			console.warn( '⚠️ API: Файл не выбран' );
			return;
		}

		// Проверка типа файла
		if ( !file.type.startsWith( 'image/' ) ) {
			this.showNotification( 'Пожалуйста, выберите изображение', 'error' );
			return;
		}

		// Проверка размера (максимум 5MB)
		if ( file.size > 5 * 1024 * 1024 ) {
			const sizeMB = ( file.size / 1024 / 1024 ).toFixed( 2 );
			this.showNotification( `Размер файла (${sizeMB} MB) превышает лимит 5MB`, 'error' );
			return;
		}

		const reader = new FileReader();

		reader.onload = ( e ) => {
			console.log( '✅ API: Изображение загружено, размер base64:', ( e.target.result.length / 1024 ).toFixed( 2 ), 'KB' );
			callback( e.target.result );
		};

		reader.onerror = () => {
			console.error( '❌ API: Ошибка загрузки изображения' );
			this.showNotification( 'Ошибка загрузки изображения', 'error' );
		};

		reader.readAsDataURL( file );
	},

	// =========================================================================
	// 3. ФОРМАТИРОВАНИЕ
	// =========================================================================

	/**
	 * Форматирует цену
	 * Добавляет пробелы между тысячами и знак рубля
	 * 
	 * @param {number} price - цена
	 * @returns {string} отформатированная цена (например: "1 890 ₽")
	 */
	formatPrice( price ) {
		return price.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ' ' ) + ' ₽';
	},

	/**
	 * Склонение слов (1 товар, 2 товара, 5 товаров)
	 * 
	 * @param {number} number - число
	 * @param {Array} words - варианты слов ['товар', 'товара', 'товаров']
	 * @returns {string} правильная форма (например: "3 товара")
	 */
	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	},

	// =========================================================================
	// 4. УВЕДОМЛЕНИЯ
	// =========================================================================

	/**
	 * Показывает всплывающее уведомление
	 * 
	 * @param {string} message - текст уведомления
	 * @param {string} type - тип уведомления (success, error, info)
	 */
	showNotification( message, type = 'success' ) {
		// Ищем или создаем контейнер для уведомлений
		let container = document.querySelector( '.notification-container' );

		if ( !container ) {
			container = document.createElement( 'div' );
			container.className = 'notification-container';
			document.body.appendChild( container );

			// Добавляем стили для уведомлений (если их нет)
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

		// Создаем уведомление
		const notification = document.createElement( 'div' );
		notification.className = 'notification';
		notification.textContent = message;

		// Закрытие по клику
		notification.addEventListener( 'click', () => {
			notification.style.animation = 'slideOut 0.3s ease forwards';
			setTimeout( () => notification.remove(), 300 );
		} );

		container.appendChild( notification );

		// Автоматическое закрытие через 3 секунды
		setTimeout( () => {
			if ( notification.parentNode ) {
				notification.style.animation = 'slideOut 0.3s ease forwards';
				setTimeout( () => notification.remove(), 300 );
			}
		}, 3000 );
	},

	// =========================================================================
	// 5. ОБЩИЕ ФУНКЦИИ ДЛЯ СТРАНИЦ
	// =========================================================================

	/**
	 * Обновляет счетчики в шапке сайта (корзина и избранное)
	 * Использует глобальный объект store
	 */
	updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );

		if ( cartCount ) {
			const count = store.getCartCount();
			cartCount.textContent = count;
			console.log( `🛒 API: Счетчик корзины обновлен: ${count}` );
		}

		if ( favoritesCount ) {
			const count = store.favorites.length;
			favoritesCount.textContent = count;
			console.log( `❤️ API: Счетчик избранного обновлен: ${count}` );
		}
	},

	/**
	 * Инициализирует обработчики для модальных окон
	 * 
	 * Обрабатывает:
	 * - Закрытие по крестику (.close-modal)
	 * - Закрытие по клику на оверлей (вне модального окна)
	 */
	initModalHandlers() {
		// Закрытие модальных окон по крестику
		document.querySelectorAll( '.close-modal, .modal .close' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => {
				const modal = e.target.closest( '.modal' );
				if ( modal ) {
					modal.classList.remove( 'show' );
					console.log( '🔒 API: Модальное окно закрыто по крестику' );
				}
			} );
		} );

		// Закрытие по клику вне модального окна (на оверлей)
		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.addEventListener( 'click', ( e ) => {
				if ( e.target === modal ) {
					modal.classList.remove( 'show' );
					console.log( '🔒 API: Модальное окно закрыто по клику на оверлей' );
				}
			} );
		} );
	}
};

// Экспортируем API в глобальную область видимости
window.API = API;
console.log( '✅ API.JS: Модуль загружен, корень сайта:', API.siteRoot );