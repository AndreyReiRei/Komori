/**
 * Скрипт для поиска по сайту
 * Поиск осуществляется по всем товарам из store.js
 * Результаты отображаются в модальном окне с возможностью перехода к товару
 */

document.addEventListener( 'DOMContentLoaded', function () {
	const searchBtn = document.getElementById( 'searchBtn' );

	// Создаем модальное окно поиска с результатами
	createSearchModal();

	const searchModal = document.getElementById( 'searchModal' );
	const closeSearch = document.querySelector( '.close-search' );
	const searchInput = document.getElementById( 'searchInput' );
	const searchForm = document.getElementById( 'searchForm' );
	const searchResults = document.getElementById( 'searchResults' );

	// Открытие поиска
	if ( searchBtn ) {
		searchBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openSearch();
		} );
	}

	// Закрытие поиска
	if ( closeSearch ) {
		closeSearch.addEventListener( 'click', closeSearchFunc );
	}

	// Закрытие по клику вне модального окна
	window.addEventListener( 'click', function ( e ) {
		if ( searchModal && e.target === searchModal ) {
			closeSearchFunc();
		}
	} );

	// Закрытие по Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && searchModal && searchModal.style.display === 'flex' ) {
			closeSearchFunc();
		}
	} );

	// Обработка поиска
	if ( searchForm ) {
		searchForm.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			const query = searchInput.value.trim();
			if ( query ) {
				performSearch( query );
			}
		} );
	}

	// Поиск при вводе текста (с задержкой для оптимизации)
	if ( searchInput ) {
		let searchTimeout;
		searchInput.addEventListener( 'input', function ( e ) {
			clearTimeout( searchTimeout );
			const query = e.target.value.trim();
			if ( query.length >= 2 ) { // Начинаем поиск после 2 символов
				searchTimeout = setTimeout( () => {
					performSearch( query );
				}, 300 );
			} else if ( query.length === 0 ) {
				clearResults();
			}
		} );
	}

	function openSearch() {
		if ( searchModal ) {
			searchModal.style.display = 'flex';
			setTimeout( () => {
				if ( searchInput ) searchInput.focus();
			}, 300 );
			document.body.style.overflow = 'hidden';
			// Очищаем предыдущие результаты
			clearResults();
			if ( searchInput ) searchInput.value = '';
		}
	}

	function closeSearchFunc() {
		if ( searchModal ) {
			searchModal.style.display = 'none';
			document.body.style.overflow = '';
			clearResults();
			if ( searchInput ) searchInput.value = '';
		}
	}

	function clearResults() {
		const searchResults = document.getElementById( 'searchResults' );
		if ( searchResults ) {
			searchResults.innerHTML = '';
			searchResults.classList.remove( 'has-results' );
		}
		const noResultsMsg = document.getElementById( 'noResultsMessage' );
		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'none';
		}
	}

	/**
	 * Выполняет поиск товаров по запросу
	 * @param {string} query - поисковый запрос
	 */
	function performSearch( query ) {
		console.log( 'Поиск по запросу:', query );

		// Проверяем, есть ли store и товары
		if ( !window.store || !window.store.products ) {
			console.warn( 'Store не инициализирован или нет товаров' );
			showNoResults( query );
			return;
		}

		// Получаем все товары из хранилища
		const allProducts = window.store.products || [];

		// Поиск товаров
		const searchResultsList = searchProducts( query, allProducts );

		// Отображаем результаты
		displaySearchResults( searchResultsList, query );
	}

	/**
	 * Поиск товаров по названию, категории, описанию и артикулу
	 * @param {string} query - поисковый запрос
	 * @param {Array} products - массив товаров
	 * @returns {Array} отфильтрованный массив товаров
	 */
	function searchProducts( query, products ) {
		const lowerQuery = query.toLowerCase().trim();

		return products.filter( product => {
			// Проверяем название товара
			const nameMatch = product.name && product.name.toLowerCase().includes( lowerQuery );

			// Проверяем категорию
			const categoryName = getCategoryName( product.category );
			const categoryMatch = categoryName && categoryName.toLowerCase().includes( lowerQuery );

			// Проверяем описание
			const descriptionMatch = product.description &&
				product.description.toLowerCase().includes( lowerQuery );

			// Проверяем артикул
			const skuMatch = product.sku &&
				product.sku.toLowerCase().includes( lowerQuery );

			// Проверяем бейджи (новинка, хит)
			const isNewMatch = product.isNew && 'новинка'.includes( lowerQuery );
			const isHitMatch = product.isHit && 'хит'.includes( lowerQuery );

			return nameMatch || categoryMatch || descriptionMatch || skuMatch ||
				isNewMatch || isHitMatch;
		} );
	}

	/**
	 * Получает название категории по коду
	 * @param {string} categoryCode - код категории
	 * @returns {string} название категории
	 */
	function getCategoryName( categoryCode ) {
		const categories = {
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
		return categories[categoryCode] || categoryCode;
	}

	/**
	 * Отображает результаты поиска
	 * @param {Array} products - найденные товары
	 * @param {string} query - поисковый запрос
	 */
	function displaySearchResults( products, query ) {
		const searchResults = document.getElementById( 'searchResults' );
		const noResultsMsg = document.getElementById( 'noResultsMessage' );

		if ( !searchResults ) return;

		// Очищаем предыдущие результаты
		searchResults.innerHTML = '';

		if ( products.length === 0 ) {
			showNoResults( query );
			return;
		}

		// Скрываем сообщение об отсутствии результатов
		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'none';
		}

		searchResults.classList.add( 'has-results' );

		// Отображаем найденные товары
		products.forEach( product => {
			const resultItem = createSearchResultItem( product, query );
			searchResults.appendChild( resultItem );
		} );

		// Показываем количество найденных товаров
		const resultsCount = document.getElementById( 'resultsCount' );
		if ( resultsCount ) {
			resultsCount.textContent = `Найдено ${products.length} товаров`;
			resultsCount.style.display = 'block';
		}
	}

	/**
	 * Создает элемент результата поиска
	 * @param {Object} product - товар
	 * @param {string} query - поисковый запрос
	 * @returns {HTMLElement} элемент результата
	 */
	function createSearchResultItem( product, query ) {
		const item = document.createElement( 'div' );
		item.className = 'search-result-item';

		// Форматируем цену
		const formattedPrice = formatPrice( product.price );
		const oldPrice = product.oldPrice ? formatPrice( product.oldPrice ) : null;

		// Получаем URL страницы товара (на основе категории)
		const productUrl = getProductUrl( product );

		// Подсвечиваем совпадения в названии
		const highlightedName = highlightMatches( product.name, query );

		// Подсвечиваем совпадения в категории
		const categoryName = getCategoryName( product.category );
		const highlightedCategory = highlightMatches( categoryName, query );

		// Формируем HTML
		item.innerHTML = `
            <div class="result-item-image">
                <img src="${getSafeImageUrl( product.image )}" 
                     alt="${escapeHtml( product.name )}"
                     onerror="this.onerror=null; this.src='${getFallbackImage()}'">
            </div>
            <div class="result-item-info">
                <div class="result-item-category">${highlightedCategory}</div>
                <div class="result-item-title">${highlightedName}</div>
                ${product.sku ? `<div class="result-item-sku">Артикул: ${escapeHtml( product.sku )}</div>` : ''}
                <div class="result-item-price">
                    <span class="current-price">${formattedPrice}</span>
                    ${oldPrice ? `<span class="old-price">${oldPrice}</span>` : ''}
                </div>
                <div class="result-item-status ${product.status === 'in-stock' ? 'in-stock' : 'out-of-stock'}">
                    <i class="fas ${product.status === 'in-stock' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии'}
                    ${product.quantity ? ` (${product.quantity} шт.)` : ''}
                </div>
            </div>
            <div class="result-item-actions">
                <button class="result-view-btn" data-url="${productUrl}">
                    <i class="fas fa-eye"></i> Просмотр
                </button>
                <button class="result-cart-btn ${product.status !== 'in-stock' ? 'disabled' : ''}" 
                        data-id="${product.id}"
                        ${product.status !== 'in-stock' ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> В корзину
                </button>
            </div>
        `;

		// Добавляем обработчик для кнопки просмотра
		const viewBtn = item.querySelector( '.result-view-btn' );
		if ( viewBtn ) {
			viewBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const url = viewBtn.dataset.url;
				if ( url ) {
					window.location.href = url;
				}
			} );
		}

		// Добавляем обработчик для кнопки "В корзину"
		const cartBtn = item.querySelector( '.result-cart-btn' );
		if ( cartBtn && !cartBtn.disabled ) {
			cartBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const productId = parseInt( cartBtn.dataset.id );
				if ( window.store && window.store.addToCart ) {
					window.store.addToCart( productId );
					showNotification( 'Товар добавлен в корзину', 'success' );
				} else {
					showNotification( 'Ошибка добавления в корзину', 'error' );
				}
			} );
		}

		return item;
	}

	/**
	 * Форматирует цену
	 * @param {number} price - цена
	 * @returns {string} отформатированная цена
	 */
	function formatPrice( price ) {
		return new Intl.NumberFormat( 'ru-RU' ).format( price ) + ' ₽';
	}

	/**
	 * Получает безопасный URL изображения
	 * @param {string} url - URL изображения
	 * @returns {string} безопасный URL
	 */
	function getSafeImageUrl( url ) {
		if ( !url ) return getFallbackImage();
		if ( url.startsWith( 'http' ) || url.startsWith( '/' ) || url.startsWith( 'data:' ) ) {
			return url;
		}
		return getFallbackImage();
	}

	/**
	 * Возвращает URL заглушки для изображения
	 * @returns {string} URL заглушки
	 */
	function getFallbackImage() {
		return 'https://via.placeholder.com/100x100?text=No+Image';
	}

	/**
	 * Получает URL страницы товара на основе категории
	 * @param {Object} product - товар
	 * @returns {string} URL страницы товара
	 */
	function getProductUrl( product ) {
		// Сопоставление категорий с URL страниц
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

		const baseUrl = categoryUrls[product.category] || '/pages html/catalog.html';
		// Добавляем ID товара в URL (если на странице товара есть поддержка)
		return `${baseUrl}?product=${product.id}`;
	}

	/**
	 * Подсвечивает совпадения в тексте
	 * @param {string} text - исходный текст
	 * @param {string} query - поисковый запрос
	 * @returns {string} текст с подсветкой
	 */
	function highlightMatches( text, query ) {
		if ( !text || !query ) return escapeHtml( text );

		const lowerText = text.toLowerCase();
		const lowerQuery = query.toLowerCase();
		const index = lowerText.indexOf( lowerQuery );

		if ( index === -1 ) return escapeHtml( text );

		const start = text.substring( 0, index );
		const match = text.substring( index, index + query.length );
		const end = text.substring( index + query.length );

		return `${escapeHtml( start )}<mark>${escapeHtml( match )}</mark>${escapeHtml( end )}`;
	}

	/**
	 * Экранирует HTML специальные символы
	 * @param {string} str - строка для экранирования
	 * @returns {string} экранированная строка
	 */
	function escapeHtml( str ) {
		if ( !str ) return '';
		return str
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' );
	}

	/**
	 * Показывает сообщение об отсутствии результатов
	 * @param {string} query - поисковый запрос
	 */
	function showNoResults( query ) {
		const searchResults = document.getElementById( 'searchResults' );
		const noResultsMsg = document.getElementById( 'noResultsMessage' );

		if ( searchResults ) {
			searchResults.innerHTML = '';
			searchResults.classList.remove( 'has-results' );
		}

		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'block';
			const querySpan = noResultsMsg.querySelector( '.search-query' );
			if ( querySpan ) {
				querySpan.textContent = query;
			}
		}

		const resultsCount = document.getElementById( 'resultsCount' );
		if ( resultsCount ) {
			resultsCount.style.display = 'none';
		}
	}

	/**
	 * Показывает уведомление
	 * @param {string} message - текст уведомления
	 * @param {string} type - тип уведомления (success, error, info)
	 */
	function showNotification( message, type = 'info' ) {
		// Используем существующую функцию API, если она есть
		if ( window.API && window.API.showNotification ) {
			window.API.showNotification( message, type );
		} else {
			// Создаем временное уведомление
			const notification = document.createElement( 'div' );
			notification.className = `notification notification-${type}`;
			notification.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            `;
			notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#ff4757' : '#3498db'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10001;
                animation: slideIn 0.3s ease;
                cursor: pointer;
            `;

			document.body.appendChild( notification );

			setTimeout( () => {
				notification.style.animation = 'slideOut 0.3s ease';
				setTimeout( () => notification.remove(), 300 );
			}, 3000 );

			notification.addEventListener( 'click', () => notification.remove() );
		}
	}

	/**
	 * Создает модальное окно поиска с результатами
	 */
	function createSearchModal() {
		// Проверяем, существует ли уже модальное окно поиска
		if ( document.getElementById( 'searchModal' ) ) return;

		const modalHTML = `
            <div id="searchModal" class="modal search-modal">
                <div class="modal-content search-modal-content">
                    <div class="search-header">
                        <h2><i class="fas fa-search"></i> Поиск по сайту</h2>
                        <button class="close-search">&times;</button>
                    </div>
                    
                    <form id="searchForm" class="search-form">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="searchInput" 
                                   placeholder="Введите название товара, категорию, артикул..." 
                                   autocomplete="off">
                            <button type="submit" class="search-submit-btn">Найти</button>
                        </div>
                    </form>
                    
                    <div class="search-results-container">
                        <div class="results-header" id="resultsCount" style="display: none;"></div>
                        
                        <div id="searchResults" class="search-results-list"></div>
                        
                        <div id="noResultsMessage" class="no-results-message" style="display: none;">
                            <i class="fas fa-search"></i>
                            <p>По запросу "<span class="search-query"></span>" ничего не найдено</p>
                            <p class="suggestion-text">Попробуйте изменить поисковый запрос или перейти в <a href="/pages html/catalog.html">каталог</a></p>
                        </div>
                    </div>
                    
                    <div class="search-suggestions">
                        <p class="suggestions-title">Популярные запросы:</p>
                        <div class="suggestions-tags">
                            <span class="suggestion-tag" data-query="Аниме фигурки">Аниме фигурки</span>
                            <span class="suggestion-tag" data-query="Японский чай">Японский чай</span>
                            <span class="suggestion-tag" data-query="Манга">Манга</span>
                            <span class="suggestion-tag" data-query="Канцелярия">Канцелярия</span>
                            <span class="suggestion-tag" data-query="Косметика">Косметика</span>
                            <span class="suggestion-tag" data-query="Фигурка Наруто">Фигурка Наруто</span>
                            <span class="suggestion-tag" data-query="Маття">Маття</span>
                            <span class="suggestion-tag" data-query="Мочи">Мочи</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

		document.body.insertAdjacentHTML( 'beforeend', modalHTML );

		// Добавляем стили для результатов поиска (если их нет)
		addSearchStyles();

		// Добавляем обработчики для тегов
		document.querySelectorAll( '.suggestion-tag' ).forEach( tag => {
			tag.addEventListener( 'click', function () {
				const query = this.dataset.query || this.textContent;
				const searchInput = document.getElementById( 'searchInput' );
				if ( searchInput ) {
					searchInput.value = query;
					performSearch( query );
				}
			} );
		} );
	}

	/**
	 * Добавляет стили для результатов поиска
	 */
	function addSearchStyles() {
		if ( document.getElementById( 'search-results-styles' ) ) return;

		const styles = `
            <style id="search-results-styles">
                .search-modal .search-results-container {
                    max-height: 400px;
                    overflow-y: auto;
                    margin: 15px 0;
                }
                
                .search-results-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .search-result-item {
                    display: flex;
                    gap: 15px;
                    padding: 15px;
                    background: var(--bg-secondary, #1a1a1a);
                    border-radius: var(--radius-md, 8px);
                    border: 1px solid var(--border-light, #333);
                    transition: all 0.3s ease;
                }
                
                .search-result-item:hover {
                    transform: translateX(5px);
                    border-color: var(--primary, #ff3366);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
                
                .result-item-image {
                    flex-shrink: 0;
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-sm, 4px);
                    overflow: hidden;
                    background: var(--bg-tertiary, #252525);
                }
                
                .result-item-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .result-item-info {
                    flex: 1;
                }
                
                .result-item-category {
                    font-size: 12px;
                    color: var(--primary, #ff3366);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                
                .result-item-category mark {
                    background: rgba(255, 51, 102, 0.3);
                    color: var(--primary, #ff3366);
                    padding: 0 2px;
                    border-radius: 2px;
                }
                
                .result-item-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                    margin-bottom: 4px;
                }
                
                .result-item-title mark {
                    background: rgba(255, 51, 102, 0.3);
                    color: var(--primary, #ff3366);
                    padding: 0 2px;
                    border-radius: 2px;
                }
                
                .result-item-sku {
                    font-size: 12px;
                    color: var(--text-muted, #999);
                    margin-bottom: 4px;
                }
                
                .result-item-price {
                    margin-top: 8px;
                }
                
                .result-item-price .current-price {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--primary, #ff3366);
                }
                
                .result-item-price .old-price {
                    font-size: 14px;
                    color: var(--text-muted, #999);
                    text-decoration: line-through;
                    margin-left: 8px;
                }
                
                .result-item-status {
                    font-size: 12px;
                    margin-top: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .result-item-status.in-stock {
                    color: #2ecc71;
                }
                
                .result-item-status.out-of-stock {
                    color: #ff4757;
                }
                
                .result-item-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    justify-content: center;
                }
                
                .result-view-btn,
                .result-cart-btn {
                    padding: 8px 12px;
                    border: none;
                    border-radius: var(--radius-sm, 4px);
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                
                .result-view-btn {
                    background: var(--info, #3498db);
                    color: white;
                }
                
                .result-view-btn:hover {
                    background: #2980b9;
                    transform: translateY(-2px);
                }
                
                .result-cart-btn {
                    background: var(--primary, #ff3366);
                    color: white;
                }
                
                .result-cart-btn:hover:not(:disabled) {
                    background: #ff6b6b;
                    transform: translateY(-2px);
                }
                
                .result-cart-btn.disabled,
                .result-cart-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .no-results-message {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--text-muted, #999);
                }
                
                .no-results-message i {
                    font-size: 48px;
                    margin-bottom: 15px;
                    opacity: 0.5;
                }
                
                .no-results-message p {
                    margin-bottom: 10px;
                }
                
                .no-results-message .suggestion-text a {
                    color: var(--primary, #ff3366);
                    text-decoration: none;
                }
                
                .no-results-message .suggestion-text a:hover {
                    text-decoration: underline;
                }
                
                .results-header {
                    padding: 10px 0;
                    font-size: 14px;
                    color: var(--text-secondary, #ccc);
                    border-bottom: 1px solid var(--border-light, #333);
                    margin-bottom: 15px;
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
            </style>
        `;

		document.head.insertAdjacentHTML( 'beforeend', styles );
	}
} );